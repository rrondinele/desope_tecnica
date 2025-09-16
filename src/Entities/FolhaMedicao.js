// src/entities/FolhaMedicao.js
// Implementação simples usando localStorage para persistir durante a navegação.
// Quando você conectar o backend real, basta substituir estas funções por fetch/axios.

const STORAGE_KEY = "desope.folhas_medicao";

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function genId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

function sanitize(obj) {
  const o = { ...obj };
  Object.keys(o).forEach(k => o[k] === undefined && delete o[k]);
  return o;
}

export const FolhaMedicao = {
  async list(order = "-created_date") {
    let all = loadAll();
    const field = order?.replace(/^-/, "") || "created_date";
    const desc = order?.startsWith("-");
    all.sort((a, b) => {
      const va = a?.[field] ?? "";
      const vb = b?.[field] ?? "";
      return desc ? (va < vb ? 1 : va > vb ? -1 : 0) : (va > vb ? 1 : va < vb ? -1 : 0);
    });
    return all;
  },

  async get(id) {
    const all = loadAll();
    return all.find(f => f.id === id) || null;
  },

  async create(data) {
    const now = new Date().toISOString();
    const rec = {
      id: genId(),
      created_date: now,
      status_historico: [],
      versao: 1,
      status: data?.status || "pendente",
      ...sanitize(data),
    };
    const all = loadAll();
    all.push(rec);
    saveAll(all);
    return rec;
  },

  async update(id, updates) {
    const all = loadAll();
    const idx = all.findIndex(f => f.id === id);
    if (idx === -1) throw new Error("Folha não encontrada");
    const merged = { ...all[idx], ...sanitize(updates), updated_date: new Date().toISOString() };
    all[idx] = merged;
    saveAll(all);
    return merged;
  },

  async remove(id) {
    const all = loadAll();
    const next = all.filter(f => f.id !== id);
    saveAll(next);
    return { success: true };
  },
};

export default FolhaMedicao;