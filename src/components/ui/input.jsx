
{/*
import React from "react";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}
*/}



// components/ui/input.jsx
import React from "react";

export function Input({ className = "", fullWidth = true, ...props }) {
  return (
    <input
      className={`border border-gray-300 rounded-lg px-3 py-2 ${fullWidth ? "w-full" : ""} focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}
