import React from "react";
import { Check } from "lucide-react";

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center min-w-0 flex-1">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                step.number < currentStep
                  ? "bg-green-500 border-green-500 text-white"
                  : step.number === currentStep
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-500"
              }`}
            >
              {step.number < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="font-semibold">{step.number}</span>
              )}
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <div
                className={`text-sm font-semibold ${
                  step.number <= currentStep ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {step.title}
              </div>
              <div className="text-xs text-gray-500 hidden sm:block">
                {step.description}
              </div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-4 transition-all duration-200 ${
                step.number < currentStep ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}