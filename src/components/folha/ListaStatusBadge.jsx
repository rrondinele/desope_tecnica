import React from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/config/listafolhaConfig";

const StatusBadge = ({ status, statusConfig = STATUS_CONFIG }) => {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={`${config.color} border font-medium`}>
      {Icon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
