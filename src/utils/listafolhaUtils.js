import { addDays, isWeekend } from "date-fns";

export const addBusinessDays = (date, days) => {
  let result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result = addDays(result, 1);
    if (!isWeekend(result)) {
      addedDays += 1;
    }
  }

  return result;
};

export const parseLocalDate = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) {
      return new Date(value.replace(" ", "T"));
    }
  }

  return new Date(value);
};

export const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const escapeCsvValue = (value) => {
  const normalized = value ?? "";
  return `"${String(normalized).replace(/"/g, '""')}"`;
};
