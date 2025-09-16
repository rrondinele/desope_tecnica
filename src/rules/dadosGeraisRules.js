// Regras do DadosGerais

export function getProjetoPrefix(tipo_processo) {
  return tipo_processo === "Manutenção" ? "OMI-" : "OII-";
}

export function isProjetoRequired(tipo_processo, caracteristica) {
  return (
    (tipo_processo === "Expansão" && caracteristica === "Programada") ||
    (tipo_processo === "Manutenção" && caracteristica === "Programada")
  );
}

export function isOrdemServicoRequired(tipo_processo, caracteristica) {
  return tipo_processo === "Manutenção" && caracteristica === "Emergencial";
}

export function validarOrdemServico(valor) {
  const clean = valor.replace(/\D/g, "");
  if (clean.length <= 8 && (clean === "" || clean.startsWith("9"))) {
    return clean;
  }
  return null;
}
