import { Notification } from "@/entities/Notification";
import { supabase, hasSupabase } from "@/services/supabaseClient";
import { createPageUrl } from "@/utils";

const CREATOR_EMAIL_CACHE = new Map();
const ROLE_CACHE = new Map();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const SUPERVISOR_CACHE = {
  data: [],
  expiresAt: 0,
};

const STATUS_MESSAGE_MAP = {
  rascunho: ({ numeroFM }) => `Folha ${numeroFM} criada pelo(a) Administrativo(a) e marcada como rascunho.`,
  pendente: ({ numeroFM }) => `Folha ${numeroFM} validada pelo(a) supervisor e marcada como pendente.`,
  aguardando_aprovacao: ({ numeroFM }) => `Folha ${numeroFM} enviada para a distribuidora e aguardando aprovação.`,
  aprovado: ({ numeroFM }) => `Folha ${numeroFM} aprovada pela distribuidora.`,
  reprovado: ({ numeroFM, context }) => {
    if (context?.novaFolhaNumero) {
      return `Folha ${numeroFM} reprovada pela distribuidora. Nova versão ${context.novaFolhaNumero} criada automaticamente.`;
    }
    return `Folha ${numeroFM} reprovada pela distribuidora. Uma nova versão foi criada automaticamente.`;
  },
  pago: ({ numeroFM }) => `Folha ${numeroFM} marcada como paga. Pagamento confirmado.`,
  cancelado: ({ numeroFM }) => `Folha ${numeroFM} cancelada.`,
};

const POSSIBLE_EMAIL_FIELDS = [
  "created_by_email",
  "creator_email",
  "email_criador",
  "solicitante_email",
  "user_email",
];

export const createNotification = async (targetUserEmail, message, link) => {
  if (!targetUserEmail || !message) return;
  try {
    await Notification.create({
      user_email: targetUserEmail,
      message,
      link,
    });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
};

function extractEmailFromFolha(folha) {
  if (!folha || typeof folha !== "object") return null;
  for (const field of POSSIBLE_EMAIL_FIELDS) {
    if (folha[field]) {
      return folha[field];
    }
  }
  if (folha?.created_by_user?.email) {
    return folha.created_by_user.email;
  }
  if (folha?.criado_por_email) {
    return folha.criado_por_email;
  }
  return null;
}

async function resolveCreatorEmail(folha) {
  const inlineEmail = extractEmailFromFolha(folha);
  if (inlineEmail) {
    return inlineEmail;
  }

  const userId = folha?.created_by_user_id || folha?.user_id || folha?.created_by;
  if (!userId || !hasSupabase()) {
    return null;
  }

  if (CREATOR_EMAIL_CACHE.has(userId)) {
    return CREATOR_EMAIL_CACHE.get(userId);
  }

  try {
    const query = supabase
      .from("profiles")
      .select("email")
      .eq("id", userId);

    const response = typeof query.maybeSingle === "function" ? await query.maybeSingle() : await query.single();
    const { data, error } = response;

    if (error) {
      console.error("[notifications] resolveCreatorEmail error", error);
      return null;
    }

    const email = data?.email || null;
    if (email) {
      CREATOR_EMAIL_CACHE.set(userId, email);
    }
    return email;
  } catch (error) {
    console.error("[notifications] resolveCreatorEmail unexpected error", error);
    return null;
  }
}

async function getProfileRoleByEmail(email) {
  if (!email || !hasSupabase()) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cached = ROLE_CACHE.get(normalizedEmail);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.role;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[notifications] getProfileRoleByEmail error", error);
      return null;
    }

    const role = data?.role || null;
    ROLE_CACHE.set(normalizedEmail, {
      role,
      expiresAt: now + ROLE_CACHE_TTL,
    });
    return role;
  } catch (error) {
    console.error("[notifications] getProfileRoleByEmail unexpected error", error);
    return null;
  }
}

async function getSupervisorEmails() {
  if (!hasSupabase()) {
    return [];
  }

  const now = Date.now();
  if (SUPERVISOR_CACHE.expiresAt > now && SUPERVISOR_CACHE.data.length) {
    return SUPERVISOR_CACHE.data;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "supervisor")
      .not("email", "is", null);

    if (error) {
      console.error("[notifications] getSupervisorEmails error", error);
      return [];
    }

    const emails = Array.isArray(data)
      ? data.map((item) => item?.email).filter(Boolean)
      : [];

    SUPERVISOR_CACHE.data = emails;
    SUPERVISOR_CACHE.expiresAt = now + ROLE_CACHE_TTL;
    return emails;
  } catch (error) {
    console.error("[notifications] getSupervisorEmails unexpected error", error);
    return [];
  }
}

async function resolveNotificationTargets(folha, context = {}) {
  const creatorEmail = await resolveCreatorEmail(folha);
  const actorEmail = context?.actorEmail || null;

  if (!actorEmail && !creatorEmail) {
    return [];
  }

  if (!hasSupabase()) {
    const set = new Set([actorEmail, creatorEmail].filter(Boolean));
    return Array.from(set);
  }

  let actorRole = context?.actorRole || null;
  let creatorRole = context?.creatorRole || folha?.created_by_role || null;

  if (!actorRole && actorEmail) {
    actorRole = await getProfileRoleByEmail(actorEmail);
  }

  if (!creatorRole && creatorEmail) {
    creatorRole = await getProfileRoleByEmail(creatorEmail);
  }

  const targets = new Set();

  const actorIsBackoffice = actorRole === "backoffice";
  const actorIsSupervisor = actorRole === "supervisor";

  if (actorIsBackoffice) {
    const supervisorEmails = await getSupervisorEmails();
    supervisorEmails.forEach((email) => targets.add(email));
    if (creatorEmail) {
      targets.add(creatorEmail);
    }
    if (actorEmail) {
      targets.add(actorEmail);
    }
  } else if (actorIsSupervisor) {
    if (creatorEmail && (!creatorRole || creatorRole === "backoffice")) {
      targets.add(creatorEmail);
    }
    if (actorEmail) {
      targets.add(actorEmail);
    }
  } else {
    [actorEmail, creatorEmail]
      .filter(Boolean)
      .forEach((email) => targets.add(email));
  }

  return Array.from(targets);
}

export async function notifyFolhaStatusChange({ folha, novoStatus, context } = {}) {
  if (!folha || !novoStatus) return;

  const builder = STATUS_MESSAGE_MAP[novoStatus];
  if (typeof builder !== "function") {
    return;
  }

  const targetEmails = await resolveNotificationTargets(folha, context);
  if (!targetEmails || targetEmails.length === 0) {
    return;
  }

  const numeroFM = folha.numero_fm || folha.numeroFM || folha?.numero || "Folha";
  const message = builder({ numeroFM, context });
  const link = createPageUrl("ListaFolhas");

  await Promise.all(
    targetEmails.map((email) => createNotification(email, message, link)),
  );
}

export async function notifyManual(targetUserEmail, message) {
  if (!targetUserEmail || !message) return;
  const link = createPageUrl("ListaFolhas");
  await createNotification(targetUserEmail, message, link);
}

export function clearCreatorEmailCache() {
  CREATOR_EMAIL_CACHE.clear();
}
