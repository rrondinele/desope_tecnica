import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, hasSupabase } from "@/services/supabaseClient";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Files, Mail, Share, AlertOctagon, AlertTriangle, Clock, ShieldCheck, CheckCircle } from "lucide-react";
import { format, differenceInBusinessDays } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { exportFolhaById } from "@/exportTemplate/exportFolhaService";
import {
  STATUS_CONFIG,
  ITEMS_PER_PAGE,
  CSV_HEADERS,
  METODO_ENVIO_OPTIONS,
  RETORNO_PARECER_OPTIONS,
  MOTIVO_REPROVACAO_TIPOS,
  EXPORT_FILE_NAME,
} from "@/config/listafolhaConfig";
import { updateStatus, processarRetorno, getPrazoStatus, validarEnvioFolha } from "@/rules/listafolhaRules";
import { ListaFolhaActions, ListaPagination, ListaStatusBadge, ListaHistoricoTimeline } from "@/components/folha";
import { addBusinessDays, parseLocalDate, formatCurrency, escapeCsvValue } from "@/utils/listafolhaUtils";
import { useAuth } from "@/context/AuthProvider";
import "@/styles/ListaFolhas.css";

const getPrazoInfo = (folha) => {
  if (!folha || folha.status !== "pendente" || !folha.data_obra) {
    return { className: "", icon: null, text: "" };
  }

  const obraDate = parseLocalDate(folha.data_obra);
  if (!obraDate || Number.isNaN(obraDate.getTime())) {
    return { className: "", icon: null, text: "" };
  }

  const hoje = new Date();
  const dueDate = addBusinessDays(obraDate, 2);
  const diasRestantes = differenceInBusinessDays(dueDate, hoje);

  if (diasRestantes < 0) {
    return { className: "bg-red-500", icon: AlertOctagon, text: "Atrasado" };
  }
  if (diasRestantes === 0) {
    return { className: "bg-orange-100", icon: AlertTriangle, text: "Vence Hoje" };
  }

  return {
    className: diasRestantes === 1 ? "bg-yellow-100" : "bg-blue-100",
    icon: Clock,
    text: diasRestantes === 1 ? "Falta 1 dia" : `Faltam ${diasRestantes} dias`,
  };
};

const NAO_VALIDACAO_MOTIVOS = [
  "Erro Atividade",
  "Erro Equipamento",
  "Erro Material",
  "Erro Equipe",
  "Erro Dados Cadastral",
];

const MOTIVO_PARA_STEP = {
  "Erro Dados Cadastral": 1,
  "Erro Equipe": 2,
  "Erro Atividade": 3,
  "Erro Equipamento": 4,
  "Erro Material": 5,
};

const STATUS_CANCELAMENTO_BY_ORIGEM = {
  Distribuidora: "cancelado_distribuidora",
  Empreitera: "cancelado_empreitera",
};

const extrairMotivoNaoValidacao = (folha) => {
  if (!folha) return null;
  const historico = Array.isArray(folha.status_historico) ? [...folha.status_historico].reverse() : [];
  const registro =
    historico.find((item) => item.status === "aguardando_correcao" && item.observacoes) ||
    historico.find((item) => item.status === "rascunho" && item.observacoes && item.observacoes.includes("não validada"));

  const texto = registro?.observacoes || folha.observacoes || "";
  if (!texto) return null;

  const matchMotivo = texto.match(/Motivo:\s*([^|]+)/i);
  if (matchMotivo) {
    return matchMotivo[1].trim();
  }

  const matchParentese = texto.match(/\(([^)]+)\)/);
  if (matchParentese) {
    return matchParentese[1].trim();
  }

  return null;
};

const obterStepParaMotivo = (motivo) => {
  if (!motivo) return 1;
  return MOTIVO_PARA_STEP[motivo] || 1;
};

const obterStatusAnteriorCancelamento = (folha) => {
  if (!folha) return null;
  const historico = Array.isArray(folha.status_historico) ? folha.status_historico : [];
  if (!historico.length) {
    return folha.status && folha.status !== "aguardando_cancelamento" ? folha.status : null;
  }

  const ultimaEntrada = historico[historico.length - 1];
  if (!ultimaEntrada || ultimaEntrada.status !== "aguardando_cancelamento") {
    return ultimaEntrada?.status || null;
  }

  for (let index = historico.length - 2; index >= 0; index -= 1) {
    const entrada = historico[index];
    if (entrada?.status && entrada.status !== "aguardando_cancelamento") {
      return entrada.status;
    }
  }

  return "pendente";
};

