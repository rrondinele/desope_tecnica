import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { format } from "date-fns";
import { supabase, hasSupabase } from "@/services/supabaseClient";
import { exportFolhaMedicao } from "./exportFolhaMedicao";

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

const buildExportTitle = (folha) => {
  const numero = sanitizeFilePart(folha?.numero_fm) || 'SEM_NUMERO';
  const principal = sanitizeFilePart(
    folha?.projeto || folha?.ordem_manutencao || folha?.ordem_servico,
  ) || 'SEM_PROJETO';

  let dataObraSegment = '';
  const dataObra = folha?.data_obra;
  if (dataObra) {
    const parsed = dataObra instanceof Date ? dataObra : new Date(dataObra);
    if (!Number.isNaN(parsed.getTime())) {
      dataObraSegment = format(parsed, 'dd-MM-yy');
    }
  }

  const circuito = sanitizeFilePart(folha?.circuito);
  const encarregadoPrincipal = sanitizeFilePart(
    folha?.encarregado || folha?.equipes?.[0]?.encarregado,
  );

  let circuitoEnc = '';
  if (circuito && encarregadoPrincipal) {
    circuitoEnc = `${circuito}-${encarregadoPrincipal}`;
  } else if (circuito) {
    circuitoEnc = circuito;
  } else if (encarregadoPrincipal) {
    circuitoEnc = encarregadoPrincipal;
  }

  const parts = [`FOLHA DE MEDIÇÃO ${numero}`, `- ${principal}`];
  if (dataObraSegment) {
    parts.push(`de ${dataObraSegment}`);
  }
  if (circuitoEnc) {
    parts.push(circuitoEnc);
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

export const buildExcelFileName = (folha) => {
  const title = buildExportTitle(folha) || 'folha_medicao';
  return `${title}.xlsx`;
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

  payload.export_title = buildExportTitle(payload);

  const fileName = buildExcelFileName(payload);
  await exportFolhaMedicao(payload, fileName);
};

export default {
  exportFolhaById,
  buildExcelFileName,
};