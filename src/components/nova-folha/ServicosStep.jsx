import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DollarSign, Plus, Trash2, Calculator } from "lucide-react";

import {
  servicosDisponiveis,
  selecionarServico,
  calcularValorTotal,
  criarServico,
  removerServico as removerServicoLista,
  resetarServico,
  calcularValorServico,
  validarServico
} from "@/rules/servicosStepRules";

export default function ServicosStep({ data, updateData }) {
  const [novoServico, setNovoServico] = useState(resetarServico());
  const [valorTotalGeral, setValorTotalGeral] = useState(0);

  const calcularTotal = useCallback(() => calcularValorTotal(data.servicos), [data.servicos]);

  useEffect(() => {
    const total = calcularTotal();
    setValorTotalGeral(total);
    if (total !== data.valor_total) {
      updateData({ valor_total: total });
    }
  }, [data.servicos, data.valor_total, calcularTotal, updateData]);

  const handleServicoSelect = (descricao) => {
    const servicoSelecionado = selecionarServico(descricao);
    if (servicoSelecionado) {
      setNovoServico(prev => ({
        ...prev,
        ...servicoSelecionado,
        quantidade: prev.quantidade || 1
      }));
    }
  };

  const handleQuantidadeChange = (quantidade) => {
    const qtd = Math.max(0, parseFloat(parseFloat(quantidade).toFixed(2))) || 0;
    setNovoServico(prev => ({
      ...prev,
      quantidade: qtd
    }));
  };

  const adicionarNovoServico = () => {

    try {
      validarServico(novoServico, data.servicos);
      if (!novoServico.descricao || novoServico.quantidade <= 0) return;
      if (data.servicos?.some(s => s.descricao === novoServico.descricao)) return;

      const novo = criarServico(novoServico);
      const servicos = [...(data.servicos || []), novo];
      updateData({ servicos });
      setNovoServico(resetarServico(novoServico.quantidade));
    }
    catch (error) {
      alert(error.message);
    }
  };

  const removerServico = (id) => {
    const servicos = removerServicoLista(id, data.servicos);
    updateData({ servicos });
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Adicionar Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-700 font-medium">Descrição do Serviço<span className="text-red-600"> *</span></Label>
              <Select value={novoServico.descricao} onValueChange={handleServicoSelect}>
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicosDisponiveis.map((serv) => (
                    <SelectItem key={serv.codigo} value={serv.descricao}>
                      {serv.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Qtd.<span className="text-red-600"> *</span></Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={novoServico.quantidade}
                onChange={(e) => handleQuantidadeChange(e.target.value)}
                className="border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Valor Unit. (R$)</Label>
              <Input
                type="text"
                value={novoServico.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                disabled
                className="border-slate-200 bg-slate-100 font-mono"
              />
            </div>
          </div>

          {novoServico.descricao && novoServico.quantidade > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Valor total deste serviço:</span>
                <span className="font-semibold text-green-700">
                  R$ {calcularValorServico(novoServico).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={adicionarNovoServico}
              disabled={!novoServico.descricao || novoServico.quantidade <= 0}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Serviço
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Serviços Adicionados ({data.servicos?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.servicos?.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Descrição do Serviço</TableHead>
                    <TableHead className="font-semibold text-center">Quantidade</TableHead>
                    <TableHead className="font-semibold text-center">Unidade</TableHead>
                    <TableHead className="font-semibold text-right">Valor Unitário</TableHead>
                    <TableHead className="font-semibold text-right">Valor Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.servicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell className="font-medium">{servico.descricao}</TableCell>
                      <TableCell className="text-center">{servico.quantidade}</TableCell>
                      <TableCell className="text-center">{servico.unidade}</TableCell>
                      <TableCell className="text-right">R$ {servico.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="font-semibold text-green-600 text-right">
                        R$ {servico.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerServico(servico.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-900">Valor Total Geral:</span>
                <div className="flex items-center gap-2 text-2xl font-bold text-green-700">
                  <DollarSign className="w-6 h-6" />
                  <span>
                    {valorTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum serviço adicionado ainda.</p>
              <p className="text-sm">Use o formulário acima para adicionar os serviços executados.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