const ListaFolhas = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [folhas, setFolhas] = useState([]);
  const [filteredFolhas, setFilteredFolhas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [profilesMap, setProfilesMap] = useState({});
  const [exportingFolhaId, setExportingFolhaId] = useState(null);
  const [pendingExportFolha, setPendingExportFolha] = useState(null);
  const [exportError, setExportError] = useState(null);

  const [selectedFolha, setSelectedFolha] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [showRetornoModal, setShowRetornoModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false);
  const [showValidacaoModal, setShowValidacaoModal] = useState(false);
  const [showNaoValidacaoModal, setShowNaoValidacaoModal] = useState(false);
  const [showAutorizacaoCancelamentoModal, setShowAutorizacaoCancelamentoModal] = useState(false);

  const [envioData, setEnvioData] = useState({ data_envio: format(new Date(), "yyyy-MM-dd"), metodo_envio: "" });
  const [retornoData, setRetornoData] = useState({
    parecer: "aprovado",
    data_retorno: format(new Date(), "yyyy-MM-dd"),
    tipo_motivo_reprovacao: "",
    motivo_reprovacao: "",
  });
  const [pagamentoData, setPagamentoData] = useState({ numero_pagamento: "", data_pagamento: "" });
  const [cancelamentoData, setCancelamentoData] = useState({
    cancelado_por: "",
    motivo_cancelamento_tipo: "",
    motivo_cancelamento: "",
  });
  const [naoValidacaoData, setNaoValidacaoData] = useState({ motivo: "", observacoes: "" });
  const [autorizacaoCancelamentoData, setAutorizacaoCancelamentoData] = useState({ justificativa: "" });

  const canValidate = useMemo(() => profile?.role === 'supervisor', [profile]);
  const isBackoffice = useMemo(() => profile?.role === 'backoffice', [profile]);

  const loadFolhas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await FolhaMedicao.list("-created_date");
      setFolhas(data);

      if (hasSupabase()) {
        const ids = Array.from(new Set((data || []).map((f) => f.created_by_user_id).filter(Boolean)));
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, display_name, full_name, matricula")
            .in("id", ids);

          const map = {};
          (profs || []).forEach((profile) => {
            map[profile.id] = profile.display_name || profile.full_name || profile.matricula || "";
          });
          setProfilesMap(map);
        } else {
          setProfilesMap({});
        }
      }
    } catch (error) {
      console.error("Erro ao carregar folhas:", error);
    }
    setIsLoading(false);
  }, []);

  const filterFolhas = useCallback(() => {
    let filtered = folhas;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (folha) =>
          folha.numero_fm?.toLowerCase().includes(term) || folha.projeto?.toLowerCase().includes(term),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((folha) => folha.status === statusFilter);
    }

    setFilteredFolhas(filtered);
    setCurrentPage(1);
  }, [folhas, searchTerm, statusFilter]);

  useEffect(() => {
    loadFolhas();
  }, [loadFolhas]);

  useEffect(() => {
    filterFolhas();
  }, [filterFolhas]);

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredFolhas.length / ITEMS_PER_PAGE));
    setCurrentPage((prev) => Math.min(prev, lastPage));
  }, [filteredFolhas.length]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredFolhas.length / ITEMS_PER_PAGE)),
    [filteredFolhas.length],
  );

  const paginatedFolhas = useMemo(() => {
    if (!filteredFolhas.length) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFolhas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFolhas, currentPage]);

  const resumoStatus = useMemo(() => {
    const counters = {
      pendentes: 0,
      atrasadas: 0,
      vencemHoje: 0,
    };

    filteredFolhas.forEach((folha) => {
      if (folha.status === "pendente") {
        counters.pendentes += 1;
      }

      const prazoStatus = getPrazoStatus(folha);
      if (prazoStatus === "atrasado") counters.atrasadas += 1;
      if (prazoStatus === "vence_hoje") counters.vencemHoje += 1;
    });

    return counters;
  }, [filteredFolhas]);

  const selectedObraDate = useMemo(() => {
    return selectedFolha?.data_obra ? parseLocalDate(selectedFolha.data_obra) : null;
  }, [selectedFolha]);

  const handleValidarFolha = async () => {
    if (!selectedFolha || !canValidate) return;
    try {
      await updateStatus(selectedFolha, "pendente", {
        observacoes: "Folha validada pelo supervisor"
      }, profile);
      setShowValidacaoModal(false);
      setNaoValidacaoData({ motivo: "", observacoes: "" });
      setSelectedFolha(null);
      await loadFolhas();
    } catch (error) {
      console.error("Erro ao validar folha:", error);
      alert("Não foi possível validar a folha. Tente novamente.");
    }
  };

  const handleAbrirNaoValidacaoModal = () => {
    setShowValidacaoModal(false);
    setNaoValidacaoData({ motivo: "", observacoes: "" });
    setShowNaoValidacaoModal(true);
  };

  const handleNaoValidarFolha = async () => {
    if (!selectedFolha || !canValidate) return;
    if (!naoValidacaoData.motivo) {
      alert("Selecione o motivo de não validação.");
      return;
    }

    const observacao = (naoValidacaoData.observacoes || "").trim();
    const baseObservacao = `Folha não validada - Motivo: ${naoValidacaoData.motivo}`;
    const observacaoCompleta = observacao ? `${baseObservacao} | Obs: ${observacao}` : baseObservacao;

    try {
      await updateStatus(
        selectedFolha,
        "aguardando_correcao",
        {
          observacoes: observacaoCompleta,
        },
        profile
      );
      setShowNaoValidacaoModal(false);
      setNaoValidacaoData({ motivo: "", observacoes: "" });
      setSelectedFolha(null);
      await loadFolhas();
    } catch (error) {
      console.error("Erro ao registrar não validação da folha:", error);
      alert("Não foi possível registrar a não validação. Tente novamente.");
    }
  };

  const handleEditarFolha = (folha) => {
    if (!folha?.id) return;
    const motivo = extrairMotivoNaoValidacao(folha);
    const step = obterStepParaMotivo(motivo);
    const motivoParam = motivo ? `&motivo=${encodeURIComponent(motivo)}` : "";
    navigate(createPageUrl(`NovaFolha?editId=${folha.id}&step=${step}${motivoParam}`));
  };

  const handleEnviarFolha = async () => {
    const validation = validarEnvioFolha(envioData);
    if (!validation.ok) {
      alert(validation.message);
      return;
    }

    try {
      await updateStatus(selectedFolha, "aguardando_aprovacao", {
        data_envio: `${envioData.data_envio} ${new Date().toTimeString().slice(0, 5)}`,
        metodo_envio: envioData.metodo_envio,
        observacoes: `Enviado via ${envioData.metodo_envio} em ${format(
          new Date(envioData.data_envio),
          "dd/MM/yyyy",
        )}`,
      }, profile);

      setShowEnvioModal(false);
      setSelectedFolha(null);
      setEnvioData({ data_envio: format(new Date(), "yyyy-MM-dd"), metodo_envio: "" });
      await loadFolhas();
    } catch (error) {
      console.error("Erro ao enviar folha:", error);
      alert("Não foi possível enviar a folha. Tente novamente.");
    }
  };

  const handleProcessarRetorno = async () => {
    try {
      const resultado = await processarRetorno({ folha: selectedFolha, retornoData, profile });

      setShowRetornoModal(false);
      setSelectedFolha(null);
      setRetornoData({
        parecer: "aprovado",
        data_retorno: format(new Date(), "yyyy-MM-dd"),
        tipo_motivo_reprovacao: "",
        motivo_reprovacao: "",
      });

      await loadFolhas();

      if (resultado.status === "reprovado" && resultado.novaFolha?.id) {
        navigate(createPageUrl(`NovaFolha?editId=${resultado.novaFolha.id}`));
      }
    } catch (error) {
      console.error("Erro ao processar retorno:", error);
      alert("Não foi possível processar o retorno. Tente novamente.");
    }
  };

  const handleRegistrarPagamento = async () => {
    try {
      await updateStatus(selectedFolha, "pago", {
        numero_pagamento: pagamentoData.numero_pagamento,
        data_pagamento: pagamentoData.data_pagamento,
        observacoes: `Pagamento registrado - NF: ${pagamentoData.numero_pagamento}`,
      }, profile);

      setShowPagamentoModal(false);
      setSelectedFolha(null);
      await loadFolhas();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      alert("Não foi possível registrar o pagamento. Tente novamente.");
    }
  };

  const handleCancelarFolha = async () => {
    if (!cancelamentoData.cancelado_por) {
      alert("Por favor, selecione quem está cancelando.");
      return;
    }

    if (!cancelamentoData.motivo_cancelamento_tipo) {
      alert("Por favor, selecione o motivo do cancelamento.");
      return;
    }

    if (!cancelamentoData.motivo_cancelamento) {
      alert("Por favor, informe a justificativa do cancelamento.");
      return;
    }

    try {
      const solicitacaoPendente = isBackoffice;
      const statusFinalCancelamento =
        STATUS_CANCELAMENTO_BY_ORIGEM[cancelamentoData.cancelado_por] || "cancelado_distribuidora";
      const novoStatus = solicitacaoPendente ? "aguardando_cancelamento" : statusFinalCancelamento;
      const detalhesCancelamento = `Cancelado por: ${cancelamentoData.cancelado_por} | Motivo: ${cancelamentoData.motivo_cancelamento_tipo} | Justificativa: ${cancelamentoData.motivo_cancelamento}`;
      const mensagemObservacao = solicitacaoPendente
        ? `Cancelamento solicitado. ${detalhesCancelamento}`
        : `Folha cancelada. ${detalhesCancelamento}`;

      await updateStatus(selectedFolha, novoStatus, {
        motivo_cancelamento: cancelamentoData.motivo_cancelamento,
        cancelado_por: cancelamentoData.cancelado_por,
        motivo_cancelamento_tipo: cancelamentoData.motivo_cancelamento_tipo,
        observacoes: mensagemObservacao,
      }, profile);

      setShowCancelamentoModal(false);
      setSelectedFolha(null);
      setCancelamentoData({
        cancelado_por: "",
        motivo_cancelamento_tipo: "",
        motivo_cancelamento: "",
      });
      await loadFolhas();

      if (solicitacaoPendente) {
        alert("Solicitacao de cancelamento registrada e aguardando aprovacão.");
      }
    } catch (error) {
      console.error("Erro ao cancelar folha:", error);
      alert("Nao foi possivel cancelar a folha. Tente novamente.");
    }
  };

  const handleAbrirAutorizacaoCancelamento = (folha) => {
    setSelectedFolha(folha);
    setAutorizacaoCancelamentoData({ justificativa: "" });
    setShowAutorizacaoCancelamentoModal(true);
  };

  const handlePermitirCancelamento = async () => {
    if (!selectedFolha) return;
    const justificativaAutorizacao = autorizacaoCancelamentoData.justificativa.trim();
    if (!justificativaAutorizacao) {
      alert("Por favor, informe a justificativa para autorizar o cancelamento.");
      return;
    }

    const canceladoPor = selectedFolha.cancelado_por || "Distribuidora";
    const statusFinalCancelamento =
      STATUS_CANCELAMENTO_BY_ORIGEM[canceladoPor] || "cancelado_distribuidora";
    const motivoTipo = selectedFolha.motivo_cancelamento_tipo || "Nao informado";
    const justificativaSolicitacao = selectedFolha.motivo_cancelamento || "Nao informado";
    const detalhesCancelamento = `Cancelado por: ${canceladoPor} | Motivo: ${motivoTipo} | Justificativa: ${justificativaSolicitacao}`;
    const observacao = `Cancelamento aprovado. ${detalhesCancelamento}. Justificativa da autorização: ${justificativaAutorizacao}`;

    try {
      await updateStatus(selectedFolha, statusFinalCancelamento, {
        motivo_cancelamento: selectedFolha.motivo_cancelamento,
        cancelado_por: canceladoPor,
        motivo_cancelamento_tipo: selectedFolha.motivo_cancelamento_tipo,
        observacoes: observacao,
      }, profile);

      setShowAutorizacaoCancelamentoModal(false);
      setAutorizacaoCancelamentoData({ justificativa: "" });
      setSelectedFolha(null);
      await loadFolhas();
      alert("Cancelamento aprovado com sucesso.");
    } catch (error) {
      console.error("Erro ao aprovar cancelamento:", error);
      alert("Nao foi possivel aprovar o cancelamento. Tente novamente.");
    }
  };

  const handleNegarCancelamento = async () => {
    if (!selectedFolha) return;
    const justificativaNegativa = autorizacaoCancelamentoData.justificativa.trim();
    if (!justificativaNegativa) {
      alert("Por favor, informe a justificativa para negar o cancelamento.");
      return;
    }

    const statusAnterior = obterStatusAnteriorCancelamento(selectedFolha);
    if (!statusAnterior) {
      alert("Nao foi possivel identificar o status anterior para reverter.");
      return;
    }

    const canceladoPor = selectedFolha.cancelado_por || "Nao informado";
    const motivoTipo = selectedFolha.motivo_cancelamento_tipo || "Nao informado";
    const justificativaSolicitacao = selectedFolha.motivo_cancelamento || "Nao informado";
    const detalhesCancelamento = `Cancelado por: ${canceladoPor} | Motivo: ${motivoTipo} | Justificativa: ${justificativaSolicitacao}`;
    const observacao = `Solicitacao de cancelamento negada. ${detalhesCancelamento}. Justificativa da negativa: ${justificativaNegativa}`;

    try {
      await updateStatus(selectedFolha, statusAnterior, {
        motivo_cancelamento: null,
        cancelado_por: null,
        motivo_cancelamento_tipo: null,
        observacoes: observacao,
      }, profile);

      setShowAutorizacaoCancelamentoModal(false);
      setAutorizacaoCancelamentoData({ justificativa: "" });
      setSelectedFolha(null);
      await loadFolhas();
      alert("Cancelamento negado e status original restaurado.");
    } catch (error) {
      console.error("Erro ao negar cancelamento:", error);
      alert("Nao foi possivel negar o cancelamento. Tente novamente.");
    }
  };

  const handleExportToTemplate = (folha) => {
    if (!folha?.id) {
      alert("Registro inválido para exportação.");
      return;
    }

    setExportError(null);
    setPendingExportFolha(folha);
  };

  useEffect(() => {
    if (!pendingExportFolha) return;

    let isCancelled = false;

    const runExport = async () => {
      try {
        setExportingFolhaId(pendingExportFolha.id);
        await exportFolhaById(pendingExportFolha.id, { fallbackData: pendingExportFolha });
      } catch (error) {
        console.error("Erro ao exportar folha:", error);
        if (!isCancelled) {
          setExportError(error?.message || "Não foi possível exportar esta folha.");
        }
      } finally {
        if (!isCancelled) {
          setExportingFolhaId(null);
          setPendingExportFolha(null);
        }
      }
    };

    runExport();

    return () => {
      isCancelled = true;
    };
  }, [pendingExportFolha]);

  const handleExportToCSV = () => {
    if (filteredFolhas.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    const rows = filteredFolhas.map((folha) => {
      const values = [
        folha.numero_fm || "",
        folha.versao || "1",
        folha.projeto || "",
        folha.municipio || "",
        folha.data_obra ? format(new Date(folha.data_obra), "dd/MM/yyyy") : "",
        STATUS_CONFIG[folha.status]?.label || folha.status,
        folha.data_envio ? format(new Date(folha.data_envio), "dd/MM/yyyy") : "",
        folha.metodo_envio || "",
        folha.data_retorno_distribuidora ? format(new Date(folha.data_retorno_distribuidora), "dd/MM/yyyy") : "",
        folha.tipo_motivo_reprovacao || "",
        folha.motivo_reprovacao || "",
        formatCurrency(folha.valor_total),
        folha.data_pagamento ? format(new Date(folha.data_pagamento), "dd/MM/yyyy") : "",
        folha.numero_pagamento || "",
        folha.motivo_cancelamento || "",
      ];

      return values.map(escapeCsvValue).join(";");
    });

    const csvContent = "\uFEFF" + CSV_HEADERS.map(escapeCsvValue).join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", EXPORT_FILE_NAME);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="lista-folhas-page">
      <div className="lista-folhas-container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lista-folhas-header"
        >
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Lista de Folhas de Medição</h1>
        </motion.div>

        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="flex flex-col items-stretch gap-3 p-3 md:flex-row md:items-center md:gap-4">
            <Input
              placeholder="Buscar por Número FM, Projeto..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-w-0 flex-1"
            />

            <div className="w-full shrink-0 md:w-[420px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full shrink-0 md:w-[420px]">
              <Button
                onClick={handleExportToCSV}
                variant="outline"
                disabled={filteredFolhas.length === 0}
                className="w-full"
              >
                Exportar para Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {exportError && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {exportError}
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-4">
            <div className="mb-4 flex items-center justify-between px-2">
              <p className="text-sm text-gray-600">
                {filteredFolhas.length} folha(s) encontrada(s)
                {searchTerm && ` para "${searchTerm}"`}
              </p>
              <div className="lista-folhas-summary">
                <span className="lista-folhas-summary__item">
                  <span className="lista-folhas-summary__dot bg-yellow-500" />
                  Pendentes totais: {resumoStatus.pendentes}
                </span>
                <span className="lista-folhas-summary__item">
                  <span className="lista-folhas-summary__dot bg-red-500" />
                  Atrasadas: {resumoStatus.atrasadas}
                </span>
                <span className="lista-folhas-summary__item">
                  <span className="lista-folhas-summary__dot bg-orange-500" />
                  Vencem Hoje: {resumoStatus.vencemHoje}
                </span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Número FM</TableHead>
                  <TableHead className="w-64">Projeto</TableHead>
                  <TableHead className="w-64">Tipo Processo</TableHead>
                  <TableHead className="w-64">Município</TableHead>
                  <TableHead className="w-64">Data Obra</TableHead>
                  <TableHead className="w-64">Data Envio</TableHead>
                  <TableHead className="w-64">Data Retorno</TableHead>
                  <TableHead className="w-80">Status</TableHead>
                  <TableHead className="w-64">Prazo</TableHead>
                  <TableHead className="w-64">Criado por</TableHead>
                  <TableHead className="w-64">Valor</TableHead>
                  <TableHead className="w-64">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedFolhas.map((folha) => {
                    const prazoInfo = getPrazoInfo(folha);
                    const PrazoIcon = prazoInfo.icon;
                    const isAguardandoCorrecao = folha.status === "aguardando_correcao";
                    const rowClassName = [
                      prazoInfo.className,
                      isAguardandoCorrecao ? "bg-red-100 hover:bg-red-100" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <TableRow key={folha.id} className={rowClassName}>
                        <TableCell className="font-mono font-semibold">{folha.numero_fm}</TableCell>
                        <TableCell>{folha.projeto}</TableCell>
                        <TableCell>{folha.tipo_processo}</TableCell>
                        <TableCell>{folha.municipio}</TableCell>
                        <TableCell>
                          {folha.data_obra ? format(parseLocalDate(folha.data_obra), "dd/MM/yy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {folha.data_envio ? format(parseLocalDate(folha.data_envio), "dd/MM/yy") : "-"}
                            </span>
                            {folha.metodo_envio && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                {folha.metodo_envio === "E-mail" ? (
                                  <Mail className="h-3 w-3" />
                                ) : (
                                  <Share className="h-3 w-3" />
                                )}
                                {folha.metodo_envio}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {folha.data_retorno_distribuidora
                            ? format(parseLocalDate(folha.data_retorno_distribuidora), "dd/MM/yy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <ListaStatusBadge status={folha.status} />
                        </TableCell>
                        <TableCell>
                          {PrazoIcon && (
                            <div className="flex items-center gap-1 text-sm">
                              <PrazoIcon className="h-4 w-4" />
                              {prazoInfo.text}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{profilesMap[folha.created_by_user_id] || folha.created_by_name || "-"}</TableCell>
                        <TableCell className="text-left font-semibold">
                          {formatCurrency(folha.valor_total)}
                        </TableCell>
                        <TableCell>
                          <ListaFolhaActions
                            folha={folha}
                            canValidate={canValidate}
                            isBackoffice={isBackoffice}
                            isExporting={exportingFolhaId === folha.id}
                            onExport={handleExportToTemplate}
                            onView={(item) => {
                              setSelectedFolha(item);
                              setShowDetailsModal(true);
                            }}
                            onValidar={(item) => {
                              setSelectedFolha(item);
                              setShowValidacaoModal(true);
                            }}
                            onEnviar={(item) => {
                              setSelectedFolha(item);
                              setEnvioData({ data_envio: format(new Date(), "yyyy-MM-dd"), metodo_envio: "" });
                              setShowEnvioModal(true);
                            }}
                            onRetorno={(item) => {
                              setSelectedFolha(item);
                              setRetornoData({
                                parecer: "aprovado",
                                data_retorno: format(new Date(), "yyyy-MM-dd"),
                                tipo_motivo_reprovacao: "",
                                motivo_reprovacao: "",
                              });
                              setShowRetornoModal(true);
                            }}
                            onPagamento={(item) => {
                              setSelectedFolha(item);
                              setPagamentoData({ numero_pagamento: "", data_pagamento: "" });
                              setShowPagamentoModal(true);
                            }}
                            onEdit={handleEditarFolha}
                            onCancelar={(item) => {
                              setSelectedFolha(item);
                              setCancelamentoData({
                                cancelado_por: "",
                                motivo_cancelamento_tipo: "",
                                motivo_cancelamento: "",
                              });
                              setShowCancelamentoModal(true);
                            }}
                            onAutorizarCancelamento={handleAbrirAutorizacaoCancelamento}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <ListaPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="mt-4"
            />
          </CardContent>
        </Card>
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Files className="h-5 w-5 text-blue-600" />
                Detalhes da Folha {selectedFolha?.numero_fm}
              </DialogTitle>
              <DialogDescription>Visualize as informações completas da folha selecionada.</DialogDescription>
            </DialogHeader>

            {selectedFolha && (
              <div className="space-y-6 p-1">
                <Card className="border-slate-200 bg-slate-50">
                  <CardHeader>
                    <CardTitle className="text-base">Dados Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <strong>Empreiteira:</strong> {selectedFolha.empreiteira}
                    </div>
                    <div>
                      <strong>Técnico Light:</strong> {selectedFolha.tecnico_light || "N/A"}
                    </div>
                    <div>
                      <strong>Município:</strong> {selectedFolha.municipio}
                    </div>
                    <div>
                      <strong>Projeto:</strong> {selectedFolha.projeto}
                    </div>
                    <div>
                      <strong>Data da Obra:</strong>{" "}
                      {selectedObraDate && !Number.isNaN(selectedObraDate.getTime())
                        ? format(selectedObraDate, "dd/MM/yyyy")
                        : "N/A"}
                    </div>
                    <div>
                      <strong>Status Atual:</strong> <ListaStatusBadge status={selectedFolha.status} />
                    </div>
                    <div>
                      <strong>Criado por:</strong>{" "}
                      {selectedFolha.created_by_matricula && selectedFolha.created_by_name
                        ? `${selectedFolha.created_by_matricula} - ${selectedFolha.created_by_name}`
                        : selectedFolha.created_by_name || "-"}
                    </div>
                  </CardContent>
                </Card>

                {selectedFolha.valor_total !== undefined && selectedFolha.valor_total !== null && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-base text-green-800">Informações Financeiras</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(selectedFolha.valor_total)}
                      </div>
                      {selectedFolha.numero_pagamento && (
                        <div className="mt-1 text-sm text-green-600">
                          NF: {selectedFolha.numero_pagamento}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedFolha.status_historico && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ListaHistoricoTimeline historico={selectedFolha.status_historico} />
                    </CardContent>
                  </Card>
                )}

                {selectedFolha.equipes?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Equipes ({selectedFolha.equipes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedFolha.equipes.map((equipe, index) => (
                        <div key={index} className="rounded bg-blue-50 p-2 text-sm">
                          <strong>Equipe:</strong> {equipe.codigo_equipe} - <strong>Enc:</strong> {equipe.encarregado}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {selectedFolha.servicos?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Serviços ({selectedFolha.servicos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-40 space-y-2 overflow-y-auto">
                      {selectedFolha.servicos.map((servico, index) => (
                        <div key={index} className="flex justify-between rounded bg-green-50 p-2 text-sm">
                          <span>{servico.descricao}</span>
                          <span>Qtd: {servico.quantidade}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={showAutorizacaoCancelamentoModal}
          onOpenChange={(open) => {
            setShowAutorizacaoCancelamentoModal(open);
            if (!open) {
              setAutorizacaoCancelamentoData({ justificativa: "" });
              setSelectedFolha(null);
            }
          }}
        >
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-5 h-5" />
                Autorizar cancelamento
              </DialogTitle>
              <DialogDescription>
                Informe a justificativa para autorizar ou negar o cancelamento da folha <strong>{selectedFolha?.numero_fm}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Justificativa *</label>
                <Textarea
                  placeholder="Descreva a justificativa para seguir com a decisao"
                  value={autorizacaoCancelamentoData.justificativa}
                  onChange={(event) =>
                    setAutorizacaoCancelamentoData({ justificativa: event.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAutorizacaoCancelamentoModal(false)}>
                Fechar
              </Button>
              <Button
                variant="outline"
                onClick={handleNegarCancelamento}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Negar Cancelamento
              </Button>
              <Button onClick={handlePermitirCancelamento} className="bg-emerald-600 hover:bg-emerald-700">
                Permitir Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showEnvioModal} onOpenChange={setShowEnvioModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Folha para Aprovação</DialogTitle>
              <DialogDescription>
                Configure os detalhes do envio da folha {selectedFolha?.numero_fm}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Data de Envio</label>
                <Input
                  type="date"
                  value={envioData.data_envio}
                  onChange={(event) => setEnvioData({ ...envioData, data_envio: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Método de Envio *</label>
                <Select
                  value={envioData.metodo_envio}
                  onValueChange={(value) => setEnvioData({ ...envioData, metodo_envio: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {METODO_ENVIO_OPTIONS.map((option) => {
                      const Icon = option.value === "E-mail" ? Mail : Share;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEnvioModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEnviarFolha} className="bg-green-600 hover:bg-green-700">
                Confirmar Envio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRetornoModal} onOpenChange={setShowRetornoModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Processar Retorno da Distribuidora</DialogTitle>
              <DialogDescription>
                Registre o parecer da distribuidora para a folha {selectedFolha?.numero_fm}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Data do Retorno *</label>
                <Input
                  type="date"
                  value={retornoData.data_retorno}
                  onChange={(event) => setRetornoData({ ...retornoData, data_retorno: event.target.value })}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Parecer da Distribuidora *</label>
                <Select
                  value={retornoData.parecer}
                  onValueChange={(value) => setRetornoData({ ...retornoData, parecer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETORNO_PARECER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {retornoData.parecer === "reprovado" && (
                <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Tipo do Motivo *</label>
                    <Select
                      value={retornoData.tipo_motivo_reprovacao}
                      onValueChange={(value) => setRetornoData({ ...retornoData, tipo_motivo_reprovacao: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo do erro" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVO_REPROVACAO_TIPOS.map((motivo) => (
                          <SelectItem key={motivo} value={motivo}>
                            {motivo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Motivo Detalhado *</label>
                    <Textarea
                      placeholder="Detalhe o motivo da reprovação conforme retorno da distribuidora..."
                      value={retornoData.motivo_reprovacao}
                      onChange={(event) =>
                        setRetornoData({ ...retornoData, motivo_reprovacao: event.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    <strong>Atenção:</strong> Uma nova folha de correção (versão {(selectedFolha?.versao || 1) + 1}) será
                    criada automaticamente com status "Pendente" para reenvio.
                  </div>
                </div>
              )}

              {retornoData.parecer === "aprovado" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <strong>Sucesso:</strong> A folha será marcada como aprovada e ficará disponível para registro de pagamento.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRetornoModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleProcessarRetorno}
                className={
                  retornoData.parecer === "aprovado"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }
              >
                {retornoData.parecer === "aprovado" ? "Confirmar Aprovação" : "Confirmar Reprovação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Pagamento</DialogTitle>
              <DialogDescription>Informe os dados de pagamento da folha {selectedFolha?.numero_fm}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Número da Nota Fiscal"
                value={pagamentoData.numero_pagamento}
                onChange={(event) => setPagamentoData({ ...pagamentoData, numero_pagamento: event.target.value })}
              />
              <Input
                type="date"
                value={pagamentoData.data_pagamento}
                onChange={(event) => setPagamentoData({ ...pagamentoData, data_pagamento: event.target.value })}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleRegistrarPagamento}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCancelamentoModal} onOpenChange={setShowCancelamentoModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                Cancelar Folha de Medição
              </DialogTitle>
              <DialogDescription>
                Justifique o motivo para cancelar a folha {selectedFolha?.numero_fm}. Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Cancelado por *</label>
                <Select
                  value={cancelamentoData.cancelado_por}
                  onValueChange={(value) =>
                    setCancelamentoData((prev) => ({
                      ...prev,
                      cancelado_por: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Distribuidora">Distribuidora</SelectItem>
                    <SelectItem value="Empreitera">Empreitera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Motivo *</label>
                <Select
                  value={cancelamentoData.motivo_cancelamento_tipo}
                  onValueChange={(value) =>
                    setCancelamentoData((prev) => ({
                      ...prev,
                      motivo_cancelamento_tipo: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interno">Interno</SelectItem>
                    <SelectItem value="Externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Justificativa do Cancelamento *</label>
                <Textarea
                  placeholder="Ex: Erro de digitação, solicitação da distribuidora, etc."
                  value={cancelamentoData.motivo_cancelamento}
                  onChange={(event) =>
                    setCancelamentoData((prev) => ({
                      ...prev,
                      motivo_cancelamento: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelamentoModal(false)}>
                Voltar
              </Button>
              <Button onClick={handleCancelarFolha} className="bg-red-600 hover:bg-red-700">
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showValidacaoModal} onOpenChange={setShowValidacaoModal}>
            <DialogContent className="max-w-md sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                        Confirmar Validação
                    </DialogTitle>
                    <DialogDescription>
                        Você tem certeza que deseja validar a folha <strong>{selectedFolha?.numero_fm}</strong>?
                        A folha ficará disponível para o setor administrativo prosseguir com o envio.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setShowValidacaoModal(false)}>Cancelar</Button>
                    <Button
                        variant="outline"
                        onClick={handleAbrirNaoValidacaoModal}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                        Não validar
                    </Button>
                    <Button onClick={handleValidarFolha} className="bg-emerald-600 hover:bg-emerald-700">
                        Sim, Validar Folha
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog
          open={showNaoValidacaoModal}
          onOpenChange={(open) => {
            setShowNaoValidacaoModal(open);
            if (!open) {
              setNaoValidacaoData({ motivo: "", observacoes: "" });
            }
          }}
        >
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertOctagon className="w-5 h-5" />
                Registrar não validação
              </DialogTitle>
              <DialogDescription>
                Informe o motivo para não validar a folha <strong>{selectedFolha?.numero_fm}</strong> e adicione uma observação, se necessário.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Motivo *</label>
                <Select
                  value={naoValidacaoData.motivo}
                  onValueChange={(value) => setNaoValidacaoData((prev) => ({ ...prev, motivo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {NAO_VALIDACAO_MOTIVOS.map((motivo) => (
                      <SelectItem key={motivo} value={motivo}>
                        {motivo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Obs</label>
                <Textarea
                  placeholder="Compartilhe detalhes adicionais"
                  value={naoValidacaoData.observacoes}
                  onChange={(event) =>
                    setNaoValidacaoData((prev) => ({ ...prev, observacoes: event.target.value }))
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNaoValidacaoModal(false);
                  setShowValidacaoModal(true);
                }}
              >
                Voltar
              </Button>
              <Button onClick={handleNaoValidarFolha} className="bg-red-600 hover:bg-red-700">
                Confirmar Não Validação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default ListaFolhas;
