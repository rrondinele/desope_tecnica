import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DollarSign, Plus, Trash2, Calculator } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";

export default function ServicosStep({ data, updateData }) {
  const [novoServico, setNovoServico] = useState({
    codigo: '',
    codigo_mestre: '',
    descricao: '',
    descricao_exibicao: '',
    unidade: '',
    unidade_medida: '',
    dispendio: '',
    valor_unitario: 0,
    quantidade: 1,
  });

  // Limpa campos dependentes quando não há serviço selecionado
  useEffect(() => {
    if (!novoServico.descricao) {
      setNovoServico(prev => {
        if (prev.unidade || prev.unidade_medida || prev.dispendio || prev.valor_unitario) {
          return { ...prev, unidade: '', unidade_medida: '', dispendio: '', valor_unitario: 0 };
        }
        return prev;
      });
    }
  }, [novoServico.descricao]);

  const [valorTotalGeral, setValorTotalGeral] = useState(0);

  const servicosSelecionados = useMemo(() => {
    const codigos = new Set();
    (data.servicos || []).forEach((servico) => {
      if (servico?.codigo_mestre) codigos.add(String(servico.codigo_mestre).trim());
      else if (servico?.codigo) codigos.add(String(servico.codigo).trim());
    });
    return Array.from(codigos);
  }, [data.servicos]);

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

  // Seleciona serviço vindo do Supabase
  const handleServicoSelectDb = (value, row) => {
    if (!row) return;
    const label = `${row.codigo_mestre} - ${row.descricao_item}`;
    setNovoServico(prev => ({
      ...prev,
      codigo: row.codigo_mestre || '',
      codigo_mestre: row.codigo_mestre || '',
      descricao: row.descricao_item || '',
      descricao_exibicao: label,
      unidade: row.unidade_medida || '',
      unidade_medida: row.unidade_medida || '',
      dispendio: row.dispendio || '',
      valor_unitario: Number(row.preco || 0),
      quantidade: prev.quantidade || 1,
    }));
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
      const codigoAtual = String(novoServico.codigo_mestre || novoServico.codigo || '').trim();
      const servicosExistentes = data.servicos || [];
      if (codigoAtual && servicosExistentes.some((s) => String(s.codigo_mestre || s.codigo || '').trim() === codigoAtual)) {
        alert('Este serviço já foi adicionado. Remova o item existente antes de incluí-lo novamente.');
        return;
      }

      const servicoParaAdicionar = {
        ...novoServico,
        id: Date.now(), // ID único para a lista na UI
        valor_total: novoServico.valor_unitario * novoServico.quantidade
      };

      const servicos = [...servicosExistentes, servicoParaAdicionar];
      updateData({ servicos });

      // Reseta o formulário mantendo a quantidade (para UX)
      setNovoServico({
        codigo: '',
        codigo_mestre: '',
        descricao: '',
        descricao_exibicao: '',
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
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
            <div className="space-y-2 order-1 md:col-span-4">
              <Label className="text-slate-700 font-medium">Descrição do Serviço</Label>
              <SearchableSelect
                tableName="light_cod_mestres"
                columnName="descricao_item"
                selectColumns="codigo_mestre,descricao_item,preco,unidade_medida,dispendio"
                placeholder="Pesquisar serviço..."
                value={novoServico.descricao_exibicao}
                onValueChange={handleServicoSelectDb}
                getLabel={(row) => row ? `${row.codigo_mestre} - ${row.descricao_item}` : ''}
                getValue={(row) => row ? `${row.codigo_mestre} - ${row.descricao_item}` : ''}
                exclude={{ column: 'codigo_mestre', values: servicosSelecionados }}
                className="w-full"
                searchColumns={['descricao_item','codigo_mestre']}
              />
            </div>            
            <div className="space-y-2 order-2">
              <Label className="text-slate-700 font-medium">Quantidade</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={novoServico.quantidade}
                onChange={(e) => handleQuantidadeChange(e.target.value)}
                className="border-slate-200 bg-white w-20"
              />
            </div>

            <div className="space-y-2 order-5">
              <Label className="text-slate-700 font-medium">Preço (R$)</Label>
              <Input
                type="text"
                value={novoServico.valor_unitario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                disabled
                className="border-slate-200 bg-slate-100 font-medium w-28"
              />
            </div>
            <div className="space-y-2 order-2">
              <Label className="text-slate-700 font-medium">Unidade</Label>
              <Input
                type="text"
                value={novoServico.unidade_medida || ''}
                disabled
                className="border-slate-200 bg-slate-100 w-16"
              />
            </div>
            <div className="space-y-2 order-3">
              <Label className="text-slate-700 font-medium">Dispêndio</Label>
              <Input
                type="text"
                value={novoServico.dispendio || ''}
                disabled
                className="border-slate-200 bg-slate-100"
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
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold"
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
                    <TableHead className="font-semibold text-center">Dispêndio</TableHead>
                    <TableHead className="font-semibold text-right">Preço (R$)</TableHead>
                    <TableHead className="font-semibold text-right">Valor Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.servicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell className="font-medium">{servico.codigo_mestre ? `${servico.codigo_mestre} - ${servico.descricao}` : servico.descricao}</TableCell>
                      <TableCell className="text-center">{servico.quantidade}</TableCell>
                      <TableCell className="text-center">{servico.unidade_medida || servico.unidade}</TableCell>
                      <TableCell className="text-center">{servico.dispendio || ''}</TableCell>
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
