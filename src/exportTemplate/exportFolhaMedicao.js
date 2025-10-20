import { format } from "date-fns";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import headMapping from "@/Mappings/Headmapping_excel.json";
import serviceMapping from "@/Mappings/Servicemapping_excel.json";
import equipmentMapping from "@/Mappings/Equipmentmapping_excel.json";
import materialsMapping from "@/Mappings/Materialsmapping_excel.json";
import teamMapping from "@/Mappings/Teammapping_excel.json";
import { getValueFromPath } from "@/rules/listFMRules";
import { templateRules, fieldRules } from "@/rules/templateRules";

const EXCEL_TEMPLATE_PATH = encodeURI(templateRules.templatePath);
const DEFAULT_START_ROW = templateRules.defaultStartRow ?? 2;
const TARGET_SHEET_INDEX = templateRules.defaultSheetIndex ?? 0;
const DEFAULT_DATE_FORMAT = templateRules.formatting?.date ?? "dd/MM/yyyy";
const DATE_FIELDS = new Set(fieldRules.dateFields ?? []);
const NUMERIC_FIELDS = new Set(fieldRules.numericFields ?? []);
const FALLBACK_STYLE = templateRules.fallbackStyle ?? { enabled: false };

const parseLocalDateLike = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) {
      return new Date(value.replace(" ", "T"));
    }
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed);
};

const fetchTemplateWorkbook = async () => {
  const response = await fetch(EXCEL_TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error("template-not-found");
  }

  const arrayBuffer = await response.arrayBuffer();
  return XlsxPopulate.fromDataAsync(arrayBuffer);
};

const downloadWorkbook = async (workbook, fileName) => {
  const blob = await workbook.outputAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const parseCellReference = (ref, fallbackRow = DEFAULT_START_ROW) => {
  if (!ref) {
    return { column: "A", row: fallbackRow };
  }

  const trimmed = ref.toString().trim();
  const columnMatch = trimmed.match(/[A-Z]+/i);
  const rowMatch = trimmed.match(/(\d+)/g);

  const column = columnMatch ? columnMatch[0].toUpperCase() : trimmed.toUpperCase();
  const row = rowMatch ? parseInt(rowMatch[rowMatch.length - 1], 10) : fallbackRow;

  return { column, row };
};

const formatValueForExcel = (value, path) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (value instanceof Date) {
    return format(value, DEFAULT_DATE_FORMAT);
  }

  const pathParts = path ? path.split(".") : [];
  const fieldName = pathParts[pathParts.length - 1]?.toLowerCase();

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    if (DATE_FIELDS.has(fieldName || "")) {
      const parsed = parseLocalDateLike(trimmed);
      if (parsed) {
        return format(parsed, DEFAULT_DATE_FORMAT);
      }
    }

    if (NUMERIC_FIELDS.has(fieldName || "")) {
      const numeric = Number(trimmed.replace(",", "."));
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }

    return trimmed;
  }

  return value;
};

const applyFallbackStyle = (cell) => {
  if (!FALLBACK_STYLE.enabled) {
    return;
  }

  if (FALLBACK_STYLE.font) {
    cell.style({ font: FALLBACK_STYLE.font });
  }
  if (FALLBACK_STYLE.alignment) {
    cell.style({ alignment: FALLBACK_STYLE.alignment });
  }
  if (FALLBACK_STYLE.numberFormat) {
    cell.style({ numberFormat: FALLBACK_STYLE.numberFormat });
  }
};

const setSheetValue = (sheet, cellRef, rawValue, path) => {
  // XlsxPopulate keeps the template styling when we only update the value.
  const { column, row } = parseCellReference(cellRef);
  const cellAddress = `${column}${row}`;
  const value = formatValueForExcel(rawValue, path);
  const cell = sheet.cell(cellAddress);

  cell.value(value);
  applyFallbackStyle(cell);
};

const normalizeTrimmed = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value).trim();
};

