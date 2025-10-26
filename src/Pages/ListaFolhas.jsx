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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Files, Mail, Share, AlertOctagon, AlertTriangle, Clock, ShieldCheck, CheckCircle, LayoutGrid, List, 
  FileDown, Eye, Edit, Send, DollarSign, XCircle, LogOut, TrendingUp, TrendingDown, PackagePlus, PackageMinus,
  ChevronsUpDown, ArrowUp, ArrowDown
} from "lucide-react";
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
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
    return { className: "text-red-500", icon: AlertOctagon, text: "Atrasado" };
  }
  if (diasRestantes === 0) {
    return { className: "text-orange-500", icon: AlertTriangle, text: "Vence Hoje" };
  }

  return {
    className: diasRestantes === 1 ? "text-yellow-500" : "text-blue-500",
    icon: Clock,
    text: diasRestantes === 1 ? "Falta 1 dia" : `Faltam ${diasRestantes} dias`,
  };
};

const getPrazoSortValue = (folha) => {
  if (!folha || folha.status !== "pendente" || !folha.data_obra) {
    return Number.POSITIVE_INFINITY;
  }
  const obraDate = parseLocalDate(folha.data_obra);
  if (!obraDate || Number.isNaN(obraDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  const hoje = new Date();
  const dueDate = addBusinessDays(obraDate, 2);
  return differenceInBusinessDays(dueDate, hoje);
};

const NAO_VALIDACAO_MOTIVOS = [
  "Erro Atividades",
  "Erro Equipamentos",
  "Erro Materiais",
  "Erro Equipes",
  "Erro Dados Cadastrais",
];

const MOTIVO_PARA_STEP = {
  "Erro Dados Cadastrais": 1,
  "Erro Equipes": 2,
  "Erro Atividades": 3,
  "Erro Equipamentos": 4,
  "Erro Materiais": 5,
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

// Componente KanbanCard
const KanbanCard = React.memo(({ folha, index, onActionClick, prazoInfo, isDraggable = false }) => {
  const StatusIcon = STATUS_CONFIG[folha.status]?.icon;
  
  return (
    <Draggable draggableId={folha.id} index={index} isDragDisabled={!isDraggable}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(isDraggable ? provided.dragHandleProps : {})}
          className={`p-3 bg-white rounded-lg shadow-sm border mb-3 ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
          } hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default select-text'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="font-mono font-semibold text-sm text-gray-800">{folha.numero_fm}</span>
            <Badge variant="secondary" className={`${STATUS_CONFIG[folha.status]?.color} font-medium text-xs`}>
              {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
              {STATUS_CONFIG[folha.status]?.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{folha.projeto}</p>
          <div className="text-xs text-gray-500 mt-1">{folha.municipio}</div>
          <div className="flex justify-between items-end mt-2">
            <div className="text-sm font-semibold text-green-600">
              {formatCurrency(folha.valor_total)}
            </div>
            <div className="flex gap-1 items-center">
              {prazoInfo && prazoInfo.icon && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <prazoInfo.icon className={`w-4 h-4 ${prazoInfo.className}`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{prazoInfo.text}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 hover:bg-blue-50 transition-colors"
                onClick={() => onActionClick(folha, 'details')}
              >
                <Eye className="w-4 h-4 text-blue-600" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [exportingFolhaId, setExportingFolhaId] = useState(null);
  const [pendingExportFolha, setPendingExportFolha] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [viewMode, setViewMode] = useState("list");

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
  const isVisitor = useMemo(() => profile?.role === 'visitante', [profile]);
  const isAdmin = useMemo(() => profile?.role === 'admin', [profile]);

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

  const sortedFolhas = useMemo(() => {
    if (!filteredFolhas.length || !sortConfig.key) return filteredFolhas;
    const sorted = [...filteredFolhas];
    const { key, direction } = sortConfig;

    const normalize = (folha) => {
      switch (key) {
        case "numero_fm":
          return folha.numero_fm || "";
        case "projeto":
          return folha.projeto || "";
        case "data_obra":
          return folha.data_obra ? new Date(folha.data_obra).getTime() : 0;
        case "ordem_servico":
          return folha.ordem_servico || "";
        case "tipo_processo":
          return folha.tipo_processo || "";
        case "municipio":
          return folha.municipio || "";
        case "data_envio":
          return folha.data_envio ? new Date(folha.data_envio).getTime() : 0;
        case "data_retorno_distribuidora":
          return folha.data_retorno_distribuidora
            ? new Date(folha.data_retorno_distribuidora).getTime()
            : 0;
        case "status":
          return folha.status || "";
        case "valor_total":
          return Number(folha.valor_total) || 0;
        case "prazo":
          return getPrazoSortValue(folha);
        case "criado_por":
          return folha.created_by_name || profilesMap[folha.created_by_user_id] || "";
        default:
          return folha[key] || "";
      }
    };

    sorted.sort((a, b) => {
      const aValue = normalize(a);
      const bValue = normalize(b);

      if (aValue === bValue) return 0;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return direction === "asc" ? -1 : 1;
    });

    return sorted;
  }, [filteredFolhas, sortConfig, profilesMap]);

  const paginatedFolhas = useMemo(() => {
    if (!sortedFolhas.length) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedFolhas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedFolhas, currentPage]);

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

  const historicoCompleto = useMemo(() => {
    if (!selectedFolha) return [];

    const historicoBruto = Array.isArray(selectedFolha.status_historico)
      ? selectedFolha.status_historico.filter((item) => item && item.status)
      : [];

    const getDataValor = (item) => {
      if (!item?.data) return Number.POSITIVE_INFINITY;
      const parsed = new Date(item.data).getTime();
      return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
    };

    const historicoOrdenado = [...historicoBruto].sort((a, b) => getDataValor(a) - getDataValor(b));

    const createdDate =
      selectedFolha.created_date ||
      selectedFolha.created_at ||
      selectedFolha.createdAt ||
      selectedFolha.createdDate ||
      null;

    const creatorIdentifier = (() => {
      if (selectedFolha.created_by_matricula && selectedFolha.created_by_name) {
        return `${selectedFolha.created_by_matricula} - ${selectedFolha.created_by_name}`;
      }
      if (selectedFolha.created_by_name) {
        return selectedFolha.created_by_name;
      }
      if (selectedFolha.created_by_matricula) {
        return selectedFolha.created_by_matricula;
      }
      if (selectedFolha.created_by_user_id) {
        return selectedFolha.created_by_user_id;
      }
      return null;
    })();

    if (historicoOrdenado.length > 0 && historicoOrdenado[0]?.status === "rascunho") {
      return historicoOrdenado;
    }

    const entradaInicial = {
      status: "rascunho",
      data: createdDate || historicoOrdenado[0]?.data || null,
      usuario: creatorIdentifier || historicoOrdenado[0]?.usuario || undefined,
      observacoes: "Folha de Medição criada",
    };

    return [entradaInicial, ...historicoOrdenado];
  }, [selectedFolha]);

  const equipamentosInstalados = selectedFolha?.equipamentos_instalados || [];
  const equipamentosRetirados = selectedFolha?.equipamentos_retirados || [];
  const materiaisInstalados = selectedFolha?.materiais_instalados || [];
  const materiaisRetirados = selectedFolha?.materiais_retirados || [];

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
      const detalhesCancelamento = `Cancelada pela: ${cancelamentoData.cancelado_por} | Motivo: ${cancelamentoData.motivo_cancelamento_tipo} | Justificativa: ${cancelamentoData.motivo_cancelamento}`;
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
        alert("Solicitação de cancelamento registrada e aguardando aprovação.");
      }
    } catch (error) {
      console.error("Erro ao cancelar folha:", error);
      alert("Não foi possível cancelar a folha. Tente novamente.");
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
    const motivoTipo = selectedFolha.motivo_cancelamento_tipo || "Não informado";
    const justificativaSolicitacao = selectedFolha.motivo_cancelamento || "Não informado";
    const detalhesCancelamento = `Cancelado pela: ${canceladoPor} | Motivo: ${motivoTipo} | Justificativa: ${justificativaSolicitacao}`;
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
      alert("Não foi possível aprovar o cancelamento. Tente novamente.");
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
      alert("Não foi possível identificar o status anterior para reverter.");
      return;
    }

    const canceladoPor = selectedFolha.cancelado_por || "Não informado";
    const motivoTipo = selectedFolha.motivo_cancelamento_tipo || "Não informado";
    const justificativaSolicitacao = selectedFolha.motivo_cancelamento || "Não informado";
    const detalhesCancelamento = `Cancelado pela: ${canceladoPor} | Motivo: ${motivoTipo} | Justificativa: ${justificativaSolicitacao}`;
    const observacao = `Solicitação de cancelamento negada. ${detalhesCancelamento}. Justificativa da negativa: ${justificativaNegativa}`;

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
      alert("Não foi possível negar o cancelamento. Tente novamente.");
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
        formatarProjeto(folha.projeto) || "",
        folha.ordem_servico || "",
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

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        if (prev.direction === "asc") {
          return { key: columnKey, direction: "desc" };
        }
        return { key: null, direction: "asc" };
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 text-blue-500" />;
    }
    return <ArrowDown className="h-3.5 w-3.5 text-blue-500" />;
  };

  const renderSortableHead = (label, columnKey, widthClass = "") => (
    <TableHead
      className={`${widthClass} bg-slate-100/70 text-[11px] font-semibold uppercase tracking-wide text-slate-500`}
    >
      <button
        type="button"
        onClick={() => handleSort(columnKey)}
        className="group flex w-full min-h-[34px] items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-slate-200/80 hover:text-slate-900"
      >
        <span className="truncate">{label}</span>
        <span className="flex h-4 w-4 items-center justify-center text-slate-400 group-hover:text-slate-500">
          {renderSortIcon(columnKey)}
        </span>
      </button>
    </TableHead>
  );

  // Função para drag and drop no Kanban
  const onDragEnd = async (result) => {
    if (!isAdmin) return;

    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const folha = folhas.find((f) => f.id === draggableId);
    const novoStatus = destination.droppableId;
    const statusPermitidos = Object.keys(STATUS_CONFIG);

    if (!folha || !statusPermitidos.includes(novoStatus) || folha.status === novoStatus) return;

    const extraData = {
      observacoes: `Status alterado via Kanban para ${STATUS_CONFIG[novoStatus].label}`,
    };

    try {
      await updateStatus(folha, novoStatus, extraData, profile);
      await loadFolhas();
    } catch (error) {
      console.error("Erro ao atualizar status via Kanban:", error);
      alert("Não foi possível atualizar o status. Tente novamente.");
      await loadFolhas();
    }
  };

  const toggleViewMode = () => {
    setViewMode(current => current === "list" ? "kanban" : "list");
  };
  
  // Colunas do Kanban
  const kanbanColumns = useMemo(() => {
    return Object.entries(STATUS_CONFIG).map(([statusKey, { label }]) => ({
      id: statusKey,
      title: label,
      folhas: filteredFolhas.filter(f => f.status === statusKey)
    }));
  }, [filteredFolhas]);

  const handleActionClick = (folha, action) => {
    setSelectedFolha(folha);
    if (action === 'details') setShowDetailsModal(true);
    if (action === 'validate') setShowValidacaoModal(true);
    if (action === 'send') setShowEnvioModal(true);
    if (action === 'return') setShowRetornoModal(true);
    if (action === 'payment') setShowPagamentoModal(true);
    if (action === 'cancel') setShowCancelamentoModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-auto"> 
      <div className="mx-auto w-full max-w-[1900px] px-4 md:px-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }} 
          className="mb-8 flex justify-between items-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Lista de Folhas de Medição</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleViewMode}
              title={viewMode === "kanban" ? "Visualizar em Lista" : "Visualizar em Kanban"}
              className= "bg-black text-white hover:bg-gray-800" 
            >
              {viewMode === "kanban" ? (
                <List className="w-5 h-5"/>
              ) : (
                <LayoutGrid className="w-5 h-5"/>
              )}
            </Button>
          </div>
        </motion.div>

        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Input 
              placeholder="Buscar por Número FM, Projeto..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="md:col-span-1" 
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleExportToCSV} 
              variant="outline" 
              disabled={filteredFolhas.length === 0}
              className="hover:bg-gray-50 transition-colors"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar para Excel
            </Button>
          </CardContent>
        </Card>

        {exportError && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {exportError}
          </div>
        )}

        {viewMode === "list" ? (
          <>
            <div className="flex items-center justify-between mb-4 px-2">
              <p className="text-sm text-gray-600">
                {filteredFolhas.length} folha(s) encontrada(s)
                {searchTerm && ` para "${searchTerm}"`}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Atrasadas: {resumoStatus.atrasadas}
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Vencem Hoje: {resumoStatus.vencemHoje}
                </span>
              </div>
            </div>

            <Card className="shadow-lg border-0">
              <CardContent className="pt-4 px-6">
                <Table>
                  <TableHeader className="bg-slate-100/80">
                    <TableRow>
                      {renderSortableHead("Número FM", "numero_fm", "w-72")}
                      {renderSortableHead("Projeto", "projeto", "w-64")}
                      {renderSortableHead("O.S.", "ordem_servico", "w-56")}
                      {renderSortableHead("Tipo Processo", "tipo_processo", "w-56")}
                      {renderSortableHead("Município", "municipio", "w-56")}
                      {renderSortableHead("Data Obra", "data_obra", "w-56")}
                      {renderSortableHead("Data Envio", "data_envio", "w-56")}
                      {renderSortableHead("Data Retorno", "data_retorno_distribuidora", "w-56")}
                      {renderSortableHead("Status", "status", "w-56")}
                      {renderSortableHead("Prazo", "prazo", "w-48")}
                      {renderSortableHead("Criado por", "criado_por", "w-56")}
                      {renderSortableHead("Valor", "valor_total", "w-32")}
                      <TableHead className="w-48 bg-slate-100/70 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFolhas.map((folha) => {
                        const prazoInfo = getPrazoInfo(folha);
                        const PrazoIcon = prazoInfo.icon;
                        const isAguardandoCorrecao = folha.status === "aguardando_correcao";
                        const rowClassName = [
                          isAguardandoCorrecao ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50",
                        ].filter(Boolean).join(" ");


                        // Função para formatar o projeto - mostrar vazio se for apenas o prefixo
                        const formatarProjeto = (projeto) => {
                          if (!projeto || projeto === 'OII-' || projeto === 'OMI-') {
                            return '';
                          }
                          return projeto;
                        };

                        return (
                          <TableRow key={folha.id} className={rowClassName}>
                            <TableCell className="font-mono font-semibold">{folha.numero_fm}</TableCell>
                            <TableCell>{formatarProjeto(folha.projeto)}</TableCell>
                            <TableCell>{folha.ordem_servico || ''}</TableCell> 
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
                                  <PrazoIcon className={`h-4 w-4 ${prazoInfo.className}`} />
                                  {prazoInfo.text}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{profilesMap[folha.created_by_user_id] || folha.created_by_name || "-"}</TableCell>
                            <TableCell className="text-left font-semibold text-green-600">
                              {formatCurrency(folha.valor_total)}
                            </TableCell>
                            <TableCell>
                              <ListaFolhaActions
                                folha={folha}
                                canValidate={canValidate}
                                isBackoffice={isBackoffice}
                                isVisitor={isVisitor}
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
          </>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start min-w-[640px] pr-2">
                {kanbanColumns.map(column => (
                  <Droppable key={column.id} droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 rounded-lg flex-1 ${snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-100'} min-h-[150px]`}
                      >
                        <h3 className="font-semibold text-sm mb-3 px-1">
                          {column.title} ({column.folhas.length})
                        </h3>
                        <div className="max-h-[70vh] overflow-y-auto">
                          {column.folhas.map((folha, index) => {
                            const prazoInfo = getPrazoInfo(folha);
                            return (
                              <KanbanCard
                                key={folha.id}
                                folha={folha}
                                index={index}
                                onActionClick={handleActionClick}
                                prazoInfo={prazoInfo}
                                isDraggable={isAdmin}
                              />
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </div>
          </DragDropContext>
        )}

        {/* Modais existentes (mantenha todos os modais existentes abaixo) */}
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
                          <strong>Encarregado:</strong> {equipe.encarregado} - <strong>Equipe:</strong> {equipe.codigo_equipe}
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
                          <span>Quantidade: {servico.quantidade}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}


                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <PackagePlus className="h-4 w-4 text-blue-600" />
                      Equipamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700">
                        <TrendingUp className="h-4 w-4" />
                        Instalados ({equipamentosInstalados.length})
                      </h4>
                      {equipamentosInstalados.length > 0 ? (
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                          {equipamentosInstalados.map((equipamento, index) => (
                            <div
                              key={equipamento.id || `equip-inst-${index}`}
                              className="grid gap-2 rounded border border-green-100 bg-green-50 p-3 text-sm md:grid-cols-2 lg:grid-cols-4"
                            >
                              <div>
                                <strong>Serial:</strong> {equipamento.serial || "-"}
                              </div>
                              <div>
                                <strong>Nº LP:</strong> {equipamento.numero_lp || "-"}
                              </div>
                              <div>
                                <strong>Fabricante:</strong> {equipamento.fabricante || "-"}
                              </div>
                              <div>
                                <strong>Capacidade:</strong> {equipamento.capacidade || "-"}
                              </div>
                              <div className="md:col-span-2 lg:col-span-1">
                                <strong>Data Fabricação:</strong> {equipamento.data_fabricacao || "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          Nenhum equipamento instalado registrado.
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <TrendingDown className="h-4 w-4" />
                        Retirados ({equipamentosRetirados.length})
                      </h4>
                      {equipamentosRetirados.length > 0 ? (
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                          {equipamentosRetirados.map((equipamento, index) => (
                            <div
                              key={equipamento.id || `equip-ret-${index}`}
                              className="grid gap-2 rounded border border-amber-100 bg-amber-50 p-3 text-sm md:grid-cols-2 lg:grid-cols-4"
                            >
                              <div>
                                <strong>Serial:</strong> {equipamento.serial || "-"}
                              </div>
                              <div>
                                <strong>Nº LP:</strong> {equipamento.numero_lp || "-"}
                              </div>
                              <div>
                                <strong>Fabricante:</strong> {equipamento.fabricante || "-"}
                              </div>
                              <div>
                                <strong>Capacidade:</strong> {equipamento.capacidade || "-"}
                              </div>
                              <div className="md:col-span-2 lg:col-span-1">
                                <strong>Data Fabricação:</strong> {equipamento.data_fabricacao || "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          Nenhum equipamento retirado registrado.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <PackageMinus className="h-4 w-4 text-purple-600" />
                      Materiais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700">
                        <TrendingUp className="h-4 w-4" />
                        Instalados ({materiaisInstalados.length})
                      </h4>
                      {materiaisInstalados.length > 0 ? (
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                          {materiaisInstalados.map((material, index) => (
                            <div
                              key={material.id || `mat-inst-${index}`}
                              className="grid gap-2 rounded border border-green-100 bg-green-50 p-3 text-sm md:grid-cols-2 lg:grid-cols-5"
                            >
                              <div className="md:col-span-2">
                                <strong>Descrição:</strong> {material.descricao || "-"}
                              </div>
                              <div>
                                <strong>Lote:</strong> {material.lote || "-"}
                              </div>
                              <div>
                                <strong>Quantidade:</strong> {material.quantidade ?? "-"}
                              </div>
                              {/*<div>
                                <strong>UMB:</strong> {material.umb || "-"}
                              </div>
                              <div className="md:col-span-2">
                                <strong>Origem:</strong> {material.origem || "-"}
                              </div>*/}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          Nenhum material instalado registrado.
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <TrendingDown className="h-4 w-4" />
                        Retirados ({materiaisRetirados.length})
                      </h4>
                      {materiaisRetirados.length > 0 ? (
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                          {materiaisRetirados.map((material, index) => (
                            <div
                              key={material.id || `mat-ret-${index}`}
                              className="grid gap-2 rounded border border-amber-100 bg-amber-50 p-3 text-sm md:grid-cols-2 lg:grid-cols-5"
                            >
                              <div className="md:col-span-2">
                                <strong>Descrição:</strong> {material.descricao || "-"}
                              </div>
                              <div>
                                <strong>Lote:</strong> {material.lote || "-"}
                              </div>
                              <div>
                                <strong>Quantidade:</strong> {material.quantidade ?? "-"}
                              </div>
                              {/*<div>
                                <strong>UMB:</strong> {material.umb || "-"}
                              </div>
                              {/*<div className="md:col-span-2">
                                <strong>Destino:</strong> {material.destino || material.origem || "-"}
                              </div>*/}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          Nenhum material retirado registrado.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/*{selectedFolha.status_historico && (*/}
                {historicoCompleto.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/*<ListaHistoricoTimeline historico={selectedFolha.status_historico} />*/}
                      <ListaHistoricoTimeline historico={historicoCompleto} />
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
                <label className="mb-2 block text-sm font-semibold">Cancelada pela *</label>
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
