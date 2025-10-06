
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { FolhaMedicao } from "@/entities/FolhaMedicao"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, FileText, ArrowRight, Save } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { hasSupabase } from "@/services/supabaseClient";
import StepIndicator from "../components/nova-folha/StepIndicator";
import DadosGerais from "../components/nova-folha/DadosGerais";
import ServicosStep from "../components/nova-folha/ServicosStep";
import EquipeSection from "../components/folha/EquipeSection";
import EquipamentosSection from "../components/folha/EquipamentosSection";
import MateriaisSection from "../components/folha/MateriaisSection";
import Revisao from "../components/nova-folha/Revisao";

export default function NovaFolha() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    numero_fm: '',
    empreiteira: 'CENEGED',
    tecnico_light: '',
    endereco: '',
    tipo_processo: 'Expansão',
    caracteristica: 'Programada',
    data_obra: '',
    hora_acionada: '',
    hora_inicio: '',
    hora_fim: '',
    municipio: '',
    base_operacional: '',
    circuito: '',
    projeto: 'OII-',
    ordem_servico: '',
    ordem_manutencao: '',
    reserva: '',
    ntc: '',
    pi: '',
    ks: '',
    cf: '',
    zona: '',
    servicos: [],
    equipes: [],
    equipamentos_instalados: [],
    equipamentos_retirados: [],
    materiais_instalados: [],
    materiais_retirados: [],
    status: 'rascunho',
    versao: 1,
    status_historico: [],
    data_envio: null,
    data_retorno_distribuidora: null,
    motivo_reprovacao: '',
    tipo_motivo_reprovacao: '',
    data_pagamento: null,
    numero_pagamento: '',
  });

  const steps = [
    { number: 1, title: "Dados Gerais", description: "Informações da obra" },
    { number: 2, title: "Equipes", description: "Equipes envolvidas" },
    { number: 3, title: "Serviços", description: "Serviços executados" },
    { number: 4, title: "Equipamentos", description: "Instalados/retirados" },
    { number: 5, title: "Materiais", description: "Utilizados/sobras" },
    { number: 6, title: "Revisão", description: "Conferir e enviar" }
  ];

  const gerarNumeroFM = useCallback(async () => {
    try {
      const todasFolhas = await FolhaMedicao.list(null, 0); 
      const novoNumero = (todasFolhas?.length || 0) + 1;
      const numeroFM = `FM-${String(novoNumero).padStart(6, '0')}`;
      setFormData(prev => ({ ...prev, numero_fm: numeroFM }));
    } catch (error) {
      console.error("Erro ao gerar número FM:", error);
      const numeroFM = `FM${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, numero_fm: numeroFM }));
    }
  }, []);

  const loadFolhaParaClonar = useCallback(async (id) => {
    try {
      const folhaOriginal = await FolhaMedicao.get(id);
      const numeroFMBase = folhaOriginal.numero_fm.split('-v')[0]; // Adjusting for -v format
      const novaFolhaData = {
        ...folhaOriginal,
        status: 'rascunho',
        versao: (folhaOriginal.versao || 1) + 1,
        numero_fm: `${numeroFMBase}-v${(folhaOriginal.versao || 1) + 1}`,
        folha_original_id: folhaOriginal.id, // Keep a reference to the original
        data_envio: null,
        data_retorno_distribuidora: null,
        motivo_reprovacao: '',
        tipo_motivo_reprovacao: '',
        data_pagamento: null,
        numero_pagamento: '',
        status_historico: [...(folhaOriginal.status_historico || []), { status: 'reprovado', data: new Date().toISOString() }]
      };
      delete novaFolhaData.id; // Ensure it's a new entry
      setFormData(novaFolhaData);
    } catch (error) {
      console.error("Erro ao carregar folha para clonar:", error);
      // Fallback to generating a new FM number if cloning fails
      gerarNumeroFM();
    }
  }, [gerarNumeroFM]);

  const loadFolhaParaEdicao = useCallback(async (id, stepNumber) => {
    try {
      const folhaExistente = await FolhaMedicao.get(id);

      if (!folhaExistente) {
        alert("Folha não encontrada para edição.");
        navigate(createPageUrl("ListaFolhas"));
        return;
      }

      const normalizada = {
        ...folhaExistente,
        servicos: folhaExistente.servicos || [],
        equipes: folhaExistente.equipes || [],
        equipamentos_instalados: folhaExistente.equipamentos_instalados || [],
        equipamentos_retirados: folhaExistente.equipamentos_retirados || [],
        materiais_instalados: folhaExistente.materiais_instalados || [],
        materiais_retirados: folhaExistente.materiais_retirados || [],
        status_historico: folhaExistente.status_historico || [],
      };

      setFormData((prev) => ({
        ...prev,
        ...normalizada,
      }));
      setCurrentStep(stepNumber);
    } catch (error) {
      console.error("Erro ao carregar folha para edição:", error);
      alert("Não foi possível carregar a folha para edição.");
      navigate(createPageUrl("ListaFolhas"));
    }
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('editId');
    const cloneId = params.get('cloneFrom');
    const stepParam = params.get('step');
    const parsedStep = Number(stepParam);
    const totalSteps = steps.length;
    const defaultStep = parsedStep >= 1 && parsedStep <= totalSteps ? parsedStep : 1;

    if (editId) {
      loadFolhaParaEdicao(editId, defaultStep);
    } else if (cloneId) {
      loadFolhaParaClonar(cloneId);
    } else {
      gerarNumeroFM();
    }
  }, [location.search, loadFolhaParaClonar, loadFolhaParaEdicao, gerarNumeroFM, steps.length]);
  
  useEffect(() => {
    const prefix = formData.tipo_processo === 'Manutenção' ? 'OMI-' : 'OII-';
    if (!formData.projeto?.startsWith(prefix)) {
        const currentSuffix = formData.projeto?.replace(/^(OII-|OMI-)/, '') || '';
        setFormData(prev => ({ ...prev, projeto: `${prefix}${currentSuffix}` }));
    }
  }, [formData.tipo_processo, formData.projeto]);

  const handleNext = () => {
    if (currentStep === 1) {
      const missing = [];
      const req = [
        ['tecnico_light','Técnico Light'],
        ['data_obra','Data da Obra'],
        ['hora_acionada','Hora Acionada'],
        ['hora_inicio','Hora Início'],
        ['hora_fim','Hora Fim'],
        ['endereco','Endereço Completo'],
        ['municipio','Município'],
      ];
      req.forEach(([k,label]) => { if (!formData[k]) missing.push(label); });
// Validação para Dados do Processo
      if (formData.tipo_processo === 'Expansão') {
        if (!formData.projeto || formData.projeto === 'OII-') {
          missing.push('Projeto');
        }
      } else if (formData.tipo_processo === 'Manutenção') {
        const isProjetoValido = formData.projeto && formData.projeto !== 'OMI-';
        const isOsValida = formData.ordem_servico && formData.ordem_servico.trim() !== '';
        if (!isProjetoValido && !isOsValida) {
          missing.push('Projeto ou Ordem de Serviço');
        }
      }

      if (missing.length) {
        alert(`Preencha os campos obrigatórios:\n- ${missing.join('\n- ')}`);
        return;
      }
    }
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const handleSave = async (payload) => {
    setIsSaving(true);
    try {
      // Limpeza e preparação final dos dados
      const cleanedPayload = { ...payload };
      Object.keys(cleanedPayload).forEach(key => {
        // Remove campos nulos ou indefinidos que não são booleanos para evitar erros de validação
        if (cleanedPayload[key] === null || cleanedPayload[key] === undefined) {
           if(typeof cleanedPayload[key] !== 'boolean'){
                delete cleanedPayload[key];
           }
        }
      });
      
      if (cleanedPayload.id) {
        await FolhaMedicao.update(cleanedPayload.id, cleanedPayload);
      } else {
        const createdBy = {
          created_by_user_id: session?.user?.id || null,
          created_by_matricula: profile?.matricula || null,
          created_by_name: profile?.full_name || null,
        };
        await FolhaMedicao.create({ ...cleanedPayload, ...createdBy });
      }
      try {
        if (hasSupabase()) {
          alert("Folha salva com sucesso no Supabase!");
        } else {
          alert("Folha salva com sucesso no armazenamento local (Supabase desativado).");
        }
      } catch {}
      navigate(createPageUrl("ListaFolhas"));
    } catch (error) {
      console.error("Erro ao salvar folha:", error);
      alert("Erro ao salvar a folha. Verifique os campos obrigatórios e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <DadosGerais data={formData} updateData={updateFormData} />;
      case 2:
        return <EquipeSection equipes={formData.equipes} onChange={(equipes) => updateFormData({ equipes })} />;
      case 3:
        return <ServicosStep data={formData} updateData={updateFormData} />;
      case 4:
        return <EquipamentosSection equipamentosInstalados={formData.equipamentos_instalados} equipamentosRetirados={formData.equipamentos_retirados} onChangeInstalados={(equipamentos_instalados) => updateFormData({ equipamentos_instalados })} onChangeRetirados={(equipamentos_retirados) => updateFormData({ equipamentos_retirados })} />;
      case 5:
        return <MateriaisSection materiaisInstalados={formData.materiais_instalados} materiaisRetirados={formData.materiais_retirados} onChangeInstalados={(materiais_instalados) => updateFormData({ materiais_instalados })} onChangeRetirados={(materiais_retirados) => updateFormData({ materiais_retirados })} />;
      case 6:
        return <Revisao data={formData} onSave={handleSave} isSaving={isSaving} onPrevious={handlePrevious} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Nova Folha de Medição
            </h1>
            <p className="text-slate-600 mt-1">
              Siga as etapas para cadastrar uma nova folha de medição.
            </p>
          </div>
        </div>

        <StepIndicator steps={steps} currentStep={currentStep} />

        <Card className="bg-white border-0 shadow-lg mt-8">
          <CardHeader className="border-b border-slate-100">
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            {renderCurrentStep()}
          </CardContent>
        </Card>
        
        {currentStep < 6 && (
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}