import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

const initialState = { descricao: '', lote: '', quantidade: '', origem: '' };

const MaterialForm = ({ onAdd }) => {
  const [material, setMaterial] = useState(initialState);

  const handleSubmit = () => {
    if (material.descricao && material.quantidade > 0) {
      onAdd({ ...material, id: Date.now(), quantidade: parseFloat(material.quantidade) });
      setMaterial(initialState);
    } else {
      alert("Os campos 'Descrição do Material' e 'Quantidade' são obrigatórios.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Descrição do Material *</Label>
          <Input value={material.descricao} onChange={(e) => setMaterial(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Cabo de Cobre 4mm²" className="border-slate-300" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Lote</Label>
          <Input value={material.lote} onChange={(e) => setMaterial(p => ({ ...p, lote: e.target.value }))} placeholder="Número do lote" className="border-slate-300 font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Quantidade *</Label>
          <Input type="number" min="0.01" step="0.01" value={material.quantidade} onChange={(e) => setMaterial(p => ({ ...p, quantidade: e.target.value }))} className="border-slate-300" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Origem</Label>
          <Input value={material.origem} onChange={(e) => setMaterial(p => ({ ...p, origem: e.target.value }))} placeholder="Ex: Almoxarifado Central" className="border-slate-300" />
        </div>
      </div>
      <Button onClick={handleSubmit} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Material
      </Button>
    </div>
  );
};

const MateriaisList = ({ materiais, onRemove }) => {
  if (!materiais || materiais.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>Nenhum material cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {materiais.map((mat) => (
        <div key={mat.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
            <div><strong>Material:</strong> {mat.descricao}</div>
            <div><strong>Lote:</strong> <span className="font-mono">{mat.lote || 'N/A'}</span></div>
            <div><strong>Qtd:</strong> {mat.quantidade}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(mat.id)}
            className="text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default function MateriaisSection({ 
  materiaisInstalados, 
  materiaisRetirados, 
  onChangeInstalados, 
  onChangeRetirados 
}) {
  const totalInstalados = materiaisInstalados?.length || 0;
  const totalRetirados = materiaisRetirados?.length || 0;

  const adicionarInstalado = (material) => {
    const materiais = [...(materiaisInstalados || []), material];
    onChangeInstalados(materiais);
  };

  const adicionarRetirado = (material) => {
    const materiais = [...(materiaisRetirados || []), material];
    onChangeRetirados(materiais);
  };

  const removerInstalado = (id) => {
    const materiais = materiaisInstalados.filter((m) => m.id !== id);
    onChangeInstalados(materiais);
  };

  const removerRetirado = (id) => {
    const materiais = materiaisRetirados.filter((m) => m.id !== id);
    onChangeRetirados(materiais);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="instalados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="instalados" className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-sm">
            <TrendingUp className="w-4 h-4" />
            Instalados ({totalInstalados} itens)
          </TabsTrigger>
          <TabsTrigger value="retirados" className="flex items-center gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm">
            <TrendingDown className="w-4 h-4" />
            Retirados ({totalRetirados} itens)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="instalados" className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plus className="w-5 h-5 text-green-600" />
                Adicionar Material Instalado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialForm onAdd={adicionarInstalado} />
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
              <MateriaisList materiais={materiaisInstalados} onRemove={removerInstalado} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retirados" className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plus className="w-5 h-5 text-red-600" />
                Adicionar Material Retirado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialForm onAdd={adicionarRetirado} />
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
              <MateriaisList materiais={materiaisRetirados} onRemove={removerRetirado} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}