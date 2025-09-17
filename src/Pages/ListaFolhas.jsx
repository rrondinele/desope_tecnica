import React, { useState, useEffect, useCallback } from "react";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Files,
  Search,
  Eye,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  AlertOctagon,
  DollarSign,
  History,
  Calendar,
  Mail,
  Share,
  FileDown,
} from "lucide-react";
import { format, addDays, isWeekend, differenceInBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import * as XLSX from "xlsx";
import headMapping from "@/Mappings/Headmapping_excel.json";
import serviceMapping from "@/Mappings/Servicemapping_excel.json";
import equipmentMapping from "@/Mappings/Equipmentmapping_excel.json";
import materialsMapping from "@/Mappings/Materialsmapping_excel.json";
import teamMapping from "@/Mappings/Teammapping_excel.json";
import {
  STATUS_RULES,
  toggleExportSelection,
  validateExportSelection,
  getValueFromPath,
  buildExcelFileName,
  normalizeId,
} from "@/rules/listFMRules";

const EXCEL_TEMPLATE_PATH = encodeURI("/model-export/FOLHA DE MEDICAO.xlsx");
const DEFAULT_START_ROW = 2;

const updateSheetRef = (sheet) => {
  const cellAddresses = Object.keys(sheet).filter(
    (key) => !key.startsWith("!"),
  );
  if (cellAddresses.length === 0) {
    return;
  }

  const decoded = cellAddresses.map((addr) => XLSX.utils.decode_cell(addr));
  const minCol = Math.min(...decoded.map((cell) => cell.c));
  const maxCol = Math.max(...decoded.map((cell) => cell.c));
  const minRow = Math.min(...decoded.map((cell) => cell.r));
  const maxRow = Math.max(...decoded.map((cell) => cell.r));

  sheet["!ref"] = XLSX.utils.encode_range({
    s: { c: minCol, r: minRow },
    e: { c: maxCol, r: maxRow },
  });
};

const columnLettersToIndex = (letters) => {
  return (
    letters
      .toUpperCase()
      .split("")
      .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1
  );
};

const parseCellReference = (ref, fallbackRow = DEFAULT_START_ROW) => {
  if (!ref) {
    return { column: "A", row: fallbackRow };
  }

  // Keep the numeric row portion (e.g., the 2 in A2) so column decoding stays correct.
  const match = /^([A-Z]+)(\d+)?$/i.exec(ref.trim());
  if (!match) {
    return { column: ref.toString().toUpperCase(), row: fallbackRow };
  }

  const [, columnLetters, rowPart] = match;
  const row = rowPart ? parseInt(rowPart, 10) : fallbackRow;
  return { column: columnLetters.toUpperCase(), row };
};

const createCellValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { t: "n", v: value };
  }
  if (typeof value === "boolean") {
    return { t: "b", v: value };
  }
  if (value instanceof Date) {
    return { t: "d", v: value };
  }
  return { t: "s", v: value ?? "" };
};

const ensureSheetRange = (sheet, cellAddress) => {
  const cell = XLSX.utils.decode_cell(cellAddress);
  const currentRange = sheet["!ref"]
    ? XLSX.utils.decode_range(sheet["!ref"])
    : { s: { c: cell.c, r: cell.r }, e: { c: cell.c, r: cell.r } };
  const updated = {
    s: {
      c: Math.min(currentRange.s.c, cell.c),
      r: Math.min(currentRange.s.r, cell.r),
    },
    e: {
      c: Math.max(currentRange.e.c, cell.c),
      r: Math.max(currentRange.e.r, cell.r),
    },
  };
  sheet["!ref"] = XLSX.utils.encode_range(updated);
};

const DATE_FIELDS = new Set([
  "data_obra",
  "data_envio",
  "data_retorno_distribuidora",
  "data_pagamento",
]);

const NUMERIC_FIELDS = new Set([
  "valor_total",
  "total_valor",
  "preco",
  "quantidade",
]);

