import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";

const initialState = { descricao: "", lote: "", quantidade: "", origem: "", umb: "" };

const MaterialForm = ({ onAdd }) => {
  const [material, setMaterial] = useState(initialState);

  const updateMaterial = (updates) => {
    setMaterial((prev) => ({
      ...prev,
      ...(typeof updates === "function" ? updates(prev) : updates),
    }));
  };

  const handleDescricaoSelect = (value, row) => {
    updateMaterial({
      descricao: value || row?.texto_breve_material || "",
      lote: row?.codigo_material !== undefined && row?.codigo_material !== null ? String(row.codigo_material) : "",
      umb: row?.umb || "",
    });
  };

  const handleDescricaoManual = (value) => {
    updateMaterial((prev) => ({
      ...prev,
      descricao: value,
      umb: value === prev.descricao ? prev.umb : "",
    }));
  };

  const handleLoteSelect = (value, row) => {
    updateMaterial((prev) => ({
      ...prev,
      lote: row?.codigo_material !== undefined && row?.codigo_material !== null ? String(row.codigo_material) : (value || ""),
      descricao: row?.texto_breve_material || prev.descricao,
      umb: row?.umb || "",
    }));
  };

  const handleLoteManual = (value) => {
    updateMaterial({
      lote: value,
      umb: "",
    });
  };

  const handleSubmit = () => {
    const quantidadeNumero = parseFloat(material.quantidade);
    if (material.descricao && !Number.isNaN(quantidadeNumero) && quantidadeNumero > 0) {
      onAdd({
        ...material,
        id: Date.now(),
        quantidade: quantidadeNumero,
      });
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
          <SearchableSelect
            id="material-descricao"
            tableName="light_material"
            columnName="texto_breve_material"
            selectColumns="codigo_material, texto_breve_material, umb"
            placeholder="Buscar descrição..."
            value={material.descricao}
            onValueChange={handleDescricaoSelect}
            onInputChange={handleDescricaoManual}
            getLabel={(row) =>
              row ? `${row.texto_breve_material}${row.codigo_material ? ` (${row.codigo_material})` : ""}` : ""
            }
            getValue={(row) => (row ? row.texto_breve_material || "" : "")}
            selectionOnly={false}
            inputClassName="border-slate-300"
            maxRows={100}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Lote</Label>
          <SearchableSelect
            id="material-lote"
            tableName="light_material"
            columnName="codigo_material"
            selectColumns="codigo_material, texto_breve_material, umb"
            placeholder="Buscar código/lote..."
            value={material.lote}
            onValueChange={handleLoteSelect}
            onInputChange={handleLoteManual}
            getLabel={(row) => (row ? `${row.codigo_material} - ${row.texto_breve_material}` : "")}
            getValue={(row) =>
              row && row.codigo_material !== undefined && row.codigo_material !== null
                ? String(row.codigo_material)
                : ""
            }
            selectionOnly={false}
            inputClassName="border-slate-300"
            searchColumns={['codigo_material', 'texto_breve_material']}
            maxRows={100}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Quantidade *</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={material.quantidade}
            onChange={(e) => updateMaterial({ quantidade: e.target.value })}
            className="border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Origem</Label>
          <Input
            value={material.origem}
            onChange={(e) => updateMaterial({ origem: e.target.value })}
            placeholder="Ex: Almoxarifado Central"
            className="border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Unidade (UMB)</Label>
          <Input value={material.umb} readOnly placeholder="Automático após seleção" className="border-slate-300 bg-slate-100" />
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
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <div>
              <strong>Material:</strong> {mat.descricao}
            </div>
            <div>
              <strong>Lote:</strong> <span className="font-mono">{mat.lote || "N/A"}</span>
            </div>
            <div>
              <strong>Qtd:</strong> {mat.quantidade}
            </div>
            <div>
              <strong>UMB:</strong> {mat.umb || "N/A"}
            </div>
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
  onChangeRetirados,
}) {
  const totalInstalados = materiaisInstalados?.length || 0;
  const totalRetirados = materiaisRetirados?.length || 0;

  const adicionarInstalado = (material) => {
    onChangeInstalados([...(materiaisInstalados || []), material]);
  };

  const adicionarRetirado = (material) => {
    onChangeRetirados([...(materiaisRetirados || []), material]);
  };

  const removerInstalado = (id) => {
    onChangeInstalados((materiaisInstalados || []).filter((m) => m.id !== id));
  };

  const removerRetirado = (id) => {
    onChangeRetirados((materiaisRetirados || []).filter((m) => m.id !== id));
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
            Instalados ({totalInstalados} itens)
          </TabsTrigger>
          <TabsTrigger
            value="retirados"
            className="flex items-center gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
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
