// src/components/api.js

import axios from "axios";

const DEFAULT_DEV_BASE_URL = "http://localhost:3000/api";

const sanitizeBaseUrl = (url) => url.replace(/\/+$/, "");

const resolveBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;

  if (typeof envUrl === "string" && envUrl.trim()) {
    return sanitizeBaseUrl(envUrl.trim());
  }

  if (import.meta.env?.DEV) {
    console.warn(
      "VITE_API_BASE_URL não configurada. Utilizando fallback padrão de desenvolvimento."
    );
    return sanitizeBaseUrl(DEFAULT_DEV_BASE_URL);
  }

  return null;
};

const API_BASE_URL = resolveBaseUrl();

const ensureBaseUrl = () => {
  if (!API_BASE_URL) {
    const errorMessage =
      "A URL base da API não está configurada. Defina a variável de ambiente VITE_API_BASE_URL.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return API_BASE_URL;
};

const buildUrl = (path = "") => {
  const baseUrl = ensureBaseUrl();
  const normalizedPath =
    typeof path === "string" && path.length > 0
      ? path.startsWith("/")
        ? path
        : `/${path}`
      : "";

  return `${baseUrl}${normalizedPath}`;
};

const SERVICOS_RESOURCE = "servicos";



/**
 * Busca todos os serviços elétricos cadastrados.
 * @returns {Promise<Array>} Lista de serviços.
 */
export const getServicos = async () => {
  try {
    const response = await axios.get(buildUrl(SERVICOS_RESOURCE));
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    throw error;
  }
};

/**
 * Cria um novo serviço elétrico.
 * @param {Object} servico - Objeto contendo os dados do novo serviço.
 * @returns {Promise<Object>} O serviço criado.
 */
export const createServico = async (servico) => {
  try {
    const response = await axios.post(buildUrl(SERVICOS_RESOURCE), servico);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    throw error;
  }
};