const formatValueForExcel = (value, path) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (value instanceof Date) {
    return format(value, "dd/MM/yyyy");
  }

  const pathParts = path ? path.split(".") : [];
  const fieldName = pathParts[pathParts.length - 1]?.toLowerCase();

  if (typeof value === "number") {
    if (NUMERIC_FIELDS.has(fieldName || "")) {
      return value;
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    if (DATE_FIELDS.has(fieldName || "")) {
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        return format(new Date(parsed), "dd/MM/yyyy");
      }
    }

    if (NUMERIC_FIELDS.has(fieldName || "")) {
      const numeric = Number(trimmed.replace(",", "."));
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }

    return trimmed;
  }

  return value;
};

const setSheetValue = (sheet, cellRef, rawValue, path) => {
  const { column, row } = parseCellReference(cellRef);
  const colIndex = columnLettersToIndex(column);
  const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row - 1 });
  const value = formatValueForExcel(rawValue, path);

  sheet[cellAddress] = createCellValue(value);
  ensureSheetRange(sheet, cellAddress);
  
  // Debug log
  // console.log('[setSheetValue]', {
  //   path,
  //   cellRef,
  //   cellAddress,
  //   value,
  //   stored: sheet[cellAddress],
  // });
};

const fillHeadMapping = (sheet, folha) => {
  const context = { data: folha };
  Object.entries(headMapping).forEach(([path, cellRef]) => {
    const value = getValueFromPath(context, path);

    // Debug log
    // console.log('[fillHeadMapping]', { path, cellRef, value });

    setSheetValue(sheet, cellRef, value, path);
  });
};


const fillCollection = (
  sheet,
  items,
  mapping,
  { fallbackRow = DEFAULT_START_ROW, formatters = {} } = {},
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const normalizedMapping = Object.entries(mapping).reduce(
    (acc, [field, cellRef]) => {
      acc[field] = parseCellReference(cellRef, fallbackRow);
      return acc;
    },
    {},
  );

  items.forEach((item, index) => {
    Object.entries(normalizedMapping).forEach(([field, base]) => {
      const formatter = formatters[field];
      const raw = formatter ? formatter(item[field], item) : item[field];
      const targetCell = `${base.column}${base.row + index}`;
      setSheetValue(sheet, targetCell, raw, field);
    });
  });
};

const applyMappingsToSheet = (sheet, folha) => {
  if (!sheet || !folha) {
    return;
  }

  fillHeadMapping(sheet, folha);


  fillCollection(sheet, folha.equipes || [], teamMapping.equipes, {
    formatters: {
      eletricistas: (value) =>
        Array.isArray(value) ? value.join(", ") : value,
    },
  });

  const servicosMapping = serviceMapping.servicos || {};
  fillCollection(sheet, folha.servicos || [], servicosMapping);

  const equipamentosInstaladosMapping =
    equipmentMapping.equipamentosInstalados || {};
  fillCollection(
    sheet,
    folha.equipamentos_instalados || [],
    equipamentosInstaladosMapping,
    {
      formatters: {
        data_fabricacao: (_, item) => {
          const mes = item?.mes_fabricacao
            ? String(item.mes_fabricacao).padStart(2, "0")
            : "";
          const ano = item?.ano_fabricacao ? String(item.ano_fabricacao) : "";
          if (!mes && !ano) {
            return "";
          }
          return [mes, ano].filter(Boolean).join("/");
        },
      },
    },
  );

  const equipamentosRetiradosMapping =
    equipmentMapping.equipamentosRetirados || {};
  fillCollection(
    sheet,
    folha.equipamentos_retirados || [],
    equipamentosRetiradosMapping,
    {
      formatters: {
        data_fabricacao: (_, item) => {
          const mes = item?.mes_fabricacao
            ? String(item.mes_fabricacao).padStart(2, "0")
            : "";
          const ano = item?.ano_fabricacao ? String(item.ano_fabricacao) : "";
          if (!mes && !ano) {
            return "";
          }
          return [mes, ano].filter(Boolean).join("/");
        },
      },
    },
  );

  const materiaisInstaladosMapping = materialsMapping.materiaisInstalados || {};
  fillCollection(
    sheet,
    folha.materiais_instalados || [],
    materiaisInstaladosMapping,
  );

  const materiaisRetiradosMapping = materialsMapping.materiaisRetirados || {};
  fillCollection(
    sheet,
    folha.materiais_retirados || [],
    materiaisRetiradosMapping,
  );

  updateSheetRef(sheet);
};

