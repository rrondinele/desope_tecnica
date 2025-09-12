// src/components/formatters.js
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata um número como moeda brasileira (R$).
 * @param {number} valor
 * @returns {string}
 */
export const formatCurrency = (valor) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor ?? 0);
};

/**
 * Formata uma data ISO para o formato dd/MM/yyyy.
 * @param {string|Date} data
 * @returns {string}
 */
export const formatDate = (data) => {
  if (!data) return "";
  const date = new Date(data);
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};
