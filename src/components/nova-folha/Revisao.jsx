import React from "react";
import { useAuth } from "@/context/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Building, FileCog, Users, Wrench, Box } from "lucide-react";
import { format } from "date-fns";

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="font-semibold text-slate-900">{value || "N/A"}</p>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <Card className="border-slate-200 shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Icon className="w-5 h-5 text-blue-600" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default function Revisao({ data }) {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
        <AlertTriangle className="h-4 w-4 !text-blue-800" />
        <AlertTitle>Atenção!</AlertTitle>
        <AlertDescription>
          Confira todos os dados cuidadosamente antes de salvar. As informações serão salvas no sistema.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <SectionCard title="Dados Gerais da Obra" icon={Building}>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Nº FM" value={data.numero_fm} />
              <InfoItem label="Técnico Light" value={data.tecnico_light} />
              <InfoItem label="Data da Obra" value={data.data_obra ? format(new Date(data.data_obra + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'} />
              <InfoItem label="Município" value={data.municipio} />
              <InfoItem label="Endereço" value={data.endereco} />
              <InfoItem label="Outros" value={data.outros} />
              <InfoItem label="Criado por" value={(data.created_by_matricula && data.created_by_name) ? `${data.created_by_matricula} - ${data.created_by_name}` : (profile ? `${profile.matricula || ''} - ${profile.full_name || ''}` : 'N/A')} />
            </div>
          </SectionCard>
          
          <SectionCard title="Dados do Processo" icon={FileCog}>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Tipo de Processo" value={data.tipo_processo} />
              <InfoItem label="Característica" value={data.caracteristica} />
              <InfoItem label="Projeto" value={data.projeto} />
              <InfoItem label="Ordem de Serviço" value={data.ordem_servico} />
            </div>
          </SectionCard>
          
          <SectionCard title="Equipes Envolvidas" icon={Users}>
            {data.equipes?.length > 0 ? (
              <div className="space-y-3">
                {data.equipes.map((equipe, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded text-sm">
                    <p><strong>Equipe:</strong> {equipe.codigo_equipe}</p>
                    <p><strong>Encarregado:</strong> {equipe.encarregado}</p>
                    <p><strong>Motorista:</strong> {equipe.motorista || 'N/A'}</p>
                    <p><strong>Eletricistas:</strong> {equipe.eletricistas?.join(', ') || 'Nenhum'}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Nenhuma equipe adicionada.</p>}
          </SectionCard>
        </div>
        
        <div className="space-y-8">
          <SectionCard title="Serviços Executados" icon={Wrench}>
            {data.servicos?.length > 0 ? (
              <div className="space-y-2">
                {data.servicos.map((servico, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded text-sm space-y-2">
                    <div className="flex justify-between gap-4">
                      <span>{servico.descricao} (Qtd: {servico.quantidade})</span>
                      <span className="font-semibold">R$ {servico.valor_total?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                    {servico.observacao ? (
                      <p className="text-xs text-slate-600">Obs: {servico.observacao}</p>
                    ) : null}
                  </div>
                ))}
                <div className="pt-2 border-t mt-2 flex justify-between items-center">
                  <span className="font-bold">TOTAL</span>
                  <span className="font-bold text-lg text-green-600">R$ {data.valor_total?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">Nenhum serviço adicionado.</p>}
          </SectionCard>
          
          <SectionCard title="Equipamentos" icon={Wrench}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Instalados ({data.equipamentos_instalados?.length || 0})</h4>
                {data.equipamentos_instalados?.length > 0 ? data.equipamentos_instalados.map((item, index) => (
                  <div key={index} className="p-2 bg-green-50 rounded text-xs">
                    {item.serial} - {item.fabricante} ({item.capacidade || 'N/A'})
                  </div>
                )) : <p className="text-xs text-slate-500">Nenhum.</p>}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Retirados ({data.equipamentos_retirados?.length || 0})</h4>
                {data.equipamentos_retirados?.length > 0 ? data.equipamentos_retirados.map((item, index) => (
                  <div key={index} className="p-2 bg-orange-50 rounded text-xs">
                    {item.serial} - {item.fabricante} ({item.capacidade || 'N/A'})
                  </div>
                )) : <p className="text-xs text-slate-500">Nenhum.</p>}
              </div>
            </div>
          </SectionCard>
          
          <SectionCard title="Materiais" icon={Box}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Instalados ({data.materiais_instalados?.length || 0})</h4>
                {data.materiais_instalados?.length > 0 ? data.materiais_instalados.map((item, index) => (
                  <div key={index} className="p-2 bg-green-50 rounded text-xs">
                    {item.descricao} (Qtd: {item.quantidade})
                  </div>
                )) : <p className="text-xs text-slate-500">Nenhum.</p>}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Retirados ({data.materiais_retirados?.length || 0})</h4>
                {data.materiais_retirados?.length > 0 ? data.materiais_retirados.map((item, index) => (
                  <div key={index} className="p-2 bg-orange-50 rounded text-xs">
                    {item.descricao} (Qtd: {item.quantidade})
                  </div>
                )) : <p className="text-xs text-slate-500">Nenhum.</p>}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
