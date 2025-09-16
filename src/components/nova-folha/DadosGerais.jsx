import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileCog } from "lucide-react";

// Importando regras centralizadas
import {
  getProjetoPrefix,
  isProjetoRequired,
  isOrdemServicoRequired,
  validarOrdemServico
} from "@/rules/dadosGeraisRules";

export default function DadosGerais({ data, updateData }) {
  const handleInputChange = (field, value) => {
    updateData({ [field]: value });
  };

  const handleProjetoChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    let formattedValue = rawValue;
    if (rawValue.length > 2) {
      formattedValue = `${rawValue.slice(0, 2)}-${rawValue.slice(2, 6)}`;
    }
    const prefix = getProjetoPrefix(data.tipo_processo);
    updateData({ projeto: `${prefix}${formattedValue}` });
  };

  const getProjetoInputValue = () => {
    return data.projeto?.replace(/^(OII-|OMI-)/, "") || "";
  };

  return (
    <div className="space-y-8">
      {/* Informações da Obra */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Building2 className="w-5 h-5 text-blue-600" />
            Informações da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Contrato</Label>
              <Input value="4600010309" disabled className="bg-slate-100 font-semibold" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Empresa</Label>
              <Input value={data.empreiteira} disabled className="bg-slate-100 font-semibold" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Nº Folha Medição</Label>
              <Input value={data.numero_fm} disabled className="bg-slate-100 font-semibold font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tecnico_light" className="text-sm font-semibold text-slate-700">
                Técnico Light 
                <span className="text-red-600"> *</span>
              </Label>
              <Input
                id="tecnico_light"
                value={data.tecnico_light}
                onChange={(e) => handleInputChange("tecnico_light", e.target.value)}
                placeholder="Nome do técnico da Light"
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_obra" className="text-sm font-semibold text-slate-700">
                Data Execução da Obra 
                <span className="text-red-600"> *</span>
              </Label>
              <Input
                id="data_obra"
                type="date"
                value={data.data_obra}
                onChange={(e) => handleInputChange("data_obra", e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_acionada" className="text-sm font-semibold text-slate-700">
                Hora Acionada
              </Label>
              <Input
                id="hora_acionada"
                type="time"
                value={data.hora_acionada}
                onChange={(e) => handleInputChange("hora_acionada", e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_inicio" className="text-sm font-semibold text-slate-700">
                Hora Início
              </Label>
              <Input
                id="hora_inicio"
                type="time"
                value={data.hora_inicio}
                onChange={(e) => handleInputChange("hora_inicio", e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fim" className="text-sm font-semibold text-slate-700">
                Hora Fim
              </Label>
              <Input
                id="hora_fim"
                type="time"
                value={data.hora_fim}
                onChange={(e) => handleInputChange("hora_fim", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="endereco" className="text-sm font-semibold text-slate-700">
                Endereço Completo 
                <span className="text-red-600"> *</span>
              </Label>
              <Input
                id="endereco"
                value={data.endereco}
                onChange={(e) => handleInputChange("endereco", e.target.value)}
                placeholder="Rua, número, bairro..."
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="municipio" className="text-sm font-semibold text-slate-700">
                Município
                <span className="text-red-600"> *</span>
              </Label>
              <Input
                id="municipio"
                value={data.municipio}
                onChange={(e) => handleInputChange("municipio", e.target.value)}
                placeholder="Ex: Rio de Janeiro"
                className="border-slate-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Processo */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FileCog className="w-5 h-5 text-green-600" />
            Dados do Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Tipo de Processo
                <span className="text-red-600"> *</span>
              </Label>
              <Select
                value={data.tipo_processo}
                onValueChange={(value) => handleInputChange("tipo_processo", value)}
              >
                <SelectTrigger className="w-full border-slate-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expansão">Expansão</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Característica 
                <span className="text-red-600"> *</span>
              </Label>
              <Select
                value={data.caracteristica}
                onValueChange={(value) => handleInputChange("caracteristica", value)}
              >
                <SelectTrigger className="w-full border-slate-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Programada">Programada</SelectItem>
                  <SelectItem value="Emergencial">Emergencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projeto" className="text-sm font-semibold text-slate-700">
                Projeto {isProjetoRequired(data.tipo_processo, data.caracteristica) && (
                  <span className="text-red-600">*</span>
                )}
              </Label>
              <div className="flex items-center">
                <span className="bg-slate-100 text-slate-600 px-3 py-2 rounded-l-md border border-r-0 border-slate-300 font-mono text-sm">
                  {getProjetoPrefix(data.tipo_processo)}
                </span>
                <Input
                  id="projeto"
                  type="text"
                  placeholder="XX-XXXX"
                  maxLength={7}
                  required={isProjetoRequired(data.tipo_processo, data.caracteristica)}
                  value={getProjetoInputValue()}
                  onChange={handleProjetoChange}
                  className="border-slate-300 rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem_servico" className="text-sm font-semibold text-slate-700">
                Ordem de Serviço (O.S.){" "}
                {isOrdemServicoRequired(data.tipo_processo, data.caracteristica) && (
                  <span className="text-red-600">*</span>
                )}
              </Label>
              <Input
                id="ordem_servico"
                type="text"
                inputMode="numeric"
                pattern="^9\\d{7}$"
                maxLength={8}
                minLength={8}
                required={isOrdemServicoRequired(data.tipo_processo, data.caracteristica)}
                placeholder="9XXXXXXX"
                title="A O.S. deve conter exatamente 8 dígitos e começar com 9"
                value={data.ordem_servico || ""}
                onChange={(e) => {
                  const valid = validarOrdemServico(e.target.value);
                  if (valid !== null) handleInputChange("ordem_servico", valid);
                }}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem_manutencao" className="text-sm font-semibold text-slate-700">
                Ordem de Manutenção (O.M.)
              </Label>
              <Input
                id="ordem_manutencao"
                value={data.ordem_manutencao || ""}
                onChange={(e) =>
                  handleInputChange("ordem_manutencao", e.target.value.replace(/\D/g, ""))
                }
                placeholder="20XXXXXXXX"
                maxLength="10"
                pattern="^20\\d{8}$"
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pi" className="text-sm font-semibold text-slate-700">
                Pedido de Intervenção
              </Label>
              <Input
                id="pi"
                value={data.pi || ""}
                onChange={(e) => handleInputChange("pi", e.target.value)}
                placeholder="Código PI"
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ntc" className="text-sm font-semibold text-slate-700">
                NTC
              </Label>
              <Input
                id="ntc"
                value={data.ntc || ""}
                onChange={(e) => handleInputChange("ntc", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="circuito" className="text-sm font-semibold text-slate-700">
                Circuito
              </Label>
              <Input
                id="circuito"
                value={data.circuito || ""}
                onChange={(e) => handleInputChange("circuito", e.target.value)}
                placeholder="LDA/LSA"
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reserva" className="text-sm font-semibold text-slate-700">
                Reserva
              </Label>
              <Input
                id="reserva"
                value={data.reserva || ""}
                onChange={(e) => handleInputChange("reserva", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ks" className="text-sm font-semibold text-slate-700">
                KS
              </Label>
              <Input
                id="ks"
                value={data.ks || ""}
                onChange={(e) => handleInputChange("ks", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cf" className="text-sm font-semibold text-slate-700">
                CF
              </Label>
              <Input
                id="cf"
                value={data.cf || ""}
                onChange={(e) => handleInputChange("cf", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona" className="text-sm font-semibold text-slate-700">
                Zona
              </Label>
              <Input
                id="zona"
                value={data.zona || ""}
                onChange={(e) => handleInputChange("zona", e.target.value)}
                className="border-slate-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
