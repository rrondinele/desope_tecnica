// Regras do StepIndicator

export function getStepStatus(stepNumber, currentStep) {
  if (stepNumber < currentStep) return "completed"; // verde
  if (stepNumber === currentStep) return "current"; // azul
  return "pending"; // cinza
}

export function getConnectorColor(stepNumber, currentStep) {
  return stepNumber < currentStep ? "green" : "gray";
}
