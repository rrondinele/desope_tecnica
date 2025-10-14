// components/folha/KanbanCard.jsx
import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye } from "lucide-react";
import { STATUS_CONFIG } from "@/config/listafolhaConfig";
import { formatCurrency } from "@/utils/listafolhaUtils";

export const KanbanCard = React.memo(({ folha, index, onActionClick, prazoInfo }) => {
  const StatusIcon = STATUS_CONFIG[folha.status]?.icon;
  
  return (
    <Draggable draggableId={folha.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 bg-white rounded-lg shadow-sm border mb-3 ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
          } hover:shadow-md transition-shadow duration-200`}
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
                      <prazoInfo.icon className={`w-4 h-4 ${prazoInfo.className?.replace('bg-', 'text-')}`} />
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