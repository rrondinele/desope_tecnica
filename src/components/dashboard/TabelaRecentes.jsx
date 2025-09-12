import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/components/formatters";
import { Clock, MapPin, DollarSign } from "lucide-react";

const tipoProcessoCores = {
  "Expansão": "bg-blue-100 text-blue-800 border-blue-200",
  "Manutenção": "bg-green-100 text-green-800 border-green-200"
};

export default function TabelaRecentes({ servicos, isLoading }) {
  const servicosRecentes = servicos
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Clock className="w-5 h-5 text-blue-600" />
          Serviços Recentes
        </CardTitle>
        <p className="text-sm text-gray-600">Últimas 10 programações cadastradas</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : servicosRecentes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Projeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicosRecentes.map((servico, index) => (
                  <TableRow 
                    key={servico.id || index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold text-gray-900">{servico.projeto}</div>
                        <div className="text-xs text-gray-500">OS: {servico.ordem_servico}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`${tipoProcessoCores[servico.tipo_processo] || 'bg-gray-100 text-gray-800'} border font-medium`}

                      >
                        {servico.tipo_processo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{servico.municipio}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(servico.data_programacao)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {formatCurrency(servico.valor_servicos)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
            <p>Comece cadastrando sua primeira programação de serviço.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}