const determineProcessSuffix = (folha) => {
  const equipes = Array.isArray(folha?.equipes) ? folha.equipes : [];
  let fallbackSuffix = "";

  for (const team of equipes) {
    const codigo = normalizeTrimmed(team?.codigo_equipe);
    if (!codigo) {
      continue;
    }

    if (/^LV/i.test(codigo)) {
      return "LV";
    }

    if (/^(EX|MT)/i.test(codigo)) {
      fallbackSuffix = "LM";
    }
  }

  return fallbackSuffix;
};

const fillHeadMapping = (sheet, folha) => {
  const context = { data: folha };
  const priorityMappings = Array.isArray(headMapping.__priorityMappings)
    ? headMapping.__priorityMappings
    : [];
  const processSuffix = determineProcessSuffix(folha);

  Object.entries(headMapping).forEach(([path, cellRef]) => {
    if (path.startsWith("__") || typeof cellRef !== "string") {
      return;
    }
    let value = getValueFromPath(context, path);

    if (path === "data.tipo_processo" && processSuffix) {
      const trimmedProcess = normalizeTrimmed(value);
      value = trimmedProcess ? `${trimmedProcess} (${processSuffix})` : processSuffix;
    }

    setSheetValue(sheet, cellRef, value, path);
  });

  priorityMappings.forEach((rule) => {
    if (!rule || typeof rule !== "object") {
      return;
    }

    const { cell, fields, appendToPrimary, appendFormat } = rule;

    if (!cell || !Array.isArray(fields) || fields.length === 0) {
      return;
    }

    let baseValue;
    let baseField;

    for (const field of fields) {
      const candidate = getValueFromPath(context, field);
      if (normalizeTrimmed(candidate)) {
        baseValue = candidate;
        baseField = field;
        break;
      }
    }

    if (!baseField) {
      setSheetValue(sheet, cell, "", fields[0] || "");
      return;
    }

    let finalValue = normalizeTrimmed(baseValue);

    if (fields[0] === baseField) {
      const extras = Array.isArray(appendToPrimary) && appendToPrimary.length > 0
        ? appendToPrimary
        : fields.slice(1);
      const formatMask = typeof appendFormat === "string" && appendFormat.includes("{value}")
        ? appendFormat
        : "({value})";

      const additions = extras
        .map((field) => {
          if (field === baseField) {
            return null;
          }
          const extraValue = getValueFromPath(context, field);
          const trimmed = normalizeTrimmed(extraValue);
          if (!trimmed) {
            return null;
          }
          return formatMask.replace("{value}", trimmed);
        })
        .filter(Boolean)
        .join("");

      if (additions) {
        finalValue = `${finalValue}${additions}`;
      }
    }

    setSheetValue(sheet, cell, finalValue, baseField);
  });
};

const fillCollection = (
  sheet,
  items,
  mapping,
  { fallbackRow = DEFAULT_START_ROW, formatters = {} } = {},
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const normalizedMapping = Object.entries(mapping).reduce(
    (acc, [field, cellRef]) => {
      acc[field] = parseCellReference(cellRef, fallbackRow);
      return acc;
    },
    {},
  );

  items.forEach((item, index) => {
    Object.entries(normalizedMapping).forEach(([field, base]) => {
      const formatter = formatters[field];
      const raw = formatter ? formatter(item[field], item) : item[field];
      const targetCell = `${base.column}${base.row + index}`;
      setSheetValue(sheet, targetCell, raw, field);
    });
  });
};

