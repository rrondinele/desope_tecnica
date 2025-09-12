// src/components/api.js
import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api/servicos"; // Altere conforme o backend real

/**
 * Busca todos os serviços elétricos cadastrados.
 * @returns {Promise<Array>} Lista de serviços.
 */
export const getServicos = async () => {
  try {
    const response = await axios.get(API_BASE_URL);
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
    const response = await axios.post(API_BASE_URL, servico);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    throw error;
  }
};
