const folhaQueries = {
  header: `
    SELECT
      f.id,
      f.numero_fm,
      f.data_obra,
      f.data_envio,
      f.data_retorno_distribuidora,
      f.data_pagamento,
      f.valor_total,
      f.projeto,
      f.endereco,
      f.tipo_servico,
      f.caracteristica,
      f.consultor,
      f.reserva,
      f.ntc,
      f.pi,
      f.ks,
      f.cf,
      f.zona,
      e.nome AS encarregado,
      t.nome AS tecnico_light,
      em.nome AS empreiteira
    FROM folhas f
    JOIN equipes_tecnicos t ON t.id = f.tecnico_light_id
    JOIN equipes_encarregados e ON e.id = f.encarregado_id
    JOIN empreiteiras em ON em.id = f.empreiteira_id
    WHERE f.id = $1
  `,
  equipes: `
    SELECT
      fe.nome_equipe,
      json_agg(et.nome ORDER BY et.nome) AS eletricistas
    FROM folhas_equipes fe
      JOIN equipes_tecnicos et ON et.equipe_id = fe.id
    WHERE fe.folha_id = $1
    GROUP BY fe.nome_equipe
    ORDER BY fe.nome_equipe
  `,
  servicos: `
    SELECT
      s.descricao,
      s.servico,
      s.unidade,
      s.dispendio,
      s.preco,
      s.quantidade,
      s.total_valor,
      s.observacao
    FROM folhas_servicos s
    WHERE s.folha_id = $1
    ORDER BY s.ordem
  `,
  equipamentosInstalados: `
    SELECT * FROM folhas_equipamentos_instalados WHERE folha_id = $1 ORDER BY ordem
  `,
  equipamentosRetirados: `
    SELECT * FROM folhas_equipamentos_retirados WHERE folha_id = $1 ORDER BY ordem
  `,
  materiaisInstalados: `
    SELECT * FROM folhas_materiais_instalados WHERE folha_id = $1 ORDER BY ordem
  `,
  materiaisRetirados: `
    SELECT * FROM folhas_materiais_retirados WHERE folha_id = $1 ORDER BY ordem
  `,
};

export const createFolhaTemplateRepository = ({ getClient }) => {
  if (typeof getClient !== "function") {
    throw new Error("getClient provider is required");
  }

  const fetchFolha = async (folhaId) => {
    const client = await getClient();
    try {
      const folha = await client.oneOrNone(folhaQueries.header, [folhaId]);
      if (!folha) {
        return null;
      }

      const [equipes, servicos, equipamentosInstalados, equipamentosRetirados, materiaisInstalados, materiaisRetirados] = await Promise.all([
        client.manyOrNone(folhaQueries.equipes, [folhaId]),
        client.manyOrNone(folhaQueries.servicos, [folhaId]),
        client.manyOrNone(folhaQueries.equipamentosInstalados, [folhaId]),
        client.manyOrNone(folhaQueries.equipamentosRetirados, [folhaId]),
        client.manyOrNone(folhaQueries.materiaisInstalados, [folhaId]),
        client.manyOrNone(folhaQueries.materiaisRetirados, [folhaId]),
      ]);

      return {
        ...folha,
        equipes: equipes || [],
        servicos: servicos || [],
        equipamentos_instalados: equipamentosInstalados || [],
        equipamentos_retirados: equipamentosRetirados || [],
        materiais_instalados: materiaisInstalados || [],
        materiais_retirados: materiaisRetirados || [],
      };
    } finally {
      if (typeof client.release === "function") {
        client.release();
      }
    }
  };

  return { fetchFolha };
};

export const pgClientProvider = ({ PoolClass, connectionString }) => {
  let pool;
  const getPool = () => {
    if (!pool) {
      if (!PoolClass) {
        throw new Error("PoolClass must be provided");
      }
      pool = new PoolClass({ connectionString });
    }
    return pool;
  };

  return {
    async getClient() {
      const instance = getPool();
      if (!instance) {
        throw new Error("PostgreSQL pool not initialized");
      }
      return instance.connect();
    },
  };
};

// Example wiring (not used by default):
// import { Pool } from "pg";
// const provider = pgClientProvider({ PoolClass: Pool, connectionString: process.env.DATABASE_URL });
// const repository = createFolhaTemplateRepository({ getClient: provider.getClient });
// const folha = await repository.fetchFolha(folhaId);
// await exportFolhaMedicao(folha, buildExcelFileName(folha));
