import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Zap, Calendar, Users } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/components/formatters";

export default function MetricasCards({ servicos, isLoading }) {
  const totalServicos = servicos.length;
  const totalValor = servicos.reduce((sum, servico) => sum + (servico.valor_servicos || 0), 0);
  const mediaValor = totalServicos > 0 ? totalValor / totalServicos : 0;
  
  const servicosEstesMes = servicos.filter(servico => {
    const dataServico = new Date(servico.data_programacao);
    const agora = new Date();
    return dataServico.getMonth() === agora.getMonth() && 
           dataServico.getFullYear() === agora.getFullYear();
  }).length;

  const cards = [
    {
      title: "Total de Serviços",
      value: totalServicos.toString(),
      icon: Zap,
      bgColor: "bg-blue-500",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50",
      trend: servicosEstesMes > 0 ? `${servicosEstesMes} este mês` : "Sem dados este mês"
    },
    {
      title: "Faturamento Total",
      value: formatCurrency(totalValor),
      icon: DollarSign,
      bgColor: "bg-green-500",
      textColor: "text-green-600",
      bgLight: "bg-green-50",
      trend: mediaValor > 0 ? `Média: ${formatCurrency(mediaValor)}` : "Sem dados"
    },
    {
      title: "Serviços Este Mês",
      value: servicosEstesMes.toString(),
      icon: Calendar,
      bgColor: "bg-purple-500",
      textColor: "text-purple-600",
      bgLight: "bg-purple-50",
      trend: servicosEstesMes > 0 ? "Em andamento" : "Sem programação"
    },
    {
      title: "Projetos Únicos",
      value: new Set(servicos.map(s => s.projeto)).size.toString(),
      icon: Users,
      bgColor: "bg-orange-500",
      textColor: "text-orange-600",
      bgLight: "bg-orange-50",
      trend: `${new Set(servicos.map(s => s.municipio)).size} municípios`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${card.bgColor} rounded-full opacity-10`} />
            <CardHeader className="p-6 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-600 mb-1">
                    {card.title}
                  </CardTitle>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    {isLoading ? "..." : card.value}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${card.bgLight}`}>
                  <card.icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="flex items-center text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />
                <span className="text-gray-600">{card.trend}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}