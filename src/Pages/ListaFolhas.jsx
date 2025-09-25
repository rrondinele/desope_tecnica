
import React, { useState, useEffect, useCallback } from "react";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Files, Search, Eye, Edit, Send, CheckCircle, XCircle, Clock, AlertTriangle,
  AlertOctagon, DollarSign, History, Calendar, Mail, Share, FileDown
} from "lucide-react";
import { format, addDays, isWeekend, differenceInBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { exportFolhaById } from "@/exportTemplate/exportFolhaService";

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  aguardando_aprovacao: { label: "Aguardando Aprovação", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Send },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  reprovado: { label: "Reprovado", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle },
  pago: { label: "Pago", color: "bg-purple-100 text-purple-800 border-purple-200", icon: DollarSign },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle }
};

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
  const [exportingFolhaId, setExportingFolhaId] = useState(null);
  const [pendingExportFolha, setPendingExportFolha] = useState(null);
  const [exportError, setExportError] = useState(null);

  const [selectedFolha, setSelectedFolha] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [showRetornoModal, setShowRetornoModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false);

  const [envioData, setEnvioData] = useState({ data_envio: format(new Date(), 'yyyy-MM-dd'), metodo_envio: '' });
  const [retornoData, setRetornoData] = useState({
    parecer: 'aprovado',
    data_retorno: format(new Date(), 'yyyy-MM-dd'),
    tipo_motivo_reprovacao: '',
    motivo_reprovacao: ''
  });
  const [pagamentoData, setPagamentoData] = useState({ numero_pagamento: '', data_pagamento: '' });
  const [cancelamentoData, setCancelamentoData] = useState({ motivo_cancelamento: '' });

  const loadFolhas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await FolhaMedicao.list("-created_date");
      setFolhas(data);
    } catch (error) { console.error("Erro ao carregar folhas:", error); }
    setIsLoading(false);
  }, []);

  const filterFolhas = useCallback(() => {
    let filtered = folhas; 
    if (searchTerm) {
      filtered = filtered.filter(folha =>
        folha.numero_fm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        folha.projeto?.toLowerCase().includes(searchTerm.toLowerCase()) 
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(folha => folha.status === statusFilter);
    }
    setFilteredFolhas(filtered);
  }, [folhas, searchTerm, statusFilter]);

  useEffect(() => { loadFolhas(); }, [loadFolhas]);
  useEffect(() => { filterFolhas(); }, [filterFolhas]);

  const updateStatus = async (folha, novoStatus, extraData = {}) => {
    const payload = {
      status: novoStatus,
      status_historico: [...(folha.status_historico || []), {
        status: novoStatus,
        data: new Date().toISOString(),
        usuario: 'sistema',
        observacoes: extraData.observacoes || ''
      }],
      ...extraData
    };
    await FolhaMedicao.update(folha.id, payload);
    loadFolhas();
  };

  const handleEnviarFolha = async () => {
    if (!envioData.metodo_envio) {
      alert('Por favor, selecione o método de envio.');
      return;
    }

    await updateStatus(selectedFolha, 'aguardando_aprovacao', {
      data_envio: `${envioData.data_envio} ${new Date().toTimeString().slice(0,5)}`,
      metodo_envio: envioData.metodo_envio,
      observacoes: `Enviado via ${envioData.metodo_envio} em ${format(new Date(envioData.data_envio), 'dd/MM/yyyy')}`
    });
    setShowEnvioModal(false);
    setSelectedFolha(null);
    setEnvioData({ data_envio: format(new Date(), 'yyyy-MM-dd'), metodo_envio: '' });
  };

  const handleProcessarRetorno = async () => {
    const dataRetorno = { data_retorno_distribuidora: retornoData.data_retorno };

    if (retornoData.parecer === 'aprovado') {
      await updateStatus(selectedFolha, 'aprovado', {
        ...dataRetorno,
        observacoes: `Folha aprovada pela distribuidora em ${format(new Date(retornoData.data_retorno), 'dd/MM/yyyy')}`
      });
      setShowRetornoModal(false);
      setSelectedFolha(null);
      setRetornoData({
        parecer: 'aprovado',
        data_retorno: format(new Date(), 'yyyy-MM-dd'),
        tipo_motivo_reprovacao: '',
        motivo_reprovacao: ''
      });
    } else {
      // 1. Atualizar a folha original APENAS com dados de reprovação (SEM ALTERAR O HISTÓRICO)
      const reprovacaoDataOriginal = {
        status: 'reprovado',
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
          status: 'reprovado',
          data: new Date().toISOString(),
          usuario: 'sistema',
          observacoes: `Reprovado em ${format(new Date(retornoData.data_retorno), 'dd/MM/yyyy')}: ${retornoData.tipo_motivo_reprovacao} - ${retornoData.motivo_reprovacao}`
        },
        {
          status: 'pendente',
          data: new Date().toISOString(),
          usuario: 'sistema',
          observacoes: `Folha de correção criada automaticamente após reprovação da ${selectedFolha.numero_fm}`
        }
      ];

      // 3. Preparar dados para nova versão
      const numeroFMBase = selectedFolha.numero_fm.includes('-v')
        ? selectedFolha.numero_fm.split('-v')[0]
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
        status: 'pendente',
        versao: novaVersao,
        folha_original_id: selectedFolha.folha_original_id || selectedFolha.id,
        eh_correcao: true,
        status_historico: historicoCompleto, // Histórico completo construído acima
        
        // Limpar campos de processo (para poder reenviar)
        data_envio: null,
        metodo_envio: null,
        data_retorno_distribuidora: null,
        motivo_reprovacao: '',
        tipo_motivo_reprovacao: '',
        data_pagamento: null,
        numero_pagamento: '',
        motivo_cancelamento: null
      };

      // 4. Criar a nova folha de correção
      try {
        const novaFolha = await FolhaMedicao.create(novaFolhaData);
        
        setShowRetornoModal(false);
        setSelectedFolha(null);
        setRetornoData({
          parecer: 'aprovado',
          data_retorno: format(new Date(), 'yyyy-MM-dd'),
          tipo_motivo_reprovacao: '',
          motivo_reprovacao: ''
        });
        
        await loadFolhas(); // Recarregar a lista
        
        // Redirecionar para EDIÇÃO da nova folha, não para clonagem
        if(novaFolha && novaFolha.id) {
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
      // manter como YYYY-MM-DD para coluna DATE
      data_pagamento: pagamentoData.data_pagamento,
      observacoes: `Pagamento registrado - NF: ${pagamentoData.numero_pagamento}`
    };
    await updateStatus(selectedFolha, 'pago', pagamentoPayload);
    setShowPagamentoModal(false);
    setSelectedFolha(null);
  };

  const handleCancelarFolha = async () => {
    if (!cancelamentoData.motivo_cancelamento) {
      alert('Por favor, informe o motivo do cancelamento.');
      return;
    }
    await updateStatus(selectedFolha, 'cancelado', {
      motivo_cancelamento: cancelamentoData.motivo_cancelamento,
      observacoes: `Folha cancelada. Motivo: ${cancelamentoData.motivo_cancelamento}`
    });
    setShowCancelamentoModal(false);
    setSelectedFolha(null);
  };

  const handleExportToTemplate = (folha) => {
    if (!folha?.id) {
      alert('Registro invalido para exportacao.');
      return;
    }

    setExportError(null);
    setPendingExportFolha(folha);
  };

  useEffect(() => {
    if (!pendingExportFolha) {
      return;
    }

    let isCancelled = false;

    async function runExport() {
      try {
        setExportingFolhaId(pendingExportFolha.id);
        await exportFolhaById(pendingExportFolha.id, { fallbackData: pendingExportFolha });
      } catch (error) {
        console.error('Erro ao exportar folha:', error);
        if (!isCancelled) {
          setExportError(error?.message || 'Nao foi possivel exportar esta folha.');
        }
      } finally {
        if (!isCancelled) {
          setExportingFolhaId(null);
          setPendingExportFolha(null);
        }
      }
    }

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

    const headers = [
        "Numero FM", "Versao", "Projeto", "Municipio", "Data Obra",
        "Status", "Data Envio", "Metodo Envio", "Data Retorno", "Tipo Motivo Reprovacao",
        "Motivo Reprovacao", "Valor Total", "Data Pagamento", "Numero Pagamento", "Motivo Cancelamento"
    ];

    const rows = filteredFolhas.map(f => [
        f.numero_fm || '',
        f.versao || '1',
        f.projeto || '',
        f.municipio || '',
        f.data_obra ? format(new Date(f.data_obra), 'dd/MM/yyyy') : '',
        statusConfig[f.status]?.label || f.status,
        f.data_envio ? format(new Date(f.data_envio), 'dd/MM/yyyy') : '',
        f.metodo_envio || '',
        f.data_retorno_distribuidora ? format(new Date(f.data_retorno_distribuidora), 'dd/MM/yyyy') : '',
        f.tipo_motivo_reprovacao || '',
        f.motivo_reprovacao || '',
        (f.valor_total !== undefined && f.valor_total !== null) ? f.valor_total.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00',
        f.data_pagamento ? format(new Date(f.data_pagamento), 'dd/MM/yyyy') : '',
        f.numero_pagamento || '',
        f.motivo_cancelamento || ''
    ].map(item => `"${String(item).replace(/"/g, '""')}"`).join(';')); // Usando ponto e vírgula e aspas para melhor compatibilidade com Excel em português

    const csvContent = "\uFEFF" + headers.map(item => `"${String(item).replace(/"/g, '""')}"`).join(';') + "\n"
        + rows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "folhas_de_medicao.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPrazoClass = (folha) => {
    if (folha.status !== 'pendente' || !folha.data_obra) return ""; 
    const obraDate = parseLocalDate(folha.data_obra);
    if (!obraDate || Number.isNaN(obraDate.getTime())) return "";
    const hoje = new Date();
    const dueDate = addBusinessDays(obraDate, 2);
    const diasRestantes = differenceInBusinessDays(dueDate, hoje);
    if (diasRestantes < 0) return { className: "bg-red-100", icon: AlertOctagon, text: "Atrasado" };
    if (diasRestantes === 0) return { className: "bg-orange-100", icon: AlertTriangle, text: "Vence Hoje" };
    if (diasRestantes === 1) return { className: "bg-yellow-100", icon: Clock, text: "Falta 1 dia" };
    return "";
  };

  // Helper para contagem no resumo
  const getPrazoStatus = (folha) => {
    if (folha.status !== 'pendente' || !folha.data_obra) return 'none';

    const obraDate = parseLocalDate(folha.data_obra);
    if (!obraDate || Number.isNaN(obraDate.getTime())) return 'none';
    const hoje = new Date();
    const dueDate = addBusinessDays(obraDate, 2);
    const diasRestantes = differenceInBusinessDays(dueDate, hoje);

    if (diasRestantes < 0) return 'atrasado';
    if (diasRestantes === 0) return 'vence_hoje';
    return 'outros';
  };

  const renderStatusBadge = (status) => {
    const config = statusConfig[status];
    if(!config) return null;
    const Icon = config.icon;
    return <Badge variant="secondary" className={`${config.color} border font-medium`}><Icon className="w-3 h-3 mr-1" />{config.label}</Badge>;
  };

  // Evita regressão de um dia ao exibir datas 'YYYY-MM-DD' (trata como local)
  const parseLocalDate = (str) => {
    if (!str) return null;
    if (typeof str === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(str)) {
        // Normaliza espaço para 'T' e deixa o motor tratar como local
        return new Date(str.replace(' ', 'T'));
      }
    }
    return new Date(str);
  };

  const renderActionButtons = (folha) => (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="icon"
        title="Exportar template"
        onClick={() => handleExportToTemplate(folha)}
        disabled={exportingFolhaId === folha.id}
      >
        <FileDown className="w-4 h-4 text-emerald-600" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        title="Detalhes"
        onClick={() => { setSelectedFolha(folha); setShowDetailsModal(true); }}
      >
        <Eye className="w-4 h-4 text-blue-600" />
      </Button>
      {folha.status === 'pendente' && (
        <Button
          variant="outline"
          size="icon"
          title="Enviar para aprovação"
          onClick={() => { setSelectedFolha(folha); setShowEnvioModal(true); }}
        >
          <Send className="w-4 h-4 text-green-600" />
        </Button>
      )}
      {folha.status === 'aguardando_aprovacao' && (
        <Button
          variant="outline"
          size="icon"
          title="Registrar retorno"
          onClick={() => { setSelectedFolha(folha); setShowRetornoModal(true); }}
        >
          <Edit className="w-4 h-4 text-orange-600" />
        </Button>
      )}
      {folha.status === 'aprovado' && (
        <Button variant="outline" size="icon" title="Registrar pagamento" onClick={() => { setSelectedFolha(folha); setShowPagamentoModal(true); }}>
          <DollarSign className="w-4 h-4 text-purple-600" />
        </Button>
      )}
       {['pendente', 'aguardando_aprovacao'].includes(folha.status) && (
        <Button variant="outline" size="icon" title="Cancelar folha" onClick={() => { setSelectedFolha(folha); setShowCancelamentoModal(true); }}>
          <XCircle className="w-4 h-4 text-red-600" />
        </Button>
      )}
    </div>
  );

  const renderHistoricoTimeline = (historico) => {
    if (!historico || historico.length === 0) return <p className="text-gray-500 text-sm">Nenhum histórico disponível.</p>;

    return (
      <div className="space-y-3">
        {historico.map((item, index) => {
          const config = statusConfig[item.status];
          const Icon = config?.icon || History;
          return (
            <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${config?.color || 'bg-gray-100'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm">{config?.label || item.status}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(item.data), 'dd/MM/yy HH:mm', { locale: ptBR })}
                  </span>
                </div>
                {item.observacoes && (
                  <p className="text-sm text-gray-600 mt-1">{item.observacoes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

 //+++++
  const selectedObraDate = selectedFolha?.data_obra ? parseLocalDate(selectedFolha.data_obra) : null;
//+++++



  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/*<div className="max-w-7xl mx-auto"> */}  
      <div className="mx-auto w-full max-w-[1800px]">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Lista de Folhas de Medição</h1>
        </motion.div>

        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-3 flex flex-col md:flex-row md:flex-nowrap items-stretch md:items-center gap-3 md:gap-4">
            <Input
              placeholder="Buscar por Número FM, Projeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth={false}
              className="flex-1 min-w-0"
            />
            <div className="w-full md:w-[420px] shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[420px] shrink-0">
              <Button
                onClick={handleExportToCSV}
                variant="outline"
                disabled={filteredFolhas.length === 0}
                className="w-full"
              >
                <FileDown className="w-4 h-4 mr-2" />
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
        <Card className="shadow-lg border-0">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4 px-2">
              <p className="text-sm text-gray-600">
                {filteredFolhas.length} folha(s) encontrada(s)
                {searchTerm && ` para "${searchTerm}"`}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Pendentes totais: {filteredFolhas.filter(f => f.status === 'pendente').length}
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Atrasadas: {filteredFolhas.filter(f => getPrazoStatus(f) === 'atrasado').length}
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Vencem Hoje: {filteredFolhas.filter(f => getPrazoStatus(f) === 'vence_hoje').length}
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
                  <TableHead className="w-64">Valor</TableHead>
                  <TableHead className="w-64">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                  </TableRow>
                ) : filteredFolhas.map(folha => {
                  const prazoInfo = getPrazoClass(folha);
                  const PrazoIcon = prazoInfo.icon;
                  return (
                    <TableRow key={folha.id} className={prazoInfo.className}>
                      <TableCell className="font-mono font-semibold">{folha.numero_fm}</TableCell>
                      <TableCell>{folha.projeto}</TableCell>
                      <TableCell>{folha.tipo_processo}</TableCell>
                      <TableCell>{folha.municipio}</TableCell>
                      <TableCell>{folha.data_obra ? format(parseLocalDate(folha.data_obra), 'dd/MM/yy') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{folha.data_envio ? format(parseLocalDate(folha.data_envio), 'dd/MM/yy') : '-'}</span>
                          {folha.metodo_envio && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              {folha.metodo_envio === 'E-mail' ? <Mail className="w-3 h-3" /> : <Share className="w-3 h-3" />}
                              {folha.metodo_envio}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{folha.data_retorno_distribuidora ? format(parseLocalDate(folha.data_retorno_distribuidora), 'dd/MM/yy') : '-'}</TableCell>
                      <TableCell>{renderStatusBadge(folha.status)}</TableCell>
                      <TableCell>
                        {PrazoIcon && (
                          <div className="flex items-center gap-1 text-sm">
                            <PrazoIcon className="w-4 h-4"/>
                            {prazoInfo.text}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-left font-semibold">
                        {(folha.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>{renderActionButtons(folha)}</TableCell>
                    </TableRow>
                  );
                })}
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
              <DialogDescription>Visualize as informações completas da folha selecionada.</DialogDescription>
            </DialogHeader>
            {selectedFolha && (
              <div className="space-y-6 p-1">
                {/* Dados Gerais */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardHeader><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Empreiteira:</strong> {selectedFolha.empreiteira}</div>
                    <div><strong>Técnico Light:</strong> {selectedFolha.tecnico_light || 'N/A'}</div>
                    <div><strong>Município:</strong> {selectedFolha.municipio}</div>
                    <div><strong>Projeto:</strong> {selectedFolha.projeto}</div>
                    <div>
                      <strong>Data da Obra:</strong>{' '}
                      {selectedObraDate && !Number.isNaN(selectedObraDate.getTime())
                        ? format(selectedObraDate, 'dd/MM/yyyy')
                        : 'N/A'}
                    </div>
                    <div><strong>Status Atual:</strong> {renderStatusBadge(selectedFolha.status)}</div>
                  </CardContent>
                </Card>

                {/* Valores Financeiros */}
                {(selectedFolha.valor_total !== undefined && selectedFolha.valor_total !== null) && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader><CardTitle className="text-base text-green-800">Informações Financeiras</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-700">
                        R$ {selectedFolha.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  <Card><CardHeader><CardTitle className="text-base">Equipes ({selectedFolha.equipes.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                      {selectedFolha.equipes.map((equipe, index) => (
                        <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                          <strong>Equipe:</strong> {equipe.codigo_equipe} - <strong>Enc:</strong> {equipe.encarregado}
                        </div>
                      ))}
                  </CardContent></Card>
                )}

                {/* Serviços */}
                {selectedFolha.servicos?.length > 0 && (
                  <Card><CardHeader><CardTitle className="text-base">Serviços ({selectedFolha.servicos.length})</CardTitle></CardHeader>
                  <CardContent className="max-h-40 overflow-y-auto space-y-2">
                      {selectedFolha.servicos.map((servico, index) => (
                        <div key={index} className="p-2 bg-green-50 rounded text-sm flex justify-between">
                          <span>{servico.descricao}</span>
                          <span>Qtd: {servico.quantidade}</span>
                        </div>
                      ))}
                  </CardContent></Card>
                )}

                {/* Equipamentos */}
                {(selectedFolha.equipamentos_instalados?.length > 0 || selectedFolha.equipamentos_retirados?.length > 0) && (
                  <Card><CardHeader><CardTitle className="text-base">Equipamentos</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-xs">
                     <div>
                        <h4 className="font-semibold text-sm mb-1">Instalados:</h4>
                        {selectedFolha.equipamentos_instalados?.map((item, i) => <div key={i} className="p-1 bg-slate-100 rounded">S: {item.serial}, F: {item.fabricante}</div>) || 'Nenhum'}
                     </div>
                     <div>
                        <h4 className="font-semibold text-sm mb-1">Retirados:</h4>
                        {selectedFolha.equipamentos_retirados?.map((item, i) => <div key={i} className="p-1 bg-slate-100 rounded">S: {item.serial}, F: {item.fabricante}</div>) || 'Nenhum'}
                     </div>
                  </CardContent></Card>
                )}

                {/* Materiais */}
                {(selectedFolha.materiais_instalados?.length > 0 || selectedFolha.materiais_retirados?.length > 0) && (
                  <Card><CardHeader><CardTitle className="text-base">Materiais</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-xs">
                     <div>
                        <h4 className="font-semibold text-sm mb-1">Instalados:</h4>
                        {selectedFolha.materiais_instalados?.map((item, i) => <div key={i} className="p-1 bg-slate-100 rounded">{item.descricao} (Qtd: {item.quantidade})</div>) || 'Nenhum'}
                     </div>
                     <div>
                        <h4 className="font-semibold text-sm mb-1">Retirados:</h4>
                        {selectedFolha.materiais_retirados?.map((item, i) => <div key={i} className="p-1 bg-slate-100 rounded">{item.descricao} (Qtd: {item.quantidade})</div>) || 'Nenhum'}
                     </div>
                  </CardContent></Card>
                )}


                {/* Histórico */}
                <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Histórico da Folha</CardTitle></CardHeader>
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
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Send className="w-5 h-5" />
                Enviar Folha para Distribuidora
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes do envio da folha {selectedFolha?.numero_fm}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Data de Envio</label>
                <Input
                  type="date"
                  value={envioData.data_envio}
                  onChange={(e) => setEnvioData({...envioData, data_envio: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Método de Envio *</label>
                <Select value={envioData.metodo_envio} onValueChange={(v) => setEnvioData({...envioData, metodo_envio: v})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent position="popper">
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
              <Button type="button" variant="outline" onClick={() => setShowEnvioModal(false)}>Cancelar</Button>
              <Button type="button" onClick={handleEnviarFolha} className="bg-green-600 hover:bg-green-700">
                Confirmar Envio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Retorno */}
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
                <label className="text-sm font-semibold mb-2 block">Data do Retorno *</label>
                <Input
                  type="date"
                  value={retornoData.data_retorno}
                  onChange={(e) => setRetornoData({...retornoData, data_retorno: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Parecer da Distribuidora *</label>
                <Select value={retornoData.parecer} onValueChange={(v) => setRetornoData({...retornoData, parecer: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
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

              {retornoData.parecer === 'reprovado' && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Detalhes da Reprovação
                  </h4>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Tipo do Motivo *</label>
                    <Select
                      value={retornoData.tipo_motivo_reprovacao}
                      onValueChange={(v) => setRetornoData({...retornoData, tipo_motivo_reprovacao: v})}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo do erro"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Erro Lançamentos de Serviços">Erro Lançamentos de Serviços</SelectItem>
                        <SelectItem value="Erro Dados Cadastrais">Erro Dados Cadastrais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Motivo Detalhado *</label>
                    <Textarea
                      placeholder="Detalhe o motivo da reprovação conforme retorno da distribuidora..."
                      value={retornoData.motivo_reprovacao}
                      onChange={(e) => setRetornoData({...retornoData, motivo_reprovacao: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Uma nova folha de correção (versão {(selectedFolha?.versao || 1) + 1}) será criada automaticamente com status "Pendente" para reenvio.
                    </p>
                  </div>
                </div>
              )}

              {retornoData.parecer === 'aprovado' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Sucesso:</strong> A folha será marcada como aprovada e ficará disponível para registro de pagamento.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRetornoModal(false)}>Cancelar</Button>
              <Button
                onClick={handleProcessarRetorno}
                className={retornoData.parecer === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
              >
                {retornoData.parecer === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Pagamento */}
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
                onChange={(e) => setPagamentoData({...pagamentoData, numero_pagamento: e.target.value})}
              />
              <Input
                type="date"
                value={pagamentoData.data_pagamento}
                onChange={(e) => setPagamentoData({...pagamentoData, data_pagamento: e.target.value})}
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleRegistrarPagamento}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Cancelamento */}
        <Dialog open={showCancelamentoModal} onOpenChange={setShowCancelamentoModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Cancelar Folha de Medição
              </DialogTitle>
              <DialogDescription>
                Justifique o motivo para cancelar a folha {selectedFolha?.numero_fm}. Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Motivo do Cancelamento *</label>
                <Textarea
                  placeholder="Ex: Erro de digitação, solicitação da distribuidora, etc."
                  value={cancelamentoData.motivo_cancelamento}
                  onChange={(e) => setCancelamentoData({motivo_cancelamento: e.target.value})}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCancelamentoModal(false)}>Voltar</Button>
              <Button type="button" onClick={handleCancelarFolha} className="bg-red-600 hover:bg-red-700">
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

