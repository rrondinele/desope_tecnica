// ===================================
// Rules for ListaFolhas screen
// ===================================


// Internal function to normalize IDs for comparison
const normalizeIdInternal = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value);
};

// Exported for external use if needed
export const normalizeId = normalizeIdInternal;

// Rule: toggles selection of a folha for export
export function toggleExportSelection(currentSelectedId, folhaId) {
  const current = normalizeIdInternal(currentSelectedId);
  const target = normalizeIdInternal(folhaId);

  if (current && current === target) {
    return null; // desmarca se clicar novamente
  }

  return folhaId;
}

// Rule: validates the selected folha for export
export function validateExportSelection(selectedId, folhas) {
  const normalized = normalizeIdInternal(selectedId);

  if (!normalized) {
    return {
      valid: false,
      message: "Selecione uma folha para exportar.",
      folha: null,
    };
  }

  // procura a folha correspondente
  const folhaEncontrada = (folhas || []).find(
    (folha) => normalizeIdInternal(folha?.id) === normalized
  );

  if (!folhaEncontrada) {
    return {
      valid: false,
      message: "N�o foi poss�vel localizar a folha selecionada.",
      folha: null,
    };
  }

  return { valid: true, folha: folhaEncontrada };
}


// Rule: safely retrieves a nested value from an object using a dot-separated path
export function getValueFromPath(data, path) {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, data);
}

// Rule: builds a sanitized filename for exporting to Excel
export function buildExcelFileName(folha) {
  const numero = folha?.numero_fm ? String(folha.numero_fm) : "folha";
  const sanitized = numero.replace(/[\\/:*?"<>|]/g, "-");
  const datePart = new Date().toISOString().slice(0, 10);
  return `${sanitized}-${datePart}.xlsx`;
}

// Gera um ID simples e único (não é UUID, mas serve para listas pequenas)
export const STATUS_RULES = {
  pendente: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconKey: 'clock',
  },
  aguardando_aprovacao: {
    label: 'Aguardando Aprova��o',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconKey: 'send',
  },
  aprovado: {
    label: 'Aprovado',
    color: 'bg-green-100 text-green-800 border-green-200',
    iconKey: 'checkCircle',
  },
  reprovado: {
    label: 'Reprovado',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    iconKey: 'alertTriangle',
  },
  pago: {
    label: 'Pago',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconKey: 'dollarSign',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 border-red-200',
    iconKey: 'xCircle',
  },
};


// Rule: retrieves status details based on status key
export function getStatusRule(status) {
  return STATUS_RULES[status] || null;
}
