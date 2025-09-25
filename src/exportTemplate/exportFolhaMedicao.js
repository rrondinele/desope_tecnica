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
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        return format(new Date(parsed), DEFAULT_DATE_FORMAT);
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

const fillHeadMapping = (sheet, folha) => {
  const context = { data: folha };
  Object.entries(headMapping).forEach(([path, cellRef]) => {
    const value = getValueFromPath(context, path);


    setSheetValue(sheet, cellRef, value, path);
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

  fillCollection(sheet, folha.equipes || [], teamMappingWithoutEletricistas);

  if (eletricistasRef) {
    const baseRef = parseCellReference(eletricistasRef);
    (folha.equipes || []).forEach((equipe, equipeIndex) => {
      const eletricistas = Array.isArray(equipe?.eletricistas) ? equipe.eletricistas : [];
      const startRow = baseRef.row + equipeIndex;

      eletricistas.forEach((nome, idx) => {
        const targetCell = `${baseRef.column}${startRow + idx}`;
        setSheetValue(sheet, targetCell, nome, 'eletricistas');
      });
    });
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

