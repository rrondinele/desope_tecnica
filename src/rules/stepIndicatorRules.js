// ===================================
// Rules for StepIndicator component
// ===================================

// Rule: determines the state of a step given the current index
export function getStepStatus(stepNumber, currentStep) {
  if (stepNumber < currentStep) {
    return "completed";
  }
  if (stepNumber === currentStep) {
    return "current";
  }
  return "pending";
}

// Rule: defines the connector color between steps
export function getConnectorColor(stepNumber, currentStep) {
  return stepNumber < currentStep ? "green" : "gray";
}
