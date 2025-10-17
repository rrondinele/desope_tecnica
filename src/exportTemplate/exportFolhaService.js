import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { supabase, hasSupabase } from "@/services/supabaseClient";
import { exportFolhaMedicao } from "./exportFolhaMedicao";
import headMapping from "@/Mappings/Headmapping_excel.json";
import { getValueFromPath } from "@/rules/listFMRules";
import { parseLocalDate } from "@/utils/listafolhaUtils";
import { format } from "date-fns";

const INVALID_FILENAME_CHARS = /[<>:"\/\|?*]/g;

const sanitizeFilePart = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

  return trimmed
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

const priorityMappings = Array.isArray(headMapping.__priorityMappings)
  ? headMapping.__priorityMappings
  : [];

const normalizeTrimmed = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value).trim();
};

const getPriorityProjectValue = (folha) => {
  const context = { data: folha };
  const rule = priorityMappings.find(
    (entry) => Array.isArray(entry?.fields) && entry.fields.includes("data.projeto"),
  );

  if (!rule) {
    return normalizeTrimmed(folha?.projeto);
  }

  const { fields = [], appendToPrimary, appendFormat } = rule;
  if (fields.length === 0) {
    return normalizeTrimmed(folha?.projeto);
  }

  let baseValue;
  let baseField;

  for (const field of fields) {
    const candidate = getValueFromPath(context, field);
    if (normalizeTrimmed(candidate)) {
      baseValue = candidate;
      baseField = field;
      break;
    }
  }

  if (!baseField) {
    return normalizeTrimmed(getValueFromPath(context, fields[0]));
  }

  let finalValue = normalizeTrimmed(baseValue);

  if (fields[0] === baseField) {
    const extras = Array.isArray(appendToPrimary) && appendToPrimary.length > 0
      ? appendToPrimary
      : fields.slice(1);
    const formatMask = typeof appendFormat === "string" && appendFormat.includes("{value}")
      ? appendFormat
      : "({value})";

    const additions = extras
      .map((field) => {
        if (field === baseField) {
          return null;
        }
        const extraValue = getValueFromPath(context, field);
        const trimmed = normalizeTrimmed(extraValue);
        if (!trimmed) {
          return null;
        }
        return formatMask.replace("{value}", trimmed);
      })
      .filter(Boolean)
      .join("");

    if (additions) {
      finalValue = `${finalValue}${additions}`;
    }
  }

  return finalValue;
};

const buildExportTitle = (folha) => {
  const numero = sanitizeFilePart(folha?.numero_fm);
  const tecnico = sanitizeFilePart(folha?.tecnico_light);

  if (numero && tecnico) {
    return `${numero} - ${tecnico}`;
  }

  if (numero) {
    return numero;
  }

  if (tecnico) {
    return tecnico;
  }

  return 'FOLHA DE MEDICAO';
};

export const buildExcelFileName = (folha) => {
  const numero = sanitizeFilePart(folha?.numero_fm);
  const projetoDisplay = sanitizeFilePart(getPriorityProjectValue(folha) || folha?.projeto);

  let dataObraPart = "";
  if (folha?.data_obra) {
    const parsed = parseLocalDate(folha.data_obra);
    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
      dataObraPart = format(parsed, "dd-MM-yy");
    } else {
      dataObraPart = sanitizeFilePart(folha.data_obra);
    }
  }

  const circuito = sanitizeFilePart(folha?.circuito);
  const encarregado = sanitizeFilePart(
    folha?.encarregado || folha?.equipes?.[0]?.encarregado,
  );

  const parts = [numero, projetoDisplay, dataObraPart, circuito, encarregado].filter(Boolean);

  if (parts.length === 0) {
    return "folha_medicao.xlsx";
  }

  return `${parts.join(" - ")}.xlsx`;
};

const isMissingRelationError = (error) => {
  if (!error) {
    return false;
  }

  const message = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();
  const combined = [message, details].filter(Boolean).join(' ');

  return combined.includes('does not exist')
    || combined.includes('could not find the table')
    || combined.includes('relation ');
};

const shouldRetryWithNextKey = (error) => {
  if (!error) {
    return false;
  }

  if (isMissingRelationError(error)) {
    return true;
  }

  const message = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();

  return (message.includes('column') && message.includes('does not exist'))
    || (details.includes('column') && details.includes('does not exist'));
};

