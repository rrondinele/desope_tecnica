// Regras do FormularioCadastro

export function parseQuantidade(valor) {
  return parseFloat(valor) || 0;
}

export function parseValorServicos(valor) {
  return parseFloat(valor) || 0;
}

export function shouldResetErrorOnInput(error) {
  return error ? null : error;
}

export function handleSubmitSuccess(onSuccess, resetForm) {
  if (onSuccess) onSuccess();
  setTimeout(() => resetForm(), 2000);
}

export function getButtonState(isSubmitting) {
  return {
    disabled: isSubmitting,
    label: isSubmitting ? "Salvando..." : "Salvar Programação",
    icon: isSubmitting ? "loading" : "save"
  };
}
