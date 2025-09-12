import React from "react";

export function Alert({ children, className = "" }) {
  return (
    <div className={`border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-md shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ADICIONE ESTA PARTE QUE ESTAVA FALTANDO
export function AlertTitle({ children, className = "" }) {
  return (
    <h5 className={`mb-1 font-bold text-yellow-900 ${className}`}>
      {children}
    </h5>
  );
}

export function AlertDescription({ children, className = "" }) {
  return (
    <div className={`text-sm text-yellow-800 ${className}`}>
      {children}
    </div>
  );
}