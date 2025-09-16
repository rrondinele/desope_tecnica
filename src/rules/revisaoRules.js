// Regras do Revisao

export function generateFinalData(data, finalStatus) {
  return {
    ...data,
    id: new Date().getTime(),
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

export function getButtonState(isSaving) {
  return {
    disabled: isSaving,
    label: isSaving ? "Salvando..." : "Salvar e Concluir",
    icon: isSaving ? "loading" : "save"
  };
}
