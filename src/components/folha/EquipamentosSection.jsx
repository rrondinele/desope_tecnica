import React, { Children, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

// 📌 Importa regras
import {
  initialState,
  adicionarEquipamento,
  removerEquipamento,
  obterMensagemListaVazia
} from "@/rules/equipamentosRules";

const EquipamentoForm = ({ onAdd }) => {
  const [equipamento, setEquipamento] = useState(initialState);

  const handleSubmit = () => {
    const novaLista = adicionarEquipamento(equipamento, []);
    if (novaLista.length > 0) {
      onAdd(novaLista[0]); // adiciona apenas o item validado
      setEquipamento(initialState);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Serial do Equipamento
            <span className="text-red-600"> *</span>
          </Label>
          <Input
            value={equipamento.serial}
            onChange={(e) => setEquipamento((p) => ({ ...p, serial: e.target.value }))}
            placeholder="Número de série"
            className="border-slate-300 font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Nº LP
            <span className="text-red-600"> *</span>
          </Label>
          <Input
            value={equipamento.numero_lp}
            onChange={(e) => setEquipamento((p) => ({ ...p, numero_lp: e.target.value }))}
            placeholder="Número LP"
            className="border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Fabricante</Label>
          <Input
            value={equipamento.fabricante}
            onChange={(e) => setEquipamento((p) => ({ ...p, fabricante: e.target.value }))}
            placeholder="Nome do fabricante"
            className="border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Capacidade</Label>
          <Input
            value={equipamento.capacidade}
            onChange={(e) => setEquipamento((p) => ({ ...p, capacidade: e.target.value }))}
            placeholder="Ex: 15kVA, 100A"
            className="border-slate-300"
          />
        </div>

        {/* 📌 Mês e Ano separados */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Mês de Fabricação</Label>
          <Input
            type="number"
            min="1"
            max="12"
            value={equipamento.mes_fabricacao}
            onChange={(e) => setEquipamento((p) => ({ ...p, mes_fabricacao: e.target.value }))}
            placeholder="MM"
            className="border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Ano de Fabricação</Label>
          <Input
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={equipamento.ano_fabricacao}
            onChange={(e) => setEquipamento((p) => ({ ...p, ano_fabricacao: e.target.value }))}
            placeholder="YYYY"
            className="border-slate-300"
          />
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Equipamento
      </Button>
    </div>
  );
};

const EquipamentosList = ({ equipamentos, onRemove, tipo }) => {
  const mensagem = obterMensagemListaVazia(equipamentos, tipo);
  if (mensagem) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{mensagem}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {equipamentos.map((equip) => (
        <div
          key={equip.id}
          className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50"
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-1 text-sm">
            <div>
              <strong>Serial:</strong> <span className="font-mono">{equip.serial}</span>
            </div>
            <div>
              <strong>Fabricante:</strong> {equip.fabricante}
            </div>
            <div>
              <strong>Capacidade:</strong> {equip.capacidade || "N/A"}
            </div>
            <div>
              <strong>Mês Fab.:</strong> {equip.mes_fabricacao || "N/A"}
            </div>
            <div>
              <strong>Ano Fab.:</strong> {equip.ano_fabricacao || "N/A"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(equip.id)}
            className="text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default function EquipamentosSection({
  equipamentosInstalados,
  equipamentosRetirados,
  onChangeInstalados,
  onChangeRetirados
}) {
  const adicionarInstalado = (equipamento) => {
    const lista = adicionarEquipamento(equipamento, equipamentosInstalados);
    onChangeInstalados(lista);
  };

  const adicionarRetirado = (equipamento) => {
    const lista = adicionarEquipamento(equipamento, equipamentosRetirados);
    onChangeRetirados(lista);
  };

  const removerInstalado = (id) => {
    const lista = removerEquipamento(id, equipamentosInstalados);
    onChangeInstalados(lista);
  };

  const removerRetirado = (id) => {
    const lista = removerEquipamento(id, equipamentosRetirados);
    onChangeRetirados(lista);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="instalados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="instalados"
            className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Instalados ({equipamentosInstalados?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="retirados"
            className="flex items-center gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            <TrendingDown className="w-4 h-4" />
            Retirados ({equipamentosRetirados?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instalados" className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plus className="w-5 h-5 text-green-600" />
                Adicionar Equipamento Instalado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipamentoForm onAdd={adicionarInstalado} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Lista de Instalados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipamentosList
                equipamentos={equipamentosInstalados}
                onRemove={removerInstalado}
                tipo="instalado"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retirados" className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plus className="w-5 h-5 text-red-600" />
                Adicionar Equipamento Retirado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipamentoForm onAdd={adicionarRetirado} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Lista de Retirados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipamentosList
                equipamentos={equipamentosRetirados}
                onRemove={removerRetirado}
                tipo="retirado"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
