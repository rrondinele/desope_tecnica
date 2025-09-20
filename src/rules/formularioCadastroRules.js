// ===================================
// Rules for FormularioCadastro
// ===================================

// Rule: converts a value to number of items
export function parseQuantidade(valor) {
  return parseFloat(valor) || 0;
}

// Rule: converts a value to numeric amount for services
export function parseValorServicos(valor) {
  return parseFloat(valor) || 0;
}

// Rule: clears field level errors when the user starts typing again
export function shouldResetErrorOnInput(error) {
  return error ? null : error;
}

// Rule: executes callbacks after a successful submit
export function handleSubmitSuccess(onSuccess, resetForm) {
  if (onSuccess) {
    onSuccess();
  }
  setTimeout(() => resetForm(), 2000);
}

// Rule: determines button label and state according to submit progress
export function getButtonState(isSubmitting) {
  return {
    disabled: isSubmitting,
    label: isSubmitting ? "Salvando..." : "Salvar Programacao",
    icon: isSubmitting ? "loading" : "save"
  };
}