const applyMappingsToSheet = (sheet, folha) => {
  if (!sheet || !folha) {
    return;
  }

  fillHeadMapping(sheet, folha);

  const teamMappingConfig = teamMapping.equipes || {};
  const { eletricistas: eletricistasRef, ...teamMappingWithoutEletricistas } = teamMappingConfig;
  const equipes = Array.isArray(folha.equipes) ? folha.equipes : [];

  const normalizeString = (value) => {
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "string") {
      return value.trim();
    }
    return String(value).trim();
  };

  Object.entries(teamMappingWithoutEletricistas).forEach(([field, cellRef]) => {
    const values = equipes.map((team) => normalizeString(team?.[field] ?? ""));

    const trimmedValues = [...values];
    while (trimmedValues.length > 0 && trimmedValues[trimmedValues.length - 1] === "") {
      trimmedValues.pop();
    }

    let combinedValue = "";
    if (field === "codigo_equipe") {
      combinedValue = trimmedValues.filter(Boolean).join(" ");
    } else if (["encarregado", "motorista"].includes(field)) {
      combinedValue = trimmedValues.join("\n");
    } else {
      combinedValue = trimmedValues.filter(Boolean).join("\n");
    }

    setSheetValue(sheet, cellRef, combinedValue, field);
  });

  if (eletricistasRef) {
    const eletricistasList = equipes.flatMap((team) => {
      const eletricistas = Array.isArray(team?.eletricistas) ? team.eletricistas : [];
      return eletricistas
        .map((nome) => normalizeString(nome))
        .filter((text) => text.length > 0);
    });

    const combinedEletricistas = eletricistasList.join("\n");
    setSheetValue(sheet, eletricistasRef, combinedEletricistas, "eletricistas");
  }

  const servicosMapping = serviceMapping.servicos || {};
  fillCollection(sheet, folha.servicos || [], servicosMapping);

  const equipamentosInstaladosMapping =
    equipmentMapping.equipamentosInstalados || {};
  fillCollection(
    sheet,
    folha.equipamentos_instalados || [],
    equipamentosInstaladosMapping,
    {
      formatters: {
        data_fabricacao: (_, item) => {
          const data = item?.data_fabricacao;
          if (data) {
            const parsed = parseLocalDateLike(data);
            if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
              return format(parsed, "MM/yyyy");
            }
            const raw = String(data).trim();
            if (raw) {
              // Tenta suportar formatos como YYYY-MM ou YYYY-MM-DD
              const isoLike = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
              if (isoLike) {
                return `${isoLike[2]}/${isoLike[1]}`;
              }
              return raw;
            }
          }
          const mes = item?.mes_fabricacao
            ? String(item.mes_fabricacao).padStart(2, "0")
            : "";
          const ano = item?.ano_fabricacao ? String(item.ano_fabricacao) : "";
          if (!mes && !ano) {
            return "";
          }
          return [mes, ano].filter(Boolean).join("/");
        },
      },
    },
  );

  const equipamentosRetiradosMapping =
    equipmentMapping.equipamentosRetirados || {};
  fillCollection(
    sheet,
    folha.equipamentos_retirados || [],
    equipamentosRetiradosMapping,
    {
      formatters: {
        data_fabricacao: (_, item) => {
          const data = item?.data_fabricacao;
          if (data) {
            const parsed = parseLocalDateLike(data);
            if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
              return format(parsed, "MM/yyyy");
            }
            const raw = String(data).trim();
            if (raw) {
              const isoLike = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
              if (isoLike) {
                return `${isoLike[2]}/${isoLike[1]}`;
              }
              return raw;
            }
          }
          const mes = item?.mes_fabricacao
            ? String(item.mes_fabricacao).padStart(2, "0")
            : "";
          const ano = item?.ano_fabricacao ? String(item.ano_fabricacao) : "";
          if (!mes && !ano) {
            return "";
          }
          return [mes, ano].filter(Boolean).join("/");
        },
      },
    },
  );

  const materiaisInstaladosMapping = materialsMapping.materiaisInstalados || {};
  fillCollection(
    sheet,
    folha.materiais_instalados || [],
    materiaisInstaladosMapping,
  );

  const materiaisRetiradosMapping = materialsMapping.materiaisRetirados || {};
  fillCollection(
    sheet,
    folha.materiais_retirados || [],
    materiaisRetiradosMapping,
  );
};

export const exportFolhaMedicao = async (folha, fileName) => {
  const workbook = await fetchTemplateWorkbook();
  const sheet = workbook.sheet(TARGET_SHEET_INDEX);

  applyMappingsToSheet(sheet, folha);
  await downloadWorkbook(workbook, fileName);
};

export { fetchTemplateWorkbook, downloadWorkbook };

