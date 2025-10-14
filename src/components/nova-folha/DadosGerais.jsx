import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileCog } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { fetchTecnicos, fetchMunicipios } from "@/services/lookups";

export default function DadosGerais({ data, updateData }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const handleInputChange = (field, value) => {
    updateData({ [field]: value });
  };

  const handleNumeroFmChange = (event) => {
    if (data.numero_fm_bloqueado) return;
    const raw = (event.target.value || "").toUpperCase();
    const digitsOnly = raw.replace(/^FM\s*-\s*/i, "").replace(/\D/g, "");
    const limited = digitsOnly.slice(0, 5);
    let formatted = limited;

    if (limited.length > 2) {
      formatted = `${limited.slice(0, 2)}.${limited.slice(2, 5)}`;
    }

    const numeroFormatado = formatted ? `FM - ${formatted}` : "FM - ";
    updateData({ numero_fm: numeroFormatado });
  };
  
  const handleProjetoChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    let formattedValue = rawValue;
    if (rawValue.length > 2) {
      formattedValue = `${rawValue.slice(0, 2)}-${rawValue.slice(2, 6)}`;
    }
    
    const prefix = data.tipo_processo === 'Manutenção' ? 'OMI-' : 'OII-';
    updateData({ projeto: `${prefix}${formattedValue}` });
  };
  
  const getProjetoInputValue = () => {
    return data.projeto?.replace(/^(OII-|OMI-)/, '') || '';
  };

  const canProceed = data.tecnico_light && data.endereco && data.tipo_processo && data.data_obra;

  useEffect(() => {
    (async () => {
      try {
        const [t, m] = await Promise.all([fetchTecnicos(), fetchMunicipios()]);
        setTecnicos(t || []);
        setMunicipios(m || []);
      } catch {}
    })();
  }, []);

  return (
    <div className="space-y-8">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Building2 className="w-5 h-5 text-blue-600" />
            Informações da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Primeira linha: 4 divs */}
            <div className="space-y-2">
              <Label htmlFor="contrato" className="text-sm font-semibold text-slate-700">Contrato</Label>
              <Input id="contrato" value="4600010309" disabled className="bg-slate-100 font-semibold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empreiteira" className="text-sm font-semibold text-slate-700">Empresa</Label>
              <Input id="empreiteira" value={data.empreiteira} disabled className="bg-slate-100 font-semibold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_fm" className="text-sm font-semibold text-slate-700 required-field">
                Nº Folha Medição <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="numero_fm"
                value={data.numero_fm || "FM - "}
                onChange={handleNumeroFmChange}
                placeholder="FM - 10.123"
                required
                disabled={data.numero_fm_bloqueado}
                className={`border-slate-300 font-semibold font-mono ${data.numero_fm_bloqueado ? "bg-slate-100 cursor-not-allowed" : ""}`.trim()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tecnico_light" className="text-sm font-semibold text-slate-700">Técnico Light *</Label>
              <SearchableSelect
                id="tecnico_light"
                tableName="light_tecnico"
                columnName="tecnico"
                placeholder="Digite ou selecione o técnico"
                value={data.tecnico_light || ""}
                required
                onValueChange={(val) => handleInputChange('tecnico_light', val)}
              />
            </div>
            {/* Segunda linha: 4 divs */}
            <div className="space-y-2">
              <Label htmlFor="data_obra" className="text-sm font-semibold text-slate-700">Data Execução da Obra *</Label>
              <Input id="data_obra" type="date" value={data.data_obra} onChange={(e) => handleInputChange('data_obra', e.target.value)} className="border-slate-300" required />
            </div>
                        <div className="space-y-2">
              <Label htmlFor="hora_acionada" className="text-sm font-semibold text-slate-700">Hora Acionada</Label>
              <Input id="hora_acionada" type="time" value={data.hora_acionada} onChange={(e) => handleInputChange('hora_acionada', e.target.value)} className="border-slate-300" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_inicio" className="text-sm font-semibold text-slate-700">Hora Início</Label>
              <Input id="hora_inicio" type="time" value={data.hora_inicio} onChange={(e) => handleInputChange('hora_inicio', e.target.value)} className="border-slate-300" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fim" className="text-sm font-semibold text-slate-700">Hora Fim</Label>
              <Input id="hora_fim" type="time" value={data.hora_fim} onChange={(e) => handleInputChange('hora_fim', e.target.value)} className="border-slate-300" required />
            </div>

            {/* Terceira linha: campos de endereço */}
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="endereco" className="text-sm font-semibold text-slate-700">Endereço Completo *</Label>
              <Input id="endereco" value={data.endereco} onChange={(e) => handleInputChange('endereco', e.target.value)} placeholder="Rua, número, bairro..." className="border-slate-300" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipio" className="text-sm font-semibold text-slate-700">Município *</Label>
              <SearchableSelect
                id="municipio"
                tableName="light_municipio"
                columnName="municipio"
                selectColumns="municipio,regional"
                placeholder="Ex: Rio de Janeiro"
                value={data.municipio || ""}
                required
                onValueChange={(val, row) => {
                  handleInputChange('municipio', val);
                  if (row?.regional) handleInputChange('regional', row.regional);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regional" className="text-sm font-semibold text-slate-700">Base Operacional</Label>
              <Input id="regional" value={data.regional} readOnly placeholder="Ex: Volta Redonda" className="border-slate-300 bg-slate-100" />
            </div>
          </div>
        </CardContent>
      </Card>
      
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
                  <Label htmlFor="tipo_processo" className="text-sm font-semibold text-slate-700">Tipo de Processo *</Label>
                  <Select value={data.tipo_processo} onValueChange={(value) => handleInputChange('tipo_processo', value)}>
                    <SelectTrigger className="w-full border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Expansão">Expansão</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>                  
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="caracteristica" className="text-sm font-semibold text-slate-700">Característica *</Label>
                  <Select value={data.caracteristica} onValueChange={(value) => handleInputChange('caracteristica', value)}>
                    <SelectTrigger className="w-full border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Programada">Programada</SelectItem>
                      <SelectItem value="Emergencial">Emergencial</SelectItem>                   
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projeto" className="text-sm font-semibold text-slate-700">
                    Projeto{" "}
                    {(data.tipo_processo === "Expansão" && data.caracteristica === "Programada") ||
                    (data.tipo_processo === "Manutenção" && data.caracteristica === "Programada") ? (
                      <span className="required-asterisk">*</span>
                    ) : null}
                  </Label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 text-slate-600 px-3 py-2 rounded-l-md border border-r-0 border-slate-300 font-mono text-sm">
                      {data.tipo_processo === "Manutenção" ? "OMI-" : "OII-"}
                    </span>
                    <Input
                      id="projeto"
                      type="text"
                      placeholder="XX-XXXX"
                      maxLength={7}
                      required={
                        (data.tipo_processo === "Expansão" && data.caracteristica === "Programada") ||
                        (data.tipo_processo === "Manutenção" && data.caracteristica === "Programada")
                      }
                      value={getProjetoInputValue()}
                      onChange={handleProjetoChange}
                      className="border-slate-300 rounded-l-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordem_servico" className="text-sm font-semibold text-slate-700">
                    Ordem de Serviço (O.S.){" "}
                    {data.tipo_processo === "Manutenção" && data.caracteristica === "Emergencial" && (
                      <span className="required-asterisk">*</span>
                    )}
                  </Label>
                  <Input
                    id="ordem_servico"
                    type="text"
                    inputMode="numeric"
                    pattern="^9\\d{7}$"
                    maxLength={8}
                    minLength={8}
                    required={data.tipo_processo === "Manutenção" && data.caracteristica === "Emergencial"}
                    placeholder="9XXXXXXX"
                    title="A O.S. deve conter exatamente 8 dígitos e começar com 9"
                    value={data.ordem_servico || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 8 && (value === "" || value.startsWith("9"))) {
                        handleInputChange("ordem_servico", value);
                      }
                    }}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="ordem_manutencao" className="text-sm font-semibold text-slate-700">Ordem de Manutenção (O.M.)</Label>
                    <Input id="ordem_manutencao" value={data.ordem_manutencao || ''} onChange={e => handleInputChange('ordem_manutencao', e.target.value.replace(/\D/g, ''))} placeholder="20XXXXXXXX" maxLength="10" pattern="^20\d{8}$" className="border-slate-300" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pi" className="text-sm font-semibold text-slate-700">Pedido de Intervenção</Label>
                    <Input id="pi" value={data.pi || ''} onChange={e => handleInputChange('pi', e.target.value)} placeholder="Código PI" className="border-slate-300" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="ntc" className="text-sm font-semibold text-slate-700">NTC</Label>
                    <Input id="ntc" value={data.ntc || ''} onChange={e => handleInputChange('ntc', e.target.value)} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="circuito" className="text-sm font-semibold text-slate-700">Circuito</Label>
                    {/*<Input id="circuito" value={data.circuito || ''} onChange={e => handleInputChange('circuito', e.target.value)}  placeholder="LDA/LSA" className="border-slate-300" />*/}
                    <SearchableSelect
                      id="circuito"
                      tableName="light_lda"
                      columnName="alimentador"
                      placeholder="LDA/LSA"
                      value={data.circuito || ''}
                      onValueChange={(val) => handleInputChange('circuito', val)}
                      className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reserva" className="text-sm font-semibold text-slate-700">Reserva</Label>
                    <Input id="reserva" value={data.reserva || ''} onChange={e => handleInputChange('reserva', e.target.value)} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ks" className="text-sm font-semibold text-slate-700">KS</Label>
                    <Input id="ks" value={data.ks || ''} onChange={e => handleInputChange('ks', e.target.value)} placeholder="" className="border-slate-300" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cf" className="text-sm font-semibold text-slate-700">CF</Label>
                    <Input id="cf" value={data.cf || ''} onChange={e => handleInputChange('cf', e.target.value)} placeholder="" className="border-slate-300" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="zona" className="text-sm font-semibold text-slate-700">Zona</Label>
                    <Input id="zona" value={data.zona || ''} onChange={e => handleInputChange('zona', e.target.value)} placeholder="" className="border-slate-300" />
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
