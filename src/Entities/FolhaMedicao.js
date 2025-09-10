// src/Entities/FolhaMedicao.js

export const FolhaMedicao = {
  async list(params = null, page = 0) {
    // Aqui você pode trocar futuramente por chamada a uma API real
    return []; // Simulando lista vazia
  },

  async create(data) {
    // Aqui você também pode salvar em backend futuramente
    console.log("Criando folha de medição com os dados:", data);
    return { success: true };
  }
};
