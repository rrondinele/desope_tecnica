import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";

const FIELD_ALIASES = {
  descricao: ["descricao", "descricao do material", "material", "nome"],
  lote: [
    "lote",
    "codigo",
    "codigo material",
    "codigo do material",
    "codigo_produto",
    "codigo-produto",
  ],
  quantidade: ["quantidade", "qtd", "qtde", "quant.", "quantidade solicitada"],
  origem: ["origem", "observacao", "observacao do material", "local", "comentario"],
  umb: ["umb", "unidade", "unid", "unidade de medida", "unidade medida"],
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const normalizeString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const resolveFieldKey = (header) => {
  const normalized = normalizeText(header);

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => normalizeText(alias) === normalized)) {
      return field;
    }
  }

  return null;
};

const parseQuantidade = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  if (hasComma && hasDot) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `material-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
};

const buildMaterialFromRow = (row, headerMap) => {
  const material = {
    descricao: "",
    lote: "",
    quantidade: null,
    origem: "",
    umb: "",
  };

  Object.entries(headerMap).forEach(([index, key]) => {
    if (key === null) return;
    const value = row[index];
    switch (key) {
      case "quantidade":
        material.quantidade = parseQuantidade(value);
        break;
      case "descricao":
      case "lote":
      case "origem":
      case "umb":
        material[key] = normalizeString(value);
        break;
      default:
        break;
    }
  });

  return material;
};

const isRowEmpty = (row = []) =>
  row.every(
    (cell) =>
      cell === undefined ||
      cell === null ||
      (typeof cell === "string" && cell.trim() === "")
  );

/**
 * Le um arquivo XLSX contendo materiais e retorna uma lista validada.
 * O arquivo deve ter um cabecalho na primeira linha com as colunas
 * "Lote" e "Quantidade" (obrigatorias). "Descricao", "Origem" e "UMB"
 * sao opcionais e serao preenchidos automaticamente quando possivel.
 */
export const parseMateriaisXlsx = async (file) => {
  if (!file) {
    throw new Error("Nenhum arquivo selecionado.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
  const sheet = workbook.sheet(0);
  const usedRange = sheet.usedRange();

  if (!usedRange) {
    return { materiais: [], warnings: ["A planilha esta vazia."] };
  }

  const rows = usedRange.value();
  if (!Array.isArray(rows) || rows.length < 2) {
    return { materiais: [], warnings: ["Nenhum dado encontrado na planilha."] };
  }

  const headerRow = rows[0];
  const headerMap = {};
  let hasLote = false;
  let hasQuantidade = false;

  headerRow.forEach((header, index) => {
    const key = resolveFieldKey(header);
    headerMap[index] = key;
    if (key === "lote") hasLote = true;
    if (key === "quantidade") hasQuantidade = true;
  });

  if (!hasLote || !hasQuantidade) {
    throw new Error("A planilha precisa conter as colunas 'Lote' e 'Quantidade'.");
  }

  const warnings = [];
  const materiais = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || isRowEmpty(row)) {
      continue;
    }

    const material = buildMaterialFromRow(row, headerMap);

    if (!material.lote) {
      warnings.push(`Linha ${i + 1}: campo 'Lote' vazio, item ignorado.`);
      continue;
    }

    if (material.quantidade === null || Number.isNaN(material.quantidade)) {
      warnings.push(
        `Linha ${i + 1}: quantidade invalida para o lote '${material.lote}', item ignorado.`
      );
      continue;
    }

    if (material.quantidade <= 0) {
      warnings.push(
        `Linha ${i + 1}: quantidade menor ou igual a zero para o lote '${material.lote}', item ignorado.`
      );
      continue;
    }

    materiais.push({
      ...material,
      id: generateId(),
    });
  }

  if (materiais.length === 0 && warnings.length === 0) {
    warnings.push("Nenhum material valido foi encontrado na planilha.");
  }

  return { materiais, warnings };
};

const TEMPLATE_HEADERS = ["Lote", "Quantidade"];
const TEMPLATE_FILENAME = "modelo-importacao-materiais.xlsx";

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadMateriaisTemplate = async () => {
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);

  TEMPLATE_HEADERS.forEach((header, index) => {
    const cell = sheet.cell(1, index + 1);
    cell.value(header);
    cell.style({
      bold: true,
      fill: "eeeeee",
      border: true,
    });
    sheet.column(index + 1).width(header.length + 8);
  });

  sheet.row(2).cell(1).value("123456");
  sheet.row(2).cell(2).value(1);

  sheet.freezePanes(0, 1);

  const arrayBuffer = await workbook.outputAsync();
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, TEMPLATE_FILENAME);
};

