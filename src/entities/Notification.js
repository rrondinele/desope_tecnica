import { supabase, hasSupabase } from "@/services/supabaseClient";

const STORAGE_KEY = "desope.notifications";

const POSSIBLE_EMAIL_FIELDS = [
  "user_email",
  "created_by_email",
  "creator_email",
  "email_criador",
  "solicitante_email",
];

function loadAll() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[Notification] Unable to parse local notifications", error);
    return [];
  }
}

function saveAll(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("[Notification] Unable to persist local notifications", error);
  }
}

function genId() {
  return `notif_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

function normalize(record) {
  if (!record) return null;
  const normalized = { ...record };
  normalized.is_read = Boolean(record.is_read);
  normalized.link = record.link || null;
  normalized.created_at = record.created_at || new Date().toISOString();
  POSSIBLE_EMAIL_FIELDS.forEach((field) => {
    if (normalized[field] && field !== "user_email" && !normalized.user_email) {
      normalized.user_email = normalized[field];
    }
  });
  return normalized;
}

export const Notification = {
  async listByUser(userEmail, { includeRead = true, limit = 50 } = {}) {
    if (!userEmail) return [];

    if (hasSupabase()) {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!includeRead) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[Notification] listByUser error", error);
        throw error;
      }
      return Array.isArray(data) ? data.map(normalize) : [];
    }

    const all = loadAll();
    const filtered = all
      .filter((notification) => {
        if (!notification || typeof notification !== "object") return false;
        if (notification.user_email !== userEmail) return false;
        if (!includeRead && notification.is_read) return false;
        return true;
      })
      .sort((a, b) => {
        const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

    return filtered.slice(0, limit).map(normalize);
  },

  async create({ user_email, message, link }) {
    if (!user_email || !message) return null;

    const payload = {
      user_email,
      message,
      link: link || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from("notifications")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("[Notification] create error", error);
        throw error;
      }

      return normalize(data);
    }

    const all = loadAll();
    const record = normalize({ ...payload, id: genId() });
    all.push(record);
    saveAll(all);
    return record;
  },

  async markAsRead(id) {
    if (!id) return;

    const read_at = new Date().toISOString();

    if (hasSupabase()) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at })
        .eq("id", id);

      if (error) {
        console.error("[Notification] markAsRead error", error);
        throw error;
      }
      return;
    }

    const all = loadAll();
    const idx = all.findIndex((item) => item && item.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], is_read: true, read_at };
      saveAll(all);
    }
  },

  async markAllAsRead(userEmail) {
    if (!userEmail) return;

    const read_at = new Date().toISOString();

    if (hasSupabase()) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at })
        .eq("user_email", userEmail);

      if (error) {
        console.error("[Notification] markAllAsRead error", error);
        throw error;
      }
      return;
    }

    const all = loadAll();
    let changed = false;
    const updated = all.map((item) => {
      if (!item || item.user_email !== userEmail) return item;
      if (item.is_read) return item;
      changed = true;
      return { ...item, is_read: true, read_at };
    });
    if (changed) {
      saveAll(updated);
    }
  },
};

export default Notification;