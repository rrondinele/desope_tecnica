import React from "react";

export function Table({ children, className }) {
  return (
    <table className={`min-w-full text-sm ${className || ""}`}>
      {children}
    </table>
  );
}

export function TableHeader({ children, className }) {
  return (
    <thead className={className}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }) {
  return (
    <tr className={className}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className }) {
  return (
    <th className={`text-left font-semibold px-4 py-2 ${className || ""}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className }) {
  return (
    <td className={`px-4 py-2 ${className || ""}`}>
      {children}
    </td>
  );
}
