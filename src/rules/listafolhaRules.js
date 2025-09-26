import { format, differenceInBusinessDays } from "date-fns";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { addBusinessDays, parseLocalDate } from "@/utils/listafolhaUtils";

export const validarEnvioFolha = (envioData) => {
  if (!envioData?.metodo_envio) {
    return {
      ok: false,
      message: "Por favor, selecione o método de envio.",
    };
  }

  return { ok: true };
};

export const getPrazoStatus = (folha) => {
  if (!folha || folha.status !== "pendente" || !folha.data_obra) {
    return "none";
  }

  const obraDate = parseLocalDate(folha.data_obra);
  if (!obraDate || Number.isNaN(obraDate.getTime())) {
    return "none";
  }

  const hoje = new Date();
  const dueDate = addBusinessDays(obraDate, 2);
  const diasRestantes = differenceInBusinessDays(dueDate, hoje);

  if (diasRestantes < 0) return "atrasado";
  if (diasRestantes === 0) return "vence_hoje";
  return "outros";
};

export const updateStatus = async (folha, novoStatus, extraData = {}) => {
  if (!folha?.id) {
    throw new Error("Folha inválida para atualização de status");
  }

  const historicoAnterior = Array.isArray(folha.status_historico)
    ? folha.status_historico
    : [];

  const payload = {
    status: novoStatus,
    status_historico: [
      ...historicoAnterior,
      {
        status: novoStatus,
        data: new Date().toISOString(),
        usuario: "sistema",
        observacoes: extraData.observacoes || "",
      },
    ],
    ...extraData,
  };

  await FolhaMedicao.update(folha.id, payload);
  return payload;
};

export const processarRetorno = async ({ folha, retornoData }) => {
  if (!folha?.id) {
    throw new Error("Folha inválida para processamento de retorno");
  }

  const dataRetorno = {
    data_retorno_distribuidora: retornoData.data_retorno,
  };

  if (retornoData.parecer === "aprovado") {
    await updateStatus(folha, "aprovado", {
      ...dataRetorno,
      observacoes: `Folha aprovada pela distribuidora em ${format(
        new Date(retornoData.data_retorno),
        "dd/MM/yyyy",
      )}`,
    });

    return { status: "aprovado" };
  }

  const reprovacaoDataOriginal = {
    status: "reprovado",
    ...dataRetorno,
    tipo_motivo_reprovacao: retornoData.tipo_motivo_reprovacao,
    motivo_reprovacao: retornoData.motivo_reprovacao,
  };

  await FolhaMedicao.update(folha.id, reprovacaoDataOriginal);

  const historicoCompleto = [
    ...(folha.status_historico || []),
    {
      status: "reprovado",
      data: new Date().toISOString(),
      usuario: "sistema",
      observacoes: `Reprovado em ${format(
        new Date(retornoData.data_retorno),
        "dd/MM/yyyy",
      )}: ${retornoData.tipo_motivo_reprovacao} - ${retornoData.motivo_reprovacao}`,
    },
    {
      status: "pendente",
      data: new Date().toISOString(),
      usuario: "sistema",
      observacoes: `Folha de correção criada automaticamente após reprovação da ${folha.numero_fm}`,
    },
  ];

  const numeroFMBase = folha.numero_fm?.includes("-v")
    ? folha.numero_fm.split("-v")[0]
    : folha.numero_fm;
  const novaVersao = (folha.versao || 1) + 1;
  const novoNumeroFM = `${numeroFMBase}-v${novaVersao}`;

  const novaFolhaData = {
    ...folha,
    numero_fm: novoNumeroFM,
    status: "pendente",
    versao: novaVersao,
    folha_original_id: folha.folha_original_id || folha.id,
    eh_correcao: true,
    status_historico: historicoCompleto,
    data_envio: null,
    metodo_envio: null,
    data_retorno_distribuidora: null,
    motivo_reprovacao: "",
    tipo_motivo_reprovacao: "",
    data_pagamento: null,
    numero_pagamento: "",
    motivo_cancelamento: null,
  };

  delete novaFolhaData.id;
  delete novaFolhaData.created_at;
  delete novaFolhaData.updated_at;

  const novaFolha = await FolhaMedicao.create(novaFolhaData);

  return {
    status: "reprovado",
    novaFolha,
  };
};
