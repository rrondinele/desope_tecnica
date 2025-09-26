// src/components/api.js
import axios from "axios";
import { supabase, hasSupabase } from "@/services/supabaseClient";

const API_BASE_URL = "http://localhost:3000/api/servicos"; // Altere conforme o backend real

const sanitizePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return Object.keys(payload).reduce((acc, key) => {
    const value = payload[key];
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const getServicos = async () => {
  if (hasSupabase()) {
    const { data, error } = await supabase
      .from("cen_fat_servicos")
      .select("*")
      .order("created_date", { ascending: false });

    if (error) {
      console.error("[supabase] Erro ao buscar servicos:", error);
      throw error;
    }

    return data || [];
  }

  try {
    const response = await axios.get(API_BASE_URL);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar servicos:", error);
    throw error;
  }
};

export const createServico = async (servico) => {
  const payload = sanitizePayload(servico);

  if (hasSupabase()) {
    const { data, error } = await supabase
      .from("cen_fat_servicos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[supabase] Erro ao criar servico:", error);
      throw error;
    }

    return data;
  }

  try {
    const response = await axios.post(API_BASE_URL, payload);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar servico:", error);
    throw error;
  }
};