const STATUS_ICONS = {
  clock: Clock,
  send: Send,
  checkCircle: CheckCircle,
  alertTriangle: AlertTriangle,
  dollarSign: DollarSign,
  xCircle: XCircle,
};

const statusConfig = STATUS_RULES;

const addBusinessDays = (date, days) => {
  let result = new Date(date);
  let addedDays = 0;
  while (addedDays < days) {
    result = addDays(result, 1);
    if (!isWeekend(result)) {
      addedDays++;
    }
  }
  return result;
};

export default function ListaFolhas() {
  const navigate = useNavigate();
  const [folhas, setFolhas] = useState([]);
  const [filteredFolhas, setFilteredFolhas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedFolha, setSelectedFolha] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [showRetornoModal, setShowRetornoModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false);

  const [envioData, setEnvioData] = useState({
    data_envio: format(new Date(), "yyyy-MM-dd"),
    metodo_envio: "",
  });
  const [retornoData, setRetornoData] = useState({
    parecer: "aprovado",
    data_retorno: format(new Date(), "yyyy-MM-dd"),
    tipo_motivo_reprovacao: "",
    motivo_reprovacao: "",
  });
  const [pagamentoData, setPagamentoData] = useState({
    numero_pagamento: "",
    data_pagamento: "",
  });
  const [cancelamentoData, setCancelamentoData] = useState({
    motivo_cancelamento: "",
  });
  const [selectedExportId, setSelectedExportId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadFolhas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await FolhaMedicao.list("-created_date");
      setFolhas(data);
    } catch (error) {
      console.error("Erro ao carregar folhas:", error);
    }
    setIsLoading(false);
  }, []);

  const filterFolhas = useCallback(() => {
    let filtered = folhas;
    if (searchTerm) {
      filtered = filtered.filter(
        (folha) =>
          folha.numero_fm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          folha.projeto?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((folha) => folha.status === statusFilter);
    }
    setFilteredFolhas(filtered);
  }, [folhas, searchTerm, statusFilter]);

  useEffect(() => {
    loadFolhas();
  }, [loadFolhas]);
  useEffect(() => {
    filterFolhas();
  }, [filterFolhas]);
  useEffect(() => {
    if (!selectedExportId) {
      return;
    }
    const exists = folhas.some(
      (folha) => normalizeId(folha.id) === normalizeId(selectedExportId),
    );
    if (!exists) {
      setSelectedExportId(null);
    }
  }, [folhas, selectedExportId]);

  const updateStatus = async (folha, novoStatus, extraData = {}) => {
    const payload = {
      status: novoStatus,
      status_historico: [
        ...(folha.status_historico || []),
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
    loadFolhas();
  };

  const handleEnviarFolha = async () => {
    if (!envioData.metodo_envio) {
      alert("Por favor, selecione o método de envio.");
      return;
    }

    await updateStatus(selectedFolha, "aguardando_aprovacao", {
      data_envio: new Date(envioData.data_envio).toISOString(),
      metodo_envio: envioData.metodo_envio,
      observacoes: `Enviado via ${envioData.metodo_envio} em ${format(new Date(envioData.data_envio), "dd/MM/yyyy")}`,
    });
    setShowEnvioModal(false);
    setSelectedFolha(null);
    setEnvioData({
      data_envio: format(new Date(), "yyyy-MM-dd"),
      metodo_envio: "",
    });
  };

  const handleProcessarRetorno = async () => {
    const dataRetorno = {
      data_retorno_distribuidora: new Date(
        retornoData.data_retorno,
      ).toISOString(),
    };

    if (retornoData.parecer === "aprovado") {
      await updateStatus(selectedFolha, "aprovado", {
        ...dataRetorno,
        observacoes: `Folha aprovada pela distribuidora em ${format(new Date(retornoData.data_retorno), "dd/MM/yyyy")}`,
      });
      setShowRetornoModal(false);
      setSelectedFolha(null);
      setRetornoData({
        parecer: "aprovado",
        data_retorno: format(new Date(), "yyyy-MM-dd"),
        tipo_motivo_reprovacao: "",
        motivo_reprovacao: "",
      });
    } else {
      // 1. Atualizar a folha original APENAS com dados de reprovação (SEM ALTERAR O HISTÓRICO)
      const reprovacaoDataOriginal = {
        status: "reprovado",
        ...dataRetorno,
        tipo_motivo_reprovacao: retornoData.tipo_motivo_reprovacao,
        motivo_reprovacao: retornoData.motivo_reprovacao,
        // NÃO incluir observacoes aqui para não alterar o histórico na folha original
      };

      // Usar diretamente FolhaMedicao.update SEM a função updateStatus (que alteraria o histórico)
      await FolhaMedicao.update(selectedFolha.id, reprovacaoDataOriginal);

      // 2. Criar histórico completo para a nova versão usando o histórico ORIGINAL (antes da reprovação)
      const historicoCompleto = [
        ...(selectedFolha.status_historico || []), // Histórico original (sem a reprovação atual ainda)
        {
          status: "reprovado",
          data: new Date().toISOString(),
          usuario: "sistema",
          observacoes: `Reprovado em ${format(new Date(retornoData.data_retorno), "dd/MM/yyyy")}: ${retornoData.tipo_motivo_reprovacao} - ${retornoData.motivo_reprovacao}`,
        },
        {
          status: "pendente",
          data: new Date().toISOString(),
          usuario: "sistema",
          observacoes: `Folha de correção criada automaticamente após reprovação da ${selectedFolha.numero_fm}`,
        },
      ];

      // 3. Preparar dados para nova versão
      const numeroFMBase = selectedFolha.numero_fm.includes("-v")
        ? selectedFolha.numero_fm.split("-v")[0]
        : selectedFolha.numero_fm;
      const novaVersao = (selectedFolha.versao || 1) + 1;
      const novoNumeroFM = `${numeroFMBase}-v${novaVersao}`;

      const novaFolhaData = {
        // Copia todos os dados da folha original
        numero_fm: novoNumeroFM,
        empreiteira: selectedFolha.empreiteira,
        tecnico_light: selectedFolha.tecnico_light,
        endereco: selectedFolha.endereco,
        tipo_processo: selectedFolha.tipo_processo,
        caracteristica: selectedFolha.caracteristica,
        data_obra: selectedFolha.data_obra,
        hora_acionada: selectedFolha.hora_acionada,
        hora_inicio: selectedFolha.hora_inicio,
        hora_fim: selectedFolha.hora_fim,
        municipio: selectedFolha.municipio,
        circuito: selectedFolha.circuito,
        projeto: selectedFolha.projeto,
        ordem_servico: selectedFolha.ordem_servico,
        ordem_manutencao: selectedFolha.ordem_manutencao,
        reserva: selectedFolha.reserva,
        ntc: selectedFolha.ntc,
        pi: selectedFolha.pi,
        ks: selectedFolha.ks,
        cf: selectedFolha.cf,
        zona: selectedFolha.zona,
        valor_total: selectedFolha.valor_total,
        servicos: selectedFolha.servicos || [],
        equipes: selectedFolha.equipes || [],
        equipamentos_instalados: selectedFolha.equipamentos_instalados || [],
        equipamentos_retirados: selectedFolha.equipamentos_retirados || [],
        materiais_instalados: selectedFolha.materiais_instalados || [],
        materiais_retirados: selectedFolha.materiais_retirados || [],

        // Novos campos para a versão corrigida
        status: "pendente",
        versao: novaVersao,
        folha_original_id: selectedFolha.folha_original_id || selectedFolha.id,
        eh_correcao: true,
        status_historico: historicoCompleto, // Histórico completo construído acima

        // Limpar campos de processo (para poder reenviar)
        data_envio: null,
        metodo_envio: null,
        data_retorno_distribuidora: null,
        motivo_reprovacao: "",
        tipo_motivo_reprovacao: "",
        data_pagamento: null,
        numero_pagamento: "",
        motivo_cancelamento: null,
      };

      // 4. Criar a nova folha de correção
      try {
        const novaFolha = await FolhaMedicao.create(novaFolhaData);

        setShowRetornoModal(false);
        setSelectedFolha(null);
        setRetornoData({
          parecer: "aprovado",
          data_retorno: format(new Date(), "yyyy-MM-dd"),
          tipo_motivo_reprovacao: "",
          motivo_reprovacao: "",
        });

        await loadFolhas(); // Recarregar a lista

        // Redirecionar para EDIÇÃO da nova folha, não para clonagem
        if (novaFolha && novaFolha.id) {
          navigate(createPageUrl(`NovaFolha?editId=${novaFolha.id}`));
        }
      } catch (error) {
        console.error("Erro ao criar folha de correção:", error);
        alert("Erro ao criar folha de correção. Tente novamente.");
      }
    }
  };

  const handleRegistrarPagamento = async () => {
    const pagamentoPayload = {
      numero_pagamento: pagamentoData.numero_pagamento,
      data_pagamento: new Date(pagamentoData.data_pagamento).toISOString(),
      observacoes: `Pagamento registrado - NF: ${pagamentoData.numero_pagamento}`,
    };
    await updateStatus(selectedFolha, "pago", pagamentoPayload);
    setShowPagamentoModal(false);
    setSelectedFolha(null);
  };

  const handleCancelarFolha = async () => {
    if (!cancelamentoData.motivo_cancelamento) {
      alert("Por favor, informe o motivo do cancelamento.");
      return;
    }
    await updateStatus(selectedFolha, "cancelado", {
      motivo_cancelamento: cancelamentoData.motivo_cancelamento,
      observacoes: `Folha cancelada. Motivo: ${cancelamentoData.motivo_cancelamento}`,
    });
    setShowCancelamentoModal(false);
    setSelectedFolha(null);
  };

  const handleExportToExcel = async () => {
    if (isExporting) {
      return;
    }

    const { valid, folha, message } = validateExportSelection(
      selectedExportId,
      folhas,
    );
    if (!valid) {
      alert(message);
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(EXCEL_TEMPLATE_PATH);
      if (!response.ok) {
        throw new Error("template-not-found");
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Debug: Verificar dados da folha
      // console.log("folha exportada", folha);

      applyMappingsToSheet(worksheet, folha);

      // Debug: Verificar alguns valores chave

      // console.log('A2', worksheet['A2']?.v);
      // console.log('G2', worksheet['G2']?.v);
      // console.log('L2', worksheet['L2']?.v);

      workbook.Sheets[sheetName] = worksheet;

      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = buildExcelFileName(folha);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar folha:", error);
      alert(
        "Nao foi possivel exportar o arquivo. Verifique o modelo e tente novamente.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleExportSelection = (folhaId) => {
    setSelectedExportId((prev) => toggleExportSelection(prev, folhaId));
  };
  const getPrazoClass = (folha) => {
    if (folha.status !== "pendente" || !folha.data_obra) return "";
    const hoje = new Date();
    const dueDate = addBusinessDays(new Date(folha.data_obra), 2);
    const diasRestantes = differenceInBusinessDays(dueDate, hoje);

    if (diasRestantes < 0)
      return { className: "bg-red-100", icon: AlertOctagon, text: "Atrasado" };
    if (diasRestantes === 0)
      return {
        className: "bg-orange-100",
        icon: AlertTriangle,
        text: "Vence Hoje",
      };
    if (diasRestantes === 1)
      return { className: "bg-yellow-100", icon: Clock, text: "Falta 1 dia" };
    return "";
  };

  const renderStatusBadge = (status) => {
    const config = statusConfig[status];
    if (!config) return null;
    const Icon = config.iconKey ? STATUS_ICONS[config.iconKey] : null;
    return (
      <Badge
        variant="secondary"
        className={`${config.color} border font-medium`}
      >
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  const renderActionButtons = (folha) => (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setSelectedFolha(folha);
          setShowDetailsModal(true);
        }}
      >
        <Eye className="w-4 h-4 text-blue-600" />
      </Button>
      {folha.status === "pendente" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedFolha(folha);
            setShowEnvioModal(true);
          }}
        >
          <Send className="w-4 h-4 text-green-600" />
        </Button>
      )}
      {folha.status === "aguardando_aprovacao" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedFolha(folha);
            setShowRetornoModal(true);
          }}
        >
          <Edit className="w-4 h-4 text-orange-600" />
        </Button>
      )}
      {folha.status === "aprovado" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedFolha(folha);
            setShowPagamentoModal(true);
          }}
        >
          <DollarSign className="w-4 h-4 text-purple-600" />
        </Button>
      )}
      {["pendente", "aguardando_aprovacao"].includes(folha.status) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedFolha(folha);
            setShowCancelamentoModal(true);
          }}
        >
          <XCircle className="w-4 h-4 text-red-600" />
        </Button>
      )}
    </div>
  );

  const renderHistoricoTimeline = (historico) => {
    if (!historico || historico.length === 0)
      return (
        <p className="text-gray-500 text-sm">Nenhum histórico disponível.</p>
      );

    return (
      <div className="space-y-3">
        {historico.map((item, index) => {
          const config = statusConfig[item.status];
          const Icon =
            (config?.iconKey && STATUS_ICONS[config.iconKey]) || History;
          return (
            <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className={`p-2 rounded-full ${config?.color || "bg-gray-100"}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm">
                    {config?.label || item.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(item.data), "dd/MM/yy HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                {item.observacoes && (
                  <p className="text-sm text-gray-600 mt-1">
                    {item.observacoes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Lista de Folhas de Medição
          </h1>
        </motion.div>

        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            {/* Layout Desktop - tudo em uma linha */}
            <div className="hidden lg:flex items-center gap-4 w-full">
              <Input
                placeholder="Buscar por Número FM, Projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                disabled={filteredFolhas.length === 0 || isExporting}
                className="whitespace-nowrap"
              >
                <FileDown className="w-4 h-4 mr-2" />{" "}
                {isExporting ? "Exportando..." : "Exportar para Excel"}
              </Button>
            </div>

            {/* Layout Mobile/Tablet - elementos empilhados */}
            <div className="lg:hidden space-y-4">
              <Input
                placeholder="Buscar por Número FM, Projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleExportToExcel}
                  variant="outline"
                  disabled={filteredFolhas.length === 0 || isExporting}
                  className="shrink-0"
                >
                  <FileDown className="w-4 h-4 mr-2" />{" "}
                  {isExporting ? "Exportando..." : "Exportar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Exportar</TableHead>
                  <TableHead>Número FM</TableHead>
                  <TableHead>Data Obra</TableHead>
                  <TableHead>Data Envio</TableHead>
                  <TableHead>Data Retorno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFolhas.map((folha) => {
                    const prazoInfo = getPrazoClass(folha);
                    const PrazoIcon = prazoInfo.icon;
                    return (
                      <TableRow key={folha.id} className={prazoInfo.className}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={
                              normalizeId(selectedExportId) ===
                              normalizeId(folha.id)
                            }
                            onChange={() =>
                              handleToggleExportSelection(folha.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {folha.numero_fm}
                        </TableCell>
                        <TableCell>
                          {folha.data_obra
                            ? format(new Date(folha.data_obra), "dd/MM/yy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {folha.data_envio
                                ? format(new Date(folha.data_envio), "dd/MM/yy")
                                : "-"}
                            </span>
                            {folha.metodo_envio && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                {folha.metodo_envio === "E-mail" ? (
                                  <Mail className="w-3 h-3" />
                                ) : (
                                  <Share className="w-3 h-3" />
                                )}
                                {folha.metodo_envio}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {folha.data_retorno_distribuidora
                            ? format(
                                new Date(folha.data_retorno_distribuidora),
                                "dd/MM/yy",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>{renderStatusBadge(folha.status)}</TableCell>
                        <TableCell>
                          {PrazoIcon && (
                            <div className="flex items-center gap-1 text-sm">
                              <PrazoIcon className="w-4 h-4" />
                              {prazoInfo.text}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{renderActionButtons(folha)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Files className="w-5 h-5 text-blue-600" />
                Detalhes da Folha {selectedFolha?.numero_fm}
              </DialogTitle>
            </DialogHeader>
            {selectedFolha && (
              <div className="space-y-6 p-1">
                {/* Dados Gerais */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Dados Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Empreiteira:</strong> {selectedFolha.empreiteira}
                    </div>
                    <div>
                      <strong>Técnico Light:</strong>{" "}
                      {selectedFolha.tecnico_light || "N/A"}
                    </div>
                    <div>
                      <strong>Município:</strong> {selectedFolha.municipio}
                    </div>
                    <div>
                      <strong>Projeto:</strong> {selectedFolha.projeto}
                    </div>
                    <div>
                      <strong>Data da Obra:</strong>{" "}
                      {selectedFolha.data_obra
                        ? format(
                            new Date(selectedFolha.data_obra),
                            "dd/MM/yyyy",
                          )
                        : "N/A"}
                    </div>
                    <div>
                      <strong>Status Atual:</strong>{" "}
                      {renderStatusBadge(selectedFolha.status)}
                    </div>
                  </CardContent>
                </Card>

                {/* Valores Financeiros */}
                {selectedFolha.valor_total !== undefined &&
                  selectedFolha.valor_total !== null && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-base text-green-800">
                          Informações Financeiras
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                          R${" "}
                          {selectedFolha.valor_total.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        {selectedFolha.numero_pagamento && (
                          <div className="text-sm text-green-600 mt-1">
                            NF: {selectedFolha.numero_pagamento}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {/* Equipes */}
                {selectedFolha.equipes?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Equipes ({selectedFolha.equipes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedFolha.equipes.map((equipe, index) => (
                        <div
                          key={index}
                          className="p-2 bg-blue-50 rounded text-sm"
                        >
                          <strong>Equipe:</strong> {equipe.codigo_equipe} -{" "}
                          <strong>Enc:</strong> {equipe.encarregado}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Serviços */}
                {selectedFolha.servicos?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Serviços ({selectedFolha.servicos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-40 overflow-y-auto space-y-2">
                      {selectedFolha.servicos.map((servico, index) => (
                        <div
                          key={index}
                          className="p-2 bg-green-50 rounded text-sm flex justify-between"
                        >
                          <span>{servico.descricao}</span>
                          <span>Qtd: {servico.quantidade}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Equipamentos */}
                {(selectedFolha.equipamentos_instalados?.length > 0 ||
                  selectedFolha.equipamentos_retirados?.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Equipamentos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">
                          Instalados:
                        </h4>
                        {selectedFolha.equipamentos_instalados?.map(
                          (item, i) => (
                            <div key={i} className="p-1 bg-slate-100 rounded">
                              S: {item.serial}, F: {item.fabricante}
                            </div>
                          ),
                        ) || "Nenhum"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">
                          Retirados:
                        </h4>
                        {selectedFolha.equipamentos_retirados?.map(
                          (item, i) => (
                            <div key={i} className="p-1 bg-slate-100 rounded">
                              S: {item.serial}, F: {item.fabricante}
                            </div>
                          ),
                        ) || "Nenhum"}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Materiais */}
                {(selectedFolha.materiais_instalados?.length > 0 ||
                  selectedFolha.materiais_retirados?.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Materiais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">
                          Instalados:
                        </h4>
                        {selectedFolha.materiais_instalados?.map((item, i) => (
                          <div key={i} className="p-1 bg-slate-100 rounded">
                            {item.descricao} (Qtd: {item.quantidade})
                          </div>
                        )) || "Nenhum"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">
                          Retirados:
                        </h4>
                        {selectedFolha.materiais_retirados?.map((item, i) => (
                          <div key={i} className="p-1 bg-slate-100 rounded">
                            {item.descricao} (Qtd: {item.quantidade})
                          </div>
                        )) || "Nenhum"}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Histórico */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" /> Histórico da Folha
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderHistoricoTimeline(selectedFolha.status_historico)}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Envio */}
        <Dialog open={showEnvioModal} onOpenChange={setShowEnvioModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Send className="w-5 h-5" />
                Enviar Folha para Distribuidora
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes do envio da folha{" "}
                {selectedFolha?.numero_fm}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Data de Envio
                </label>
                <Input
                  type="date"
                  value={envioData.data_envio}
                  onChange={(e) =>
                    setEnvioData({ ...envioData, data_envio: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Método de Envio *
                </label>
                <Select
                  value={envioData.metodo_envio}
                  onValueChange={(v) =>
                    setEnvioData({ ...envioData, metodo_envio: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E-mail">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        E-mail
                      </div>
                    </SelectItem>
                    <SelectItem value="Sharepoint">
                      <div className="flex items-center gap-2">
                        <Share className="w-4 h-4" />
                        Sharepoint
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEnvioModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEnviarFolha}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmar Envio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Retorno */}
        <Dialog open={showRetornoModal} onOpenChange={setShowRetornoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Processar Retorno da Distribuidora</DialogTitle>
              <DialogDescription>
                Registre o parecer da distribuidora para a folha{" "}
                {selectedFolha?.numero_fm}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Data do Retorno *
                </label>
                <Input
                  type="date"
                  value={retornoData.data_retorno}
                  onChange={(e) =>
                    setRetornoData({
                      ...retornoData,
                      data_retorno: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Parecer da Distribuidora *
                </label>
                <Select
                  value={retornoData.parecer}
                  onValueChange={(v) =>
                    setRetornoData({ ...retornoData, parecer: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovado">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Aprovado
                      </div>
                    </SelectItem>
                    <SelectItem value="reprovado">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-orange-600" />
                        Reprovado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {retornoData.parecer === "reprovado" && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Detalhes da Reprovação
                  </h4>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Tipo do Motivo *
                    </label>
                    <Select
                      value={retornoData.tipo_motivo_reprovacao}
                      onValueChange={(v) =>
                        setRetornoData({
                          ...retornoData,
                          tipo_motivo_reprovacao: v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo do erro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Erro Lançamentos de Serviços">
                          Erro Lançamentos de Serviços
                        </SelectItem>
                        <SelectItem value="Erro Dados Cadastrais">
                          Erro Dados Cadastrais
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Motivo Detalhado *
                    </label>
                    <Textarea
                      placeholder="Detalhe o motivo da reprovação conforme retorno da distribuidora..."
                      value={retornoData.motivo_reprovacao}
                      onChange={(e) =>
                        setRetornoData({
                          ...retornoData,
                          motivo_reprovacao: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Uma nova folha de correção
                      (versão {(selectedFolha?.versao || 1) + 1}) será criada
                      automaticamente com status "Pendente" para reenvio.
                    </p>
                  </div>
                </div>
              )}

              {retornoData.parecer === "aprovado" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Sucesso:</strong> A folha será marcada como aprovada
                    e ficará disponível para registro de pagamento.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRetornoModal(false)}
              >
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
                {retornoData.parecer === "aprovado"
                  ? "Confirmar Aprovação"
                  : "Confirmar Reprovação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Pagamento */}
        <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Número da Nota Fiscal"
                value={pagamentoData.numero_pagamento}
                onChange={(e) =>
                  setPagamentoData({
                    ...pagamentoData,
                    numero_pagamento: e.target.value,
                  })
                }
              />
              <Input
                type="date"
                value={pagamentoData.data_pagamento}
                onChange={(e) =>
                  setPagamentoData({
                    ...pagamentoData,
                    data_pagamento: e.target.value,
                  })
                }
              />
            </div>
            <DialogFooter>
              <Button onClick={handleRegistrarPagamento}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Cancelamento */}
        <Dialog
          open={showCancelamentoModal}
          onOpenChange={setShowCancelamentoModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Cancelar Folha de Medição
              </DialogTitle>
              <DialogDescription>
                Justifique o motivo para cancelar a folha{" "}
                {selectedFolha?.numero_fm}. Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Motivo do Cancelamento *
                </label>
                <Textarea
                  placeholder="Ex: Erro de digitação, solicitação da distribuidora, etc."
                  value={cancelamentoData.motivo_cancelamento}
                  onChange={(e) =>
                    setCancelamentoData({ motivo_cancelamento: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancelamentoModal(false)}
              >
                Voltar
              </Button>
              <Button
                onClick={handleCancelarFolha}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
