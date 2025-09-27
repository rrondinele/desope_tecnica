import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STATUS_CONFIG } from "@/config/listafolhaConfig";
import { History, User } from "lucide-react"; // Importar ícone de usuário

const HistoricoTimeline = ({ historico = [], statusConfig = STATUS_CONFIG }) => {
  if (!Array.isArray(historico) || historico.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum histórico disponível.</p>;
  }

  return (
    <div className="space-y-3">
      {historico.map((item, index) => {
        const config = statusConfig[item.status];
        const Icon = config?.icon || History;

        return (
          <div key={`${item.status}-${index}`} className="flex gap-3 rounded-lg bg-gray-50 p-3">
            <div className={`rounded-full p-2 ${config?.color || "bg-gray-100"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold">{config?.label || item.status}</span>
                {item.data && (
                  <span className="text-xs text-gray-500">
                    {format(new Date(item.data), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
              {item.usuario && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>{item.usuario}</span>
                </div>
              )}
              {item.observacoes && (
                <p className="mt-1 text-sm text-gray-600">{item.observacoes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoricoTimeline;
