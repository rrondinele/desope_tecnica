import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DollarSign, Plus, Trash2, Calculator } from "lucide-react";

const servicosDisponiveis = [
  {
    codigo: "001",
    descricao: "Instalação de Poste de Concreto 9m",
    unidade: "UN",
    valor_unitario: 450.00
  },
  {
    codigo: "002",
    descricao: "Instalação de Transformador 15kVA",
    unidade: "UN",
    valor_unitario: 1250.00
  },
  {
    codigo: "003",
    descricao: "Ligação Nova BT Monofásica",
    unidade: "UN",
    valor_unitario: 85.50
  },
  {
    codigo: "004",
    descricao: "Manutenção Preventiva Rede BT",
    unidade: "M",
    valor_unitario: 25.00
  },
  {
    codigo: "005",
    descricao: "Substituição de Cabo Multiplexado",
    unidade: "M",
    valor_unitario: 35.75
  }
];

export default function ServicosStep({ data, updateData }) {
  const [novoServico, setNovoServico] = useState({
    codigo: '',
    descricao: '',
    unidade: '',
    valor_unitario: 0,
    quantidade: 1,
  });

  const [valorTotalGeral, setValorTotalGeral] = useState(0);

  // Calcula o valor total sem causar loop
  const calcularValorTotal = useCallback(() => {
    return data.servicos?.reduce((sum, s) => sum + (s.valor_total || 0), 0) || 0;
  }, [data.servicos]);

  // Atualiza o valor total apenas quando necessário
  useEffect(() => {
    const total = calcularValorTotal();
    setValorTotalGeral(total);
    
    // Atualiza o pai apenas se o valor total mudou
    if (total !== data.valor_total) {
      updateData({ valor_total: total });
    }
  }, [data.servicos, data.valor_total, calcularValorTotal, updateData]);

  const handleServicoSelect = (descricao) => {
    const servicoSelecionado = servicosDisponiveis.find(s => s.descricao === descricao);
    if (servicoSelecionado) {
      setNovoServico(prev => ({
        ...prev,
        ...servicoSelecionado,
        quantidade: prev.quantidade || 1 // Mantém a quantidade atual
      }));
    }
  };
  
  const handleQuantidadeChange = (quantidade) => {
    const qtd = parseFloat(quantidade) || 0;
    setNovoServico(prev => ({
      ...prev,
      quantidade: qtd,
    }));
  };

  const adicionarServico = () => {
    if (novoServico.descricao && novoServico.quantidade > 0) {
      const servicoParaAdicionar = {
        ...novoServico,
        id: Date.now(), // ID único para a lista na UI
        valor_total: novoServico.valor_unitario * novoServico.quantidade
      };

      const servicos = [...(data.servicos || []), servicoParaAdicionar];
      updateData({ servicos });

      // Reseta o formulário mantendo a quantidade (para UX)
      setNovoServico({
        codigo: '', 
        descricao: '', 
        unidade: '', 
        valor_unitario: 0, 
        quantidade: novoServico.quantidade // Mantém a quantidade para próximo serviço
      });
    }
  };

  const removerServico = (id) => {
    const servicos = data.servicos.filter((s) => s.id !== id);
    updateData({ servicos });
  };

  return (
    <div className="space-y-8">
      {/* Adicionar Novo Serviço */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Adicionar Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-700 font-medium">Descrição do Serviço</Label>
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
              <Label className="text-slate-700 font-medium">Qtd.</Label>
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
                value={novoServico.valor_unitario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                disabled
                className="border-slate-200 bg-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Preview do valor total do serviço atual */}
          {novoServico.descricao && novoServico.quantidade > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Valor total deste serviço:</span>
                <span className="font-semibold text-green-700">
                  R$ {(novoServico.valor_unitario * novoServico.quantidade).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <Button 
              onClick={adicionarServico} 
              disabled={!novoServico.descricao || novoServico.quantidade <= 0}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Serviço
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Serviços */}
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