export const templateRules = {
  templatePath: "/model-export/FOLHA DE MEDICAO.xlsx",
  defaultSheetIndex: 0,
  defaultStartRow: 2,
  formatting: {
    date: "dd/MM/yyyy",
  },
  fallbackStyle: {
    enabled: false,
  },
};

export const fieldRules = {
  dateFields: [
    "data_obra",
    "data_envio",
    "data_retorno_distribuidora",
    "data_pagamento",
    "hora_acionada",
    "hora_inicio",
    "hora_fim",
  ],
  numericFields: [
    "valor_total",
    "quantidade",
    "total_valor",
    "preco",
    "dispendio",
  ],
};

export default {
  templateRules,
  fieldRules,
};
