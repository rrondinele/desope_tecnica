import React, { useState, useEffect, useMemo } from "react";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Clock, Hourglass, DollarSign, PieChart, BarChart3, AlertTriangle, CheckCircle, Send, Calendar
} from "lucide-react";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { format, differenceInBusinessDays, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

const statusConfig = {
  pendente: { label: "Pendente", color: "#f59e0b", icon: Clock },
  aguardando_aprovacao: { label: "Aguardando", color: "#3b82f6", icon: Send },
  aprovado: { label: "Aprovado", color: "#10b981", icon: CheckCircle },
  reprovado: { label: "Reprovado", color: "#f97316", icon: AlertTriangle },
  pago: { label: "Pago", color: "#8b5cf6", icon: DollarSign },
  cancelado_distribuidora: { label: "Cancelado por Distribuidora", color: "#ef4444", icon: AlertTriangle },
  cancelado_empreitera: { label: "Cancelado por Empreitera", color: "#ef4444", icon: AlertTriangle }
};

// Helper para corrigir a data para o fuso local
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

export default function DashboardFinanceiro() {
  const [folhas, setFolhas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await FolhaMedicao.list("-created_date");
        setFolhas(data);
      } catch (error) {
        console.error("Erro ao carregar folhas:", error);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const kpisFinanceiros = useMemo(() => {
    const comEnvio = folhas.filter(f => parseLocalDate(f.data_obra) && parseLocalDate(f.data_envio));
    const comRetorno = folhas.filter(f => parseLocalDate(f.data_envio) && parseLocalDate(f.data_retorno_distribuidora));


    
    const tempoMedioEnvio = comEnvio.length > 0 ? 
      comEnvio.reduce((acc, f) => acc + differenceInBusinessDays(parseLocalDate(f.data_envio), parseLocalDate(f.data_obra)), 0) / comEnvio.length : 0;
    const tempoMedioResposta = comRetorno.length > 0 ? 
      comRetorno.reduce((acc, f) => acc + differenceInBusinessDays(parseLocalDate(f.data_retorno_distribuidora), parseLocalDate(f.data_envio)), 0) / comRetorno.length : 0;

    const valorPorStatus = folhas.reduce((acc, f) => {
      const valor = f.valor_total || 0;
      acc[f.status] = (acc[f.status] || 0) + valor;
      return acc;
    }, {});

    const valorAprovadoNaoPago = valorPorStatus.aprovado || 0;
    const valorPago = valorPorStatus.pago || 0;
    const valorAguardandoAprovacao = valorPorStatus.aguardando_aprovacao || 0;
    const valorTotal = Object.values(valorPorStatus).reduce((sum, val) => sum + val, 0);
    const valorTotalAprovado = valorAprovadoNaoPago + valorPago; // Novo cálculo

    const folhasAprovadas = folhas.filter(f => f.status === 'aprovado').length;
    const folhasPagas = folhas.filter(f => f.status === 'pago').length;
    const totalFolhasAprovadas = folhasAprovadas + folhasPagas; // Novo cálculo

    return {
      tempoMedioEnvio: tempoMedioEnvio.toFixed(1),
      tempoMedioResposta: tempoMedioResposta.toFixed(1),
      valorAprovadoNaoPago,
      valorPago,
      valorTotalAprovado, // Adicionar este
      valorAguardandoAprovacao,
      valorTotal,
      folhasAprovadas,
      folhasPagas,
      totalFolhasAprovadas, // Adicionar este
      taxaAprovacao: folhas.length > 0 ? ((folhas.filter(f => f.status === 'aprovado' || f.status === 'pago').length / folhas.length) * 100).toFixed(1) : 0
    };
  }, [folhas]);

  const chartDataStatus = useMemo(() => {
    const statusCounts = folhas.reduce((acc, f) => {
      if (statusConfig[f.status]) {
        acc[f.status] = {
          count: (acc[f.status]?.count || 0) + 1,
          valor: (acc[f.status]?.valor || 0) + (f.valor_total || 0)
        };
      }
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([status, data]) => ({
      name: statusConfig[status].label,
      count: data.count,
      valor: data.valor,
      fill: statusConfig[status].color
    }));
  }, [folhas]);

  const chartDataTempo = useMemo(() => {
    const ultimosSeisMeses = [];
    for (let i = 5; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      
      const folhasDoMes = folhas.filter(f => 
        f.created_date && isWithinInterval(parseLocalDate(f.created_date), { start: inicioMes, end: fimMes })
      );

      const comEnvio = folhasDoMes.filter(f => parseLocalDate(f.data_obra) && parseLocalDate(f.data_envio));
      const tempoMedio = comEnvio.length > 0 ?
        comEnvio.reduce((acc, f) => acc + differenceInBusinessDays(parseLocalDate(f.data_envio), parseLocalDate(f.data_obra)), 0) / comEnvio.length : 0;

      ultimosSeisMeses.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        tempoMedioEnvio: parseFloat(tempoMedio.toFixed(1)),
        valorTotal: folhasDoMes.reduce((sum, f) => sum + (f.valor_total || 0), 0)
      });
    }
    return ultimosSeisMeses;
  }, [folhas]);

  const reprovacaoData = useMemo(() => {
    const reprovadas = folhas.filter(f => f.status === 'reprovado' && f.tipo_motivo_reprovacao);
    const counts = reprovadas.reduce((acc, f) => {
      acc[f.tipo_motivo_reprovacao] = {
        count: (acc[f.tipo_motivo_reprovacao]?.count || 0) + 1,
        valor: (acc[f.tipo_motivo_reprovacao]?.valor || 0) + (f.valor_total || 0)
      };
      return acc;
    }, {});
    return Object.entries(counts).map(([name, data]) => ({ name, ...data }));
  }, [folhas]);

  const forecastData = useMemo(() => {
    const meses = [];
    const agora = new Date();
    
    for (let i = -5; i <= 6; i++) {
      const mes = addMonths(startOfMonth(agora), i);
      meses.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        histórico: 0,
        projeção: null,
      });
    }

    const folhasPagas = folhas.filter(f => f.status === 'pago' && f.data_pagamento);
    folhasPagas.forEach(f => {
      const mesPagamento = startOfMonth(parseLocalDate(f.data_pagamento));
      const mesString = format(mesPagamento, "MMM/yy", { locale: ptBR });
      const index = meses.findIndex(m => m.mes === mesString);
      if (index !== -1) {
        meses[index].histórico += f.valor_total || 0;
      }
    });

    const ultimosMesesComDados = meses.filter(m => m.histórico > 0).slice(-3);
    const mediaFaturamento = ultimosMesesComDados.length > 0
      ? ultimosMesesComDados.reduce((sum, m) => sum + m.histórico, 0) / ultimosMesesComDados.length
      : 0;
    
    const ultimoHistoricoMes = meses.filter(m => m.histórico > 0).pop();
    const ultimoIndiceHistorico = ultimoHistoricoMes ? meses.findIndex(m => m.mes === ultimoHistoricoMes.mes) : -1;

    if (ultimoIndiceHistorico !== -1) {
        meses[ultimoIndiceHistorico].projeção = meses[ultimoIndiceHistorico].histórico;
    }

    for (let i = ultimoIndiceHistorico + 1; i < meses.length; i++) {
        meses[i].projeção = mediaFaturamento > 0 ? mediaFaturamento * (0.95 + Math.random() * 0.1) : 0;
    }

    return meses;
  }, [folhas]);
  
  const listasAcao = useMemo(() => ({
    pendentes: folhas.filter(f => f.status === 'pendente'),
    pagamento: folhas.filter(f => f.status === 'aprovado'),
    resposta: folhas.filter(f => f.status === 'aguardando_aprovacao')
  }), [folhas]);

  const kpiCards = [
    {
      title: "Em Análise",
      value: (kpisFinanceiros.valorAguardandoAprovacao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      subtitle: "Aguardando aprovação LIGHT",
      icon: Send,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Aprovadas",
      value: (kpisFinanceiros.valorTotalAprovado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      subtitle: `${kpisFinanceiros.totalFolhasAprovadas} folhas`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
        {
      title: "Pagas",
      value: (kpisFinanceiros.valorPago || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      subtitle: `${kpisFinanceiros.folhasPagas} folhas`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Tempo Médio Envio",
      value: `${kpisFinanceiros.tempoMedioEnvio} dias`,
      subtitle: "Da obra ao envio",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Tempo Médio Retorno",
      value: `${kpisFinanceiros.tempoMedioResposta} dias`,
      subtitle: "Da distribuidora",
      icon: Hourglass,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Taxa de Aprovação",
      value: `${kpisFinanceiros.taxaAprovacao}%`,
      subtitle: "Histórico geral",
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard Financeiro</h1>
              <p className="text-gray-600 text-lg">Análise de performance e ciclo financeiro das folhas de medição</p>
            </div>
          </div>
        </motion.div>
        
        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">{card.title}</h3>
                      <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                        {isLoading ? '...' : card.value}
                      </div>
                      <p className="text-xs text-gray-500">{card.subtitle}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${card.bgColor}`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="shadow-lg border-0 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Distribuição por Status (Valores)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={chartDataStatus}
                      dataKey="valor"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartDataStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tempo Médio por Mês (Com Área Sombreada) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="shadow-lg border-0 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  Tempo Médio de Envio (Últimos 6 Meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartDataTempo}>
                    <defs>
                      <linearGradient id="colorTempo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" fontSize={12} tick={{ fill: '#6b7280' }} />
                    <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                    <Tooltip formatter={(value) => [`${value} dias`, 'Tempo Médio']} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="tempoMedioEnvio" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      fill="url(#colorTempo)" 
                      fillOpacity={0.3}
                      name="Tempo Médio (dias)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Previsão de Faturamento */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Previsão de Faturamento (Folhas Pagas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={12} tick={{ fill: '#6b7280' }} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value, name) => [`R$ ${value.toLocaleString('pt-BR')}`, name.charAt(0).toUpperCase() + name.slice(1)]} />
                  <Legend />
                  <Line type="monotone" dataKey="histórico" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="projeção" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Motivos de Reprovação */}
        {reprovacaoData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Análise de Reprovações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reprovacaoData} layout="vertical" margin={{ left: 150 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => [
                      name === 'count' ? `${value} folhas` : `R$ ${value.toLocaleString('pt-BR')}`,
                      name === 'count' ? 'Quantidade' : 'Valor Total'
                    ]} />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Listas de Ação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Ações Prioritárias</CardTitle>
              <p className="text-sm text-gray-600">Folhas que requerem atenção imediata</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  title: 'Pendentes de Envio', 
                  icon: Send, 
                  data: listasAcao.pendentes, 
                  dateField: 'data_obra', 
                  status: 'pendente',
                  valorTotal: listasAcao.pendentes.reduce((sum, f) => sum + (f.valor_total || 0), 0)
                },
                { 
                  title: 'Aguardando Pagamento', 
                  icon: DollarSign, 
                  data: listasAcao.pagamento, 
                  dateField: 'data_retorno_distribuidora', 
                  status: 'aprovado',
                  valorTotal: listasAcao.pagamento.reduce((sum, f) => sum + (f.valor_total || 0), 0)
                },
                { 
                  title: 'Aguardando Resposta', 
                  icon: Hourglass, 
                  data: listasAcao.resposta, 
                  dateField: 'data_envio', 
                  status: 'aguardando_aprovacao',
                  valorTotal: listasAcao.resposta.reduce((sum, f) => sum + (f.valor_total || 0), 0)
                },
              ].map(({ title, icon: Icon, data, dateField, status, valorTotal }) => (
                <div key={title} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: statusConfig[status]?.color }} />
                      {title}
                    </h3>
                    <Badge variant="secondary" className="bg-gray-100">
                      {data.length} folhas
                    </Badge>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      R$ {valorTotal.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-500">Valor Total</div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {data.length > 0 ? data.slice(0, 5).map(f => (
                      <div key={f.id} className="p-3 bg-white rounded-lg border text-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs">{f.numero_fm}</span>
                          <span className="text-green-600 font-semibold">
                            R$ {(f.valor_total || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {f[dateField] ? format(new Date(f[dateField]), 'dd/MM/yy', { locale: ptBR }) : '-'}
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-500 p-3 bg-white rounded-lg text-center">
                        Nenhuma folha nesta etapa
                      </p>
                    )}
                    
                    {data.length > 5 && (
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          +{data.length - 5} folhas
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
