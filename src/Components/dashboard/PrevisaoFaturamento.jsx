import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, DollarSign } from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/components/formatters";

export default function PrevisaoFaturamento({ servicos, isLoading }) {
  // Calcular faturamento mensal dos últimos 6 meses e projeção para próximos 6
  const generateForecastData = () => {
    const meses = [];
    const agora = new Date();
    
    // 6 meses passados + mês atual + 5 meses futuros
    for (let i = -6; i <= 5; i++) {
      const mes = addMonths(startOfMonth(agora), i);
      const servicosDoMes = servicos.filter(servico => {
        const dataServico = new Date(servico.data_programacao);
        return dataServico.getMonth() === mes.getMonth() && 
               dataServico.getFullYear() === mes.getFullYear();
      });
      
      const faturamento = servicosDoMes.reduce((sum, s) => sum + (s.valor_servicos || 0), 0);
      
      meses.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        faturamento,
        isProjecao: i > 0,
        quantidade: servicosDoMes.length
      });
    }
    
    // Calcular projeção baseada na média dos últimos 3 meses
    const ultimosTresMeses = meses.slice(-9, -6); // 3 meses antes da projeção
    const mediaFaturamento = ultimosTresMeses.reduce((sum, m) => sum + m.faturamento, 0) / 3;
    
    // Aplicar projeção nos próximos meses
    meses.forEach(mes => {
      if (mes.isProjecao) {
        mes.faturamento = mediaFaturamento * (0.9 + Math.random() * 0.2); // Variação de ±10%
        mes.quantidade = Math.round((mes.faturamento / mediaFaturamento) * 
          (ultimosTresMeses.reduce((sum, m) => sum + m.quantidade, 0) / 3));
      }
    });
    
    return meses;
  };

  const dadosGrafico = generateForecastData();
  const faturamentoAtual = dadosGrafico.find(d => !d.isProjecao && d.mes === format(new Date(), "MMM/yy", { locale: ptBR }))?.faturamento || 0;
  const projecaoProximoMes = dadosGrafico.find(d => d.isProjecao)?.faturamento || 0;
  const crescimento = faturamentoAtual > 0 ? ((projecaoProximoMes - faturamentoAtual) / faturamentoAtual * 100) : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Previsão de Faturamento
          </CardTitle>
          <p className="text-sm text-gray-600">Histórico e projeção dos próximos meses</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mes" 
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  fontSize={12} 
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => [
                    formatCurrency(value),
                    'Faturamento'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="faturamento" 
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="faturamento" 
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                  data={dadosGrafico.filter(d => d.isProjecao)}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Calendar className="w-5 h-5 text-green-600" />
              Próximo Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Previsão de Faturamento</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(projecaoProximoMes)}
                </div>
              </div>
              <div className="flex items-center text-sm">
                <TrendingUp className={`w-4 h-4 mr-1 ${crescimento >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                <span className={crescimento >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {crescimento >= 0 ? '+' : ''}{crescimento.toFixed(1)}% vs mês atual
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Resumo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Faturamento Este Mês</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(faturamentoAtual)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total de Serviços</div>
                <div className="text-lg font-semibold text-gray-900">
                  {servicos.length} programações
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}