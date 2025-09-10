import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function GraficoTipoProcesso({ servicos, isLoading }) {
  const processData = servicos.reduce((acc, servico) => {
    const tipo = servico.tipo_processo || 'Não definido';
    if (!acc[tipo]) {
      acc[tipo] = { tipo, quantidade: 0, valor: 0 };
    }
    acc[tipo].quantidade += 1;
    acc[tipo].valor += servico.valor_servicos || 0;
    return acc;
  }, {});

  const chartData = Object.values(processData).map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  const pieData = chartData.map(item => ({
    name: item.tipo,
    value: item.quantidade,
    color: item.color
  }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Activity className="w-5 h-5 text-blue-600" />
            Serviços por Tipo de Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="tipo" 
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="quantidade" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Activity className="w-5 h-5 text-green-600" />
            Distribuição de Processos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  fontSize={12}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}