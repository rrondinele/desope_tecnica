// src/entities/FolhaMedicao.js
// Implementação com fallback: usa Supabase (se configurado) ou localStorage.

import { supabase, hasSupabase } from "@/services/supabaseClient";

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
  Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
  return o;
}

function toNullIfEmpty(v) {
  return v === '' ? null : v;
}

function normalizeMainRecord(data) {
  const d = { ...data };
  // Campos que podem ser string vazia → null para não quebrar CASTs da RPC
  d.data_obra = toNullIfEmpty(d.data_obra);
  d.hora_acionada = toNullIfEmpty(d.hora_acionada);
  d.hora_inicio = toNullIfEmpty(d.hora_inicio);
  d.hora_fim = toNullIfEmpty(d.hora_fim);
  d.data_envio = toNullIfEmpty(d.data_envio);
  d.data_retorno_distribuidora = toNullIfEmpty(d.data_retorno_distribuidora);
  d.data_pagamento = toNullIfEmpty(d.data_pagamento);
  d.numero_pagamento = toNullIfEmpty(d.numero_pagamento);
  d.motivo_cancelamento = toNullIfEmpty(d.motivo_cancelamento);
  d.tipo_motivo_reprovacao = toNullIfEmpty(d.tipo_motivo_reprovacao);
  d.motivo_reprovacao = toNullIfEmpty(d.motivo_reprovacao);
  return d;
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${label} after ${ms}ms`)), ms || 20000)),
  ]);
}

export const FolhaMedicao = {
  async list(order = "-created_date") {
    if (hasSupabase()) {
      const field = order?.replace(/^-/, "") || "created_date";
      const ascending = !order?.startsWith("-");
      const { data, error } = await supabase
        .from("cen_fat_servicos")
        .select(`
          *,
          equipes:cen_fat_equipes(*),
          servicos:cen_fat_servicos_itens(*),
          equipamentos_instalados:cen_fat_equip_instalados(*),
          equipamentos_retirados:cen_fat_equip_retirados(*),
          materiais_instalados:cen_fat_mat_instalados(*),
          materiais_retirados:cen_fat_mat_retirados(*)
        `)
        .order(field, { ascending });
      if (error) throw error;
      return data || [];
    }

    let all = loadAll();
    const field = order?.replace(/^-/, "") || "created_date";
    const desc = order?.startsWith("-");
    all.sort((a, b) => {
      const va = a?.[field] ?? "";
      const vb = b?.[field] ?? "";
      return desc ? (va < vb ? 1 : va > vb ? -1 : 0) : va > vb ? 1 : va < vb ? -1 : 0;
    });
    return all;
  },

  async get(id) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from("cen_fat_servicos")
        .select(`
          *,
          equipes:cen_fat_equipes(*),
          servicos:cen_fat_servicos_itens(*),
          equipamentos_instalados:cen_fat_equip_instalados(*),
          equipamentos_retirados:cen_fat_equip_retirados(*),
          materiais_instalados:cen_fat_mat_instalados(*),
          materiais_retirados:cen_fat_mat_retirados(*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data || null;
    }
    const all = loadAll();
    return all.find((f) => f.id === id) || null;
  },

  async create(data) {
    if (hasSupabase()) {
      const now = new Date().toISOString();
      const payload = sanitize({ ...normalizeMainRecord(data), created_date: now, updated_date: now });
      // Debug leve
      console.info('[FolhaMedicao.create] calling RPC cen_create_folha', { hasSupabase: true });
      const { data: rpc, error } = await withTimeout(
        supabase.rpc('cen_create_folha', { p_data: payload }),
        20000,
        'cen_create_folha'
      );
      if (error) {
        console.error('[FolhaMedicao.create] RPC error', error);
        throw error;
      }
      const newId = Array.isArray(rpc) ? rpc[0] : rpc;
      console.info('[FolhaMedicao.create] RPC ok, id=', newId);
      const rec = await withTimeout(this.get(newId), 15000, 'get(newId)');
      return rec;
    }

    // Fallback localStorage
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
    if (hasSupabase()) {
      const now = new Date().toISOString();
      const payload = sanitize(normalizeMainRecord({ ...updates, updated_date: now }));
      console.info('[FolhaMedicao.update] calling RPC cen_update_folha', { id });
      const { error } = await withTimeout(
        supabase.rpc('cen_update_folha', { p_id: id, p_data: payload }),
        20000,
        'cen_update_folha'
      );
      if (error) {
        console.error('[FolhaMedicao.update] RPC error', error);
        throw error;
      }
      return await this.get(id);
    }

    const all = loadAll();
    const idx = all.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Folha não encontrada");
    const merged = {
      ...all[idx],
      ...sanitize(updates),
      updated_date: new Date().toISOString(),
    };
    all[idx] = merged;
    saveAll(all);
    return merged;
  },

  async remove(id) {
    if (hasSupabase()) {
      const { error } = await supabase.from("cen_fat_servicos").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    }
    const all = loadAll();
    const next = all.filter((f) => f.id !== id);
    saveAll(next);
    return { success: true };
  },
};

export default FolhaMedicao;
