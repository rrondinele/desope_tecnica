import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Eye, Send, Edit, DollarSign, XCircle } from "lucide-react";

const FolhaActions = ({
  folha,
  isExporting,
  onExport,
  onView,
  onEnviar,
  onRetorno,
  onPagamento,
  onCancelar,
}) => {
  if (!folha) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        title="Exportar Folha de Medição"
        onClick={() => onExport?.(folha)}
        disabled={isExporting}
      >
        <FileDown className="w-4 h-4 text-emerald-600" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        title="Detalhes"
        onClick={() => onView?.(folha)}
      >
        <Eye className="w-4 h-4 text-blue-600" />
      </Button>

      {folha.status === "pendente" && (
        <Button
          variant="outline"
          size="icon"
          title="Enviar para aprovação"
          onClick={() => onEnviar?.(folha)}
        >
          <Send className="w-4 h-4 text-green-600" />
        </Button>
      )}

      {folha.status === "aguardando_aprovacao" && (
        <Button
          variant="outline"
          size="icon"
          title="Registrar retorno"
          onClick={() => onRetorno?.(folha)}
        >
          <Edit className="w-4 h-4 text-orange-600" />
        </Button>
      )}

      {folha.status === "aprovado" && (
        <Button
          variant="outline"
          size="icon"
          title="Registrar pagamento"
          onClick={() => onPagamento?.(folha)}
        >
          <DollarSign className="w-4 h-4 text-purple-600" />
        </Button>
      )}

      {['pendente', 'aguardando_aprovacao'].includes(folha.status) && (
        <Button
          variant="outline"
          size="icon"
          title="Cancelar folha"
          onClick={() => onCancelar?.(folha)}
        >
          <XCircle className="w-4 h-4 text-red-600" />
        </Button>
      )}
    </div>
  );
};

export default FolhaActions;
