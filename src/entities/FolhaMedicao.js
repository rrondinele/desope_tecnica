import { getFolhas, createFolha, updateFolha } from "@/services/storage";

const sortByCreatedDate = (folhas, order) => {
  if (!order || !Array.isArray(folhas)) {
    return folhas ?? [];
  }

  const sorted = [...folhas];
  if (order === "-created_date") {
    sorted.sort((a, b) => new Date(b?.created_date || 0) - new Date(a?.created_date || 0));
  } else if (order === "created_date") {
    sorted.sort((a, b) => new Date(a?.created_date || 0) - new Date(b?.created_date || 0));
  }
  return sorted;
};

const normalizeId = (value) => (value === undefined || value === null ? null : String(value));

export const FolhaMedicao = {
  async list(order = null) {
    const folhas = getFolhas();
    return sortByCreatedDate(folhas, order);
  },

  async get(id) {
    const folhas = getFolhas();
    const targetId = normalizeId(id);
    return folhas.find((folha) => normalizeId(folha.id) === targetId) || null;
  },

  async create(data) {
    const now = new Date();
    const baseStatus = data?.status ?? "pendente";
    const createdDate = data?.created_date ?? now.toISOString();
    const id = data?.id ?? now.getTime();

    const historicoValido = Array.isArray(data?.status_historico) && data.status_historico.length > 0
      ? data.status_historico
      : [
          {
            status: baseStatus,
            data: createdDate,
            usuario: "sistema",
            observacoes: "Folha criada localmente",
          },
        ];

    const novaFolha = {
      ...data,
      id,
      status: baseStatus,
      created_date: createdDate,
      status_historico: historicoValido,
    };

    createFolha(novaFolha);
    return novaFolha;
  },

  async update(id, updates) {
    const folhaExistente = await this.get(id);
    if (!folhaExistente) {
      throw new Error(`Folha com ID ${id} nao encontrada.`);
    }

    const storageId = folhaExistente.id;
    updateFolha(storageId, updates);
    return this.get(storageId);
  },
};
