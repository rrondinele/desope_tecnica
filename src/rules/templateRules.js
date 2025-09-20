// ===================================
// Rules for Excel template configuration
// ===================================

export const templateRules = {
  // Default template location used for exports
  templatePath: "/model-export/FOLHA DE MEDICAO.xlsx",
  // Sheet index where the layout lives (zero-based)
  defaultSheetIndex: 0,
  // First row number for repeating data collections
  defaultStartRow: 2,
  // Global formatting preferences applied by code when needed
  formatting: {
    date: "dd/MM/yyyy"
  },
  // Fallback styles in case the template must be overridden programmatically
  fallbackStyle: {
    enabled: false,
    font: { name: "Calibri", size: 11 },
    alignment: { horizontal: "left", vertical: "center" },
    numberFormat: "General"
  }
};

export const fieldRules = {
  // Fields mapped as dates that should respect the default mask
  dateFields: [
    "data_obra",
    "data_envio",
    "data_retorno_distribuidora",
    "data_pagamento"
  ],
  // Fields treated as numbers to avoid storing text in numeric columns
  numericFields: [
    "valor_total",
    "total_valor",
    "preco",
    "quantidade"
  ]
};
