import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Users, X } from "lucide-react";

// 📌 Regras centralizadas
import {
  adicionarEquipe,
  removerEquipe,
  atualizarCampoEquipe,
  obterMensagemEquipesVazia,
  validarEletricista,
} from "@/rules/equipeRules";

// Mock data
const eletricistasDisponiveis = [
  "André Santos Silva",
  "Bruno Costa Lima",
  "Carlos Mendes Rocha",
  "Daniel Oliveira Santos",
  "Eduardo Ferreira Costa",
  "Fernando Silva Souza",
  "Gabriel Almeida Lima",
  "Henrique Costa Santos",
  "Igor Fernandes Silva",
  "João Pedro Oliveira",
];

const codigosEquipe = [
  "EXP001",
  "EXP002",
  "EXP003",
  "EXP004",
  "EXP005",
  "MAN001",
  "MAN002",
  "MAN003",
  "MAN004",
  "MAN005",
];

export default function EquipeSection({ equipes, onChange }) {
  const [novaEquipe, setNovaEquipe] = useState({
    codigo_equipe: "",
    encarregado: "",
    motorista: "",
    eletricistas: [],
  });

  // 📌 Adiciona eletricista
  const handleAdicionarEletricista = (eletricista) => {
    if (validarEletricista(eletricista, novaEquipe.eletricistas)) {
      setNovaEquipe((prev) => ({
        ...prev,
        eletricistas: [...prev.eletricistas, eletricista],
      }));
    }
  };

  // 📌 Remove eletricista
  const handleRemoverEletricista = (index) => {
    setNovaEquipe((prev) => ({
      ...prev,
      eletricistas: prev.eletricistas.filter((_, i) => i !== index),
    }));
  };

  // 📌 Adiciona equipe (validação e alerta feitos na regra)
  const handleAdicionarEquipe = () => {
    const atualizadas = adicionarEquipe(novaEquipe, equipes);
    if (atualizadas !== equipes) {
      onChange(atualizadas);
      setNovaEquipe({
        codigo_equipe: "",
        encarregado: "",
        motorista: "",
        eletricistas: [],
      });
    }
  };

  // 📌 Remove equipe
  const handleRemoverEquipe = (id) => {
    const atualizadas = removerEquipe(id, equipes);
    onChange(atualizadas);
  };

  // Filtrar eletricistas já selecionados
  const eletricistasLivres = eletricistasDisponiveis.filter(
    (e) => !novaEquipe.eletricistas.includes(e)
  );

  const mensagem = obterMensagemEquipesVazia(equipes);

  return (
    <div className="space-y-6">
      {/* Formulário de Equipe */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Plus className="w-5 h-5 text-blue-600" />
            Adicionar Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Código da equipe */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                Código da Equipe <span className="text-red-600">*</span>
              </Label>
              <Select
                value={novaEquipe.codigo_equipe}
                onValueChange={(value) =>
                  setNovaEquipe((prev) =>
                    atualizarCampoEquipe(prev, "codigo_equipe", value)
                  )
                }
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Selecione o código" />
                </SelectTrigger>
                <SelectContent>
                  {codigosEquipe.map((codigo) => (
                    <SelectItem key={codigo} value={codigo}>
                      {codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Encarregado */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                Encarregado
              </Label>
              <Input
                value={novaEquipe.encarregado}
                onChange={(e) =>
                  setNovaEquipe((prev) =>
                    atualizarCampoEquipe(prev, "encarregado", e.target.value)
                  )
                }
                placeholder="Nome do encarregado"
                className="border-slate-300"
              />
            </div>

            {/* Motorista */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                Motorista
              </Label>
              <Input
                value={novaEquipe.motorista}
                onChange={(e) =>
                  setNovaEquipe((prev) =>
                    atualizarCampoEquipe(prev, "motorista", e.target.value)
                  )
                }
                placeholder="Nome do motorista"
                className="border-slate-300"
              />
            </div>
          </div>

          {/* Eletricistas */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <Label className="text-sm font-semibold text-slate-700">
              Eletricistas da Equipe <span className="text-red-600">*</span>
            </Label>
            <div className="flex gap-3">
              <Select onValueChange={handleAdicionarEletricista}>
                <SelectTrigger className="border-slate-300 flex-1">
                  <SelectValue placeholder="Selecione um eletricista" />
                </SelectTrigger>
                <SelectContent>
                  {eletricistasLivres.map((eletricista) => (
                    <SelectItem key={eletricista} value={eletricista}>
                      {eletricista}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {novaEquipe.eletricistas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {novaEquipe.eletricistas.map((eletricista, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-blue-50 text-blue-800 border-blue-200 font-medium px-3 py-1"
                  >
                    {eletricista}
                    <button
                      type="button"
                      onClick={() => handleRemoverEletricista(index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Botão */}
          <div className="pt-6 w-full">
            <Button
              onClick={handleAdicionarEquipe}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold"
            >
              Adicionar Equipe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Equipes */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Users className="w-5 h-5 text-green-600" />
            Equipes Cadastradas ({equipes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mensagem ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {mensagem}
              </h3>
              <p className="text-slate-500">
                Adicione equipes usando o formulário acima
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {equipes.map((equipe) => (
                <Card
                  key={equipe.id}
                  className="border-slate-200 bg-slate-50/50"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-3 py-1 text-sm">
                            {equipe.codigo_equipe}
                          </Badge>
                          <h4 className="text-lg font-bold text-slate-900">
                            Equipe de {equipe.encarregado}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-slate-500 font-semibold">
                              Encarregado:
                            </span>
                            <div className="font-semibold text-slate-900">
                              {equipe.encarregado}
                            </div>
                          </div>
                          {equipe.motorista && (
                            <div>
                              <span className="text-sm text-slate-500 font-semibold">
                                Motorista:
                              </span>
                              <div className="font-semibold text-slate-900">
                                {equipe.motorista}
                              </div>
                            </div>
                          )}
                        </div>

                        {equipe.eletricistas?.length > 0 && (
                          <div>
                            <span className="text-sm text-slate-500 font-semibold mb-2 block">
                              Eletricistas ({equipe.eletricistas.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {equipe.eletricistas.map((eletricista, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="bg-green-50 text-green-800 border-green-200 font-medium"
                                >
                                  {eletricista}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverEquipe(equipe.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                      >
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
