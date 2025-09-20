// ===================================
// Rules for DadosGerais section
// ===================================

// Rule: returns the prefix based on the selected process type
export function getProjetoPrefix(tipoProcesso) {
  return tipoProcesso === "Manutenção" ? "OMI-" : "OII-";
}

// Rule: defines if the project field is required
export function isProjetoRequired(tipoProcesso, caracteristica) {
  return (
    (tipoProcesso === "Expansão" && caracteristica === "Programada") ||
    (tipoProcesso === "Manutenção" && caracteristica === "Programada")
  );
}

// Rule: defines if the work order field is required
export function isOrdemServicoRequired(tipoProcesso, caracteristica) {
  return tipoProcesso === "Manutenção" && caracteristica === "Emergencial";
}

// Rule: accepts only valid order numbers (empty or starting with 9 with max 8 digits)
export function validarOrdemServico(valor) {
  const cleanValue = valor.replace(/\D/g, "");
  if (cleanValue.length <= 8 && (cleanValue === "" || cleanValue.startsWith("9"))) {
    return cleanValue;
  }
  return null;
}