const reportSupabaseError = (label, error, context = {}) => {
  if (!error) {
    return;
  }

  const payload = {
    ...context,
    message: error.message || null,
    details: error.details || null,
    hint: error.hint || null,
    code: error.code || null,
  };

  console.warn(`[export] supabase error: ${label}`, payload);
};

const applyOrderBy = (query, orderBy) => {
  const orders = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return orders.reduce((acc, entry) => {
    if (!entry?.column) {
      return acc;
    }
    return acc.order(entry.column, { ascending: entry.ascending !== false });
  }, query);
};

const fetchTableByFolha = async (table, folhaId, {
  columns = '*',
  foreignKey = 'folha_id',
  orderBy,
} = {}) => {
  const keys = Array.isArray(foreignKey)
    ? foreignKey.filter(Boolean)
    : [foreignKey];

  let lastResult = [];

  for (const key of keys) {
    if (!key) {
      continue;
    }

    try {
      let query = supabase.from(table).select(columns).eq(key, folhaId);
      query = applyOrderBy(query, orderBy);

      const { data, error } = await query;
      if (error) {
        reportSupabaseError(`${table}.${key}`, error, { folhaId });
        if (shouldRetryWithNextKey(error)) {
          continue;
        }
        throw error;
      }

      if (Array.isArray(data) && data.length > 0) {
        return data;
      }

      lastResult = Array.isArray(data) ? data : [];

      if (!Array.isArray(data) || data.length === 0) {
        continue;
      }

      return lastResult;
    } catch (error) {
      reportSupabaseError(`${table}.${key}`, error, { folhaId });
      if (shouldRetryWithNextKey(error)) {
        continue;
      }
      throw error;
    }
  }

  return lastResult;
};

const fetchSupabaseFolha = async (folhaId) => {
  if (!hasSupabase()) {
    return null;
  }

  const relationConfigs = [
    {
      key: 'equipes',
      table: 'cen_fat_equipes',
      orderBy: { column: 'id' },
      foreignKey: 'folha_id',
    },
    {
      key: 'servicos',
      table: 'cen_fat_servicos_itens',
      orderBy: { column: 'id' },
      foreignKey: 'folha_id',
    },
    {
      key: 'equipamentos_instalados',
      table: 'cen_fat_equip_instalados',
      orderBy: { column: 'id' },
      foreignKey: 'folha_id',
    },
    {
      key: 'equipamentos_retirados',
      table: 'cen_fat_equip_retirados',
      orderBy: { column: 'id' },
      foreignKey: 'folha_id',
    },
    {
      key: 'materiais_instalados',
      table: 'cen_fat_mat_instalados',
      orderBy: { column: 'id' },
      foreignKey: 'folha_id',
    },
    {
      key: 'materiais_retirados',
      table: 'cen_fat_mat_retirados',
      orderBy: { column: 'id' },
      foreignKey: 'folha_id',
    },
  ];

  try {
    const { data: main, error } = await supabase
      .from('cen_fat_servicos')
      .select('*')
      .eq('id', folhaId)
      .maybeSingle();

    if (error) {
      reportSupabaseError('cen_fat_servicos.id', error, { folhaId });
      throw error;
    }

    if (!main) {
      return null;
    }

    const result = { ...main };

    for (const relation of relationConfigs) {
      const baseItems = await fetchTableByFolha(relation.table, folhaId, relation);
      result[relation.key] = Array.isArray(baseItems) ? baseItems : [];
    }

    return result;
  } catch (error) {
    reportSupabaseError('cen_fat_servicos', error, { folhaId });
    throw error;
  }
};

export const exportFolhaById = async (folhaId, { fallbackData } = {}) => {
  if (!folhaId) {
    throw new Error('A folha id is required for export');
  }

  const folhaFromSupabase = await fetchSupabaseFolha(folhaId);
  const folha = folhaFromSupabase || await FolhaMedicao.get(folhaId);
  const payload = folha || fallbackData;

  if (!payload) {
    throw new Error('Folha not found for export');
  }

  payload.contrato = payload.contrato || '4600010309';
  payload.export_title = buildExportTitle(payload);

  const fileName = buildExcelFileName(payload);
  await exportFolhaMedicao(payload, fileName);
};

export default {
  exportFolhaById,
  buildExcelFileName,
};
