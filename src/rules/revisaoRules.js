// ===================================
// Rules for Revisao step
// ===================================

// Rule: builds the payload used when finishing the review step
export function generateFinalData(data, finalStatus) {
  return {
    ...data,
    id: Date.now(),
    created_date: new Date().toISOString(),
    status: finalStatus,
    status_historico: [
      ...(data.status_historico || []),
      {
        status: finalStatus,
        data: new Date().toISOString(),
        usuario: "sistema",
        observacoes: `Folha criada como ${finalStatus}`
      }
    ]
  };
}

// Rule: defines button appearance while saving
export function getButtonState(isSaving) {
  return {
    disabled: isSaving,
    label: isSaving ? "Salvando..." : "Salvar e Concluir",
    icon: isSaving ? "loading" : "save"
  };
}
