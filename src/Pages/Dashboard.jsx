import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, TrendingUp, Zap } from "lucide-react";
import { getServicos } from "@/components/api";
import MetricasCard from "../components/dashboard/MetricasCard";
import GraficoTipoProcesso from "../components/dashboard/GraficoTipoProcesso";
import TabelaRecentes from "../components/dashboard/TabelaRecentes";
import PrevisaoFaturamento from "../components/dashboard/PrevisaoFaturamento";

export default function Dashboard() {
  const [servicos, setServicos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadServicos();
  }, []);

  const loadServicos = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getServicos(); 
      setServicos(data);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      const friendlyMessage =
        error?.message &&
        error.message.includes("URL base da API não está configurada")
          ? "Não foi possível carregar os serviços porque a URL da API não está configurada. Verifique as variáveis de ambiente."
          : "Não foi possível carregar os serviços no momento. Tente novamente em instantes.";

      setErrorMessage(friendlyMessage);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Dashboard Operacional
              </h1>
              <p className="text-gray-600 text-lg">
                Monitoramento dos serviços elétricos
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          {/* Cards de Métricas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <MetricasCard servicos={servicos} isLoading={isLoading} />
          </motion.div>

          {/* Previsão de Faturamento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PrevisaoFaturamento servicos={servicos} isLoading={isLoading} />
          </motion.div>

          {/* Gráficos por Tipo de Processo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <GraficoTipoProcesso servicos={servicos} isLoading={isLoading} />
          </motion.div>

          {/* Tabela de Serviços Recentes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <TabelaRecentes servicos={servicos} isLoading={isLoading} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}