import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importe o Select
import SearchableSelect from "@/components/SearchableSelect";

// Lista de códigos de equipe
const codigosEquipe = [
  "EX001", "EX002", "EX003", "EX004", "EX005", "EX007", "EX011", "EX012", "EX014", "EX015", "EX018", 
  "MT001", "MT002", "MT003", "MT004", "MT005",
  "LV001", "LV002"
];

function deptoFromCodigo(cod) {
  if (!cod) return null;
  const p = cod.slice(0, 2).toUpperCase();
  if (p === 'EX') return 'EXPANSÃO';
  if (p === 'MT') return 'MANUTENÇÃO';
  if (p === 'LV') return 'LINHA VIVA';
  return null;
}

export default function EquipeSection({ equipes, onChange }) {
  const [novaEquipe, setNovaEquipe] = useState({
    codigo_equipe: '',
    supervisor: '',
    encarregado: '',
    motorista: '',
    eletricistas: []
  });
  const [eletricistaInput, setEletricistaInput] = useState('');

  // Verifica se o código da equipe foi selecionado
  const isCodigoSelecionado = !!novaEquipe.codigo_equipe;

  const adicionarEletricista = (eletricista) => {
    if (!eletricista) return;
    if (novaEquipe.eletricistas.length >= 4) {
      alert('Limite de 4 eletricistas por equipe atingido.');
      setEletricistaInput('');
      return;
    }
    if (eletricista && !novaEquipe.eletricistas.includes(eletricista)) {
      setNovaEquipe(prev => ({
        ...prev,
        eletricistas: [...prev.eletricistas, eletricista]
      }));
      setEletricistaInput('');
    }
  };

  const removerEletricista = (index) => {
    setNovaEquipe(prev => ({
      ...prev,
      eletricistas: prev.eletricistas.filter((_, i) => i !== index)
    }));
  };

  const adicionarEquipe = () => {
    if (novaEquipe.codigo_equipe && novaEquipe.supervisor && novaEquipe.encarregado && novaEquipe.eletricistas.length > 0) {
      onChange([...(equipes || []), { ...novaEquipe, id: Date.now() }]);
      setNovaEquipe({
        codigo_equipe: '',
        supervisor: '',
        encarregado: '',
        motorista: '',
        eletricistas: []
      });
    } else {
      alert("Código da equipe, supervisor, encarregado e ao menos um eletricista são obrigatórios.");
    }
  };

  const removerEquipe = (index) => {
    onChange(equipes.filter((_, i) => i !== index));
  };

  // Funções para formatar o label e o valor para o SearchableSelect
  const getColaboradorLabel = (row) => row ? `${row.matricula_ceneged} - ${row.nome}` : '';
  const getColaboradorValue = (row) => row ? `${row.matricula_ceneged} - ${row.nome}` : '';
  // Filtros derivados do código da equipe
  const departamento = deptoFromCodigo(novaEquipe.codigo_equipe);
  const whereDepto = departamento ? [{ column: 'descricao_departamento', operator: 'ilike', value: `%${departamento}%` }] : [];
  const prefix = novaEquipe.codigo_equipe ? novaEquipe.codigo_equipe.slice(0, 2).toUpperCase() : '';
  let supervisorFuncFilter = [];
  if (prefix === 'EX' || prefix === 'MT') {
    supervisorFuncFilter = [{ column: 'funcao', operator: 'ilike', value: '%SUPERVISOR OPERACAO ELETRIC%' }];
  } else if (prefix === 'LV') {
    supervisorFuncFilter = [{ column: 'funcao', operator: 'ilike', value: '%S/SUPERVISOR(A) LINHA VIVA%' }];
  }
  const supervisorWhere = [...supervisorFuncFilter, ...whereDepto];
  // Excluir colaboradores já escolhidos nesta folha
  const usados = new Set();
  (equipes || []).forEach(eq => {
    if (eq.supervisor) usados.add(String(eq.supervisor.split(' - ')[0]));
    if (eq.encarregado) usados.add(String(eq.encarregado.split(' - ')[0]));
    if (eq.motorista) usados.add(String(eq.motorista.split(' - ')[0]));
    (eq.eletricistas || []).forEach(e => usados.add(String(e.split(' - ')[0])));
  });
  if (novaEquipe.supervisor) usados.add(String(novaEquipe.supervisor.split(' - ')[0]));
  if (novaEquipe.encarregado) usados.add(String(novaEquipe.encarregado.split(' - ')[0]));
  if (novaEquipe.motorista) usados.add(String(novaEquipe.motorista.split(' - ')[0]));
  (novaEquipe.eletricistas || []).forEach(e => usados.add(String(e.split(' - ')[0])));
  const excludeProp = { column: 'matricula_ceneged', values: Array.from(usados) };

  return (
    <div className="space-y-2">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Plus className="w-5 h-5 text-blue-600" />
            Adicionar Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="codigo_equipe" className="text-sm font-semibold text-slate-700">
                Código da Equipe *
              </Label>
              <Select
                value={novaEquipe.codigo_equipe}
                onValueChange={(val) => setNovaEquipe(prev => ({ ...prev, codigo_equipe: val }))}
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {codigosEquipe.map(codigo => (
                    <SelectItem key={codigo} value={codigo}>
                      {codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="supervisor" className="text-sm font-semibold text-slate-700">
                Supervisor *
              </Label>
              <SearchableSelect
                id="supervisor"
                tableName="cen_colaboradores"
                columnName="nome"
                selectColumns="matricula_ceneged, nome, funcao, descricao_departamento"
                where={supervisorWhere}
                exclude={excludeProp}
                placeholder="Pesquisar supervisor..."
                value={novaEquipe.supervisor}
                onValueChange={(val) => setNovaEquipe(prev => ({ ...prev, supervisor: val }))}
                getLabel={getColaboradorLabel}
                getValue={getColaboradorValue}
                disabled={!isCodigoSelecionado}
                className={!isCodigoSelecionado ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="encarregado" className="text-sm font-semibold text-slate-700">
                Encarregado *
              </Label>
              <SearchableSelect
                id="encarregado"
                tableName="cen_colaboradores"
                columnName="nome"
                selectColumns="matricula_ceneged, nome, funcao, descricao_departamento"
                where={[{ column: 'funcao', operator: 'ilike', value: '%ENCARREGADO%' }, ...whereDepto]}
                exclude={excludeProp}
                placeholder="Pesquisar encarregado..."
                value={novaEquipe.encarregado}
                onValueChange={(val) => setNovaEquipe(prev => ({ ...prev, encarregado: val }))}
                getLabel={getColaboradorLabel}
                getValue={getColaboradorValue}
                disabled={!isCodigoSelecionado} // 🔒 Desabilita se não tiver código
                className={!isCodigoSelecionado ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="motorista" className="text-sm font-semibold text-slate-700">
                Motorista *
              </Label>
              <SearchableSelect
                id="motorista"
                tableName="cen_colaboradores"
                columnName="nome"
                selectColumns="matricula_ceneged, nome, funcao, descricao_departamento"
                where={[{ column: 'funcao', operator: 'ilike', value: '%MOTORISTA%' }, ...whereDepto]}
                exclude={excludeProp}
                placeholder="Pesquisar motorista..."
                value={novaEquipe.motorista}
                onValueChange={(val) => setNovaEquipe(prev => ({ ...prev, motorista: val }))}
                getLabel={getColaboradorLabel}
                getValue={getColaboradorValue}
                disabled={!isCodigoSelecionado} 
                className={!isCodigoSelecionado ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>
          </div>

          {/* Eletricistas */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Eletricistas da Equipe *
            </Label>
            <div className="flex gap-3">
              <SearchableSelect
                id="eletricista-multi-select" // <-- Dê um ID específico
                tableName="cen_colaboradores"
                columnName="nome"
                selectColumns="matricula_ceneged, nome, funcao, descricao_departamento"
                where={[{ column: 'funcao', operator: 'ilike', value: '%ELETRICISTA%' }, ...whereDepto]}
                exclude={excludeProp}
                placeholder="Pesquisar e adicionar eletricista..."
                value={eletricistaInput}
                onValueChange={(val) => adicionarEletricista(val)}
                getLabel={getColaboradorLabel}
                getValue={getColaboradorValue}
                disabled={!isCodigoSelecionado}
                className={`w-full ${!isCodigoSelecionado ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            {novaEquipe.eletricistas.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap gap-2">
                  {novaEquipe.eletricistas.map((eletricista, index) => (
                    <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 font-medium px-3 py-1">
                      {eletricista}
                      <button type="button" onClick={() => removerEletricista(index)} className="ml-2 text-blue-600 hover:text-blue-800">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 w-full">
            <Button 
              onClick={adicionarEquipe} 
              disabled={!novaEquipe.codigo_equipe || !novaEquipe.supervisor || !novaEquipe.encarregado || novaEquipe.eletricistas.length === 0} 
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Equipe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* O restante do componente (Lista de Equipes Adicionadas) permanece o mesmo */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Users className="w-5 h-5 text-green-600" />
            Equipes Cadastradas ({(equipes || []).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(equipes || []).length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma equipe cadastrada</h3>
              <p className="text-slate-500">Adicione equipes usando o formulário acima</p>
            </div>
          ) : (
            <div className="space-y-4">
              {equipes.map((equipe, index) => (
                <Card key={equipe.id || index} className="border-slate-200 bg-slate-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-3 py-1 text-sm">{equipe.codigo_equipe}</Badge>
                          <h4 className="text-lg font-bold text-slate-900">Equipe de {equipe.encarregado.split(' - ')[1]}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-sm text-slate-500 font-semibold">Supervisor:</span>
                            <div className="font-semibold text-slate-900">{equipe.supervisor}</div>
                          </div>
                          <div>
                            <span className="text-sm text-slate-500 font-semibold">Encarregado:</span>
                            <div className="font-semibold text-slate-900">{equipe.encarregado}</div>
                          </div>
                          {equipe.motorista && (
                            <div>
                              <span className="text-sm text-slate-500 font-semibold">Motorista:</span>
                              <div className="font-semibold text-slate-900">{equipe.motorista}</div>
                            </div>
                          )}
                        </div>
                        {equipe.eletricistas && equipe.eletricistas.length > 0 && (
                          <div>
                            <span className="text-sm text-slate-500 font-semibold mb-2 block">Eletricistas ({equipe.eletricistas.length}):</span>
                            <div className="flex flex-wrap gap-2">
                              {equipe.eletricistas.map((eletricista, idx) => (
                                <Badge key={idx} variant="outline" className="bg-green-50 text-green-800 border-green-200 font-medium">{eletricista}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removerEquipe(index)} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
