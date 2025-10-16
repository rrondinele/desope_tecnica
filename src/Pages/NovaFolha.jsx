
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { FolhaMedicao } from "@/entities/FolhaMedicao"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, FileText, ArrowRight, Save } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { hasSupabase } from "@/services/supabaseClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StepIndicator from "../components/nova-folha/StepIndicator";
import DadosGerais from "../components/nova-folha/DadosGerais";
import ServicosStep from "../components/nova-folha/ServicosStep";
import EquipeSection from "../components/folha/EquipeSection";
import EquipamentosSection from "../components/folha/EquipamentosSection";
import MateriaisSection from "../components/folha/MateriaisSection";
import Revisao from "../components/nova-folha/Revisao";

const NUMERO_FM_PREFIX_MAP = {
  "Volta Redonda": {
    "Expansao": "10.",
    "Manutencao": "60.",
  },
  "Barra do Pirai": {
    "Expansao": "70.",
    "Manutencao": "50.",
  },
  "Tres Rios": {
    "Expansao": "00.",
    "Manutencao": "40.",
  },
};

const DRAFT_STORAGE_KEY = "nova-folha:draft";
const REQUIRED_FIELD_LABELS = {
  numero_fm: "Numero da Folha de Medicao",
  tecnico_light: "Tecnico Light",
  endereco: "Endereco",
  tipo_processo: "Tipo de Processo",
  data_obra: "Data da Obra",
};

const getMissingRequiredFields = (payload = {}) => {
  const missing = [];

  Object.entries(REQUIRED_FIELD_LABELS).forEach(([field, label]) => {
    const value = payload[field];

    if (field === "numero_fm") {
      const numericPart = (value || "")
        .toString()
        .replace(/^FM\s*-\s*/i, "")
        .replace(/\D/g, "");
      if (!numericPart) {
        missing.push(label);
      }
      return;
    }

    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      missing.push(label);
    }
  });

  return missing;
};

const toMinutes = (time) => {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export default function NovaFolha() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [formData, setFormData] = useState({
    numero_fm: 'FM - ',
    empreiteira: 'CENEGED',
    tecnico_light: '',
    endereco: '',
    tipo_processo: 'ExpansAo',
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
    outros: '',
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

  useEffect(() => {
    if (draftLoaded) {
      return;
    }

    if (typeof window === "undefined") {
      setDraftLoaded(true);
      return;
    }

    const params = new URLSearchParams(location.search);
    const isEditingExisting = params.has('editId') || params.has('cloneFrom');

    if (isEditingExisting) {
      setDraftLoaded(true);
      return;
    }

    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft);
        if (parsedDraft && typeof parsedDraft === "object") {
          setFormData((prev) => ({
            ...prev,
            ...parsedDraft,
          }));
        }
      }
    } catch (error) {
      console.warn("[NovaFolha] Unable to restore draft from localStorage", error);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftLoaded, location.search]);

  useEffect(() => {
    if (!draftLoaded || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn("[NovaFolha] Unable to persist draft to localStorage", error);
    }
  }, [formData, draftLoaded]);

  const steps = [
    { number: 1, title: "Dados Gerais", description: "Informações da obra" },
    { number: 2, title: "Equipes", description: "Equipes envolvidas" },
    { number: 3, title: "Serviços", description: "Serviços executados" },
    { number: 4, title: "Equipamentos", description: "Instalados/retirados" },
    { number: 5, title: "Materiais", description: "Utilizados/sobras" },
    { number: 6, title: "Revisão ", description: "Conferir e enviar" }
  ];

  const loadFolhaParaClonar = useCallback(async (id) => {
    try {
      const folhaOriginal = await FolhaMedicao.get(id);
      const novaFolhaData = {
        ...folhaOriginal,
        status: 'rascunho',
        versao: (folhaOriginal.versao || 1) + 1,
        numero_fm: 'FM - ',
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
      setFormData((prev) => ({ ...prev, numero_fm: prev.numero_fm || 'FM - ' }));
    }
  }, []);

  const loadFolhaParaEdicao = useCallback(async (id, stepNumber) => {
    try {
      const folhaExistente = await FolhaMedicao.get(id);

      if (!folhaExistente) {
        alert("Folha nAo encontrada para ediAAo.");
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
      console.error("Erro ao carregar folha para ediAAo:", error);
      alert("NAo foi possAvel carregar a folha para ediAAo.");
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
      setFormData((prev) => ({ ...prev, numero_fm: prev.numero_fm || 'FM - ' }));
    }
  }, [location.search, loadFolhaParaClonar, loadFolhaParaEdicao, steps.length]);
  
  useEffect(() => {
    const prefix = formData.tipo_processo === 'ManutenAAo' ? 'OMI-' : 'OII-';
    if (!formData.projeto?.startsWith(prefix)) {
        const currentSuffix = formData.projeto?.replace(/^(OII-|OMI-)/, '') || '';
        setFormData(prev => ({ ...prev, projeto: `${prefix}${currentSuffix}` }));
    }
  }, [formData.tipo_processo, formData.projeto]);

  const handleNext = () => {
    if (currentStep === 1) {
      const missing = [];
      const req = [
        ['tecnico_light','TAcnico Light'],
        ['data_obra','Data da Obra'],
        ['hora_acionada','Hora Acionada'],
        ['hora_inicio','Hora InAcio'],
        ['hora_fim','Hora Fim'],
        ['endereco','EndereAo Completo'],
        ['municipio','MunicApio'],
      ];
      req.forEach(([k,label]) => { if (!formData[k]) missing.push(label); });
      // ValidaAAo para Dados do Processo
      if (formData.tipo_processo === 'ExpansAo') {
        if (!formData.projeto || formData.projeto === 'OII-') {
          missing.push('Projeto');
        }
      } else if (formData.tipo_processo === 'ManutenAAo') {
        const isProjetoValido = formData.projeto && formData.projeto !== 'OMI-';
        const isOsValida = formData.ordem_servico && formData.ordem_servico.trim() !== '';
        if (!isProjetoValido && !isOsValida) {
          missing.push('Projeto ou Ordem de ServiAo');
        }
      }

      if (missing.length) {
        alert(`Preencha os campos obrigatA3rios:\n- ${missing.join('\n- ')}`);
        return;
      }

      const minutosAcionada = toMinutes(formData.hora_acionada);
      const minutosInicio = toMinutes(formData.hora_inicio);
      const minutosFim = toMinutes(formData.hora_fim);

      if (
        minutosAcionada === null ||
        minutosInicio === null ||
        minutosFim === null
      ) {
        alert("Informe horArios vAlidos (HH:MM) para acionamento, inAcio e fim.");
        return;
      }

      if (minutosAcionada >= minutosInicio || minutosAcionada >= minutosFim) {
        alert("A Hora Acionada deve ser anterior A  Hora InAcio e A  Hora Fim.");
        return;
      }

      if (minutosInicio <= minutosAcionada || minutosInicio >= minutosFim) {
        alert("A Hora InAcio deve ser posterior A  Hora Acionada e anterior A  Hora Fim.");
        return;
      }

      if (minutosFim <= minutosInicio || minutosFim <= minutosAcionada) {
        alert("A Hora Fim deve ser posterior A  Hora Acionada e A  Hora InAcio.");
        return;
      }

      const numeroFmRaw = (formData.numero_fm || "").toUpperCase().trim();
      if (!numeroFmRaw || /^FM\s*-\s*$/.test(numeroFmRaw)) {
        alert("Informe o nAomero da Folha de MediAAo (exemplo: FM - 10.123).");
        return;
      }

      if (!numeroFmRaw.startsWith("FM -")) {
        alert("O nAomero da Folha de MediAAo deve comeAar com 'FM -'.");
        return;
      }

      const numeroSemPrefixo = numeroFmRaw.replace(/^FM\s*-\s*/i, "");
      if (!/^\d{2}\.\d{3}$/.test(numeroSemPrefixo)) {
        alert("O nAomero da Folha de MediAAo deve seguir o formato 'FM - XX.XXX'.");
        return;
      }

      const regionalKey = (formData.regional || formData.base_operacional || "").trim();
      const expectedPrefix = NUMERO_FM_PREFIX_MAP[regionalKey]?.[formData.tipo_processo];
      if (expectedPrefix && !numeroSemPrefixo.startsWith(expectedPrefix)) {
        alert(
          `Para a base ${regionalKey} em ${formData.tipo_processo}, o nAomero deve comeAar com '${expectedPrefix}' (exemplo: FM - ${expectedPrefix}123).`
        );
        return;
      }
    }
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);

    if (currentStep === 4) {
        const temEquipamento =
          (formData.equipamentos_instalados?.length ?? 0) > 0 ||
          (formData.equipamentos_retirados?.length ?? 0) > 0;

        if (!temEquipamento) {
          const continuar = window.confirm(
            "Tem certeza que nAo existe nenhum equipamento instalado e/ou retirado?"
          );
          if (!continuar) return;
        }
      }

      if (currentStep === 5) {
        const temMaterial =
          (formData.materiais_instalados?.length ?? 0) > 0 ||
          (formData.materiais_retirados?.length ?? 0) > 0;

        if (!temMaterial) {
          const continuar = window.confirm(
            "Tem certeza que nAo existe nenhum material instalado e/ou retirado?"
          );
          if (!continuar) return;
        }
      }
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
      const cleanedPayload = { ...payload };
      cleanedPayload.numero_fm = cleanedPayload.numero_fm ? cleanedPayload.numero_fm.trim() : cleanedPayload.numero_fm;
      Object.keys(cleanedPayload).forEach((key) => {
        if (cleanedPayload[key] === null || cleanedPayload[key] === undefined) {
          if (typeof cleanedPayload[key] !== "boolean") {
            delete cleanedPayload[key];
          }
        }
      });

      const missingFields = getMissingRequiredFields(cleanedPayload);
      if (missingFields.length > 0) {
        setFormErrors(missingFields);
        setCurrentStep(1);
        alert("Preencha os campos obrigatorios: " + missingFields.join(", "));
        setIsSaving(false);
        return;
      }

      setFormErrors([]);

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

      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (error) {
        console.warn("[NovaFolha] Unable to clear draft from localStorage", error);
      }

      navigate(createPageUrl("ListaFolhas"));
    } catch (error) {
      console.error("Erro ao salvar folha:", error);
      const fallbackMessage = error?.message || "Erro ao salvar a folha. Verifique os campos obrigatorios e tente novamente.";
      setFormErrors([fallbackMessage]);
      alert(fallbackMessage);
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

  const isNextDisabled = useMemo(() => {
    switch (currentStep) {
      case 2: {
        return (formData.equipes?.length ?? 0) === 0;
      }
      case 3: {
        return (formData.servicos?.length ?? 0) === 0;
      }
      case 4: {/*{
        const instalados = formData.equipamentos_instalados?.length ?? 0;
        const retirados = formData.equipamentos_retirados?.length ?? 0;
        return instalados === 0 && retirados === 0;
      }*/} return false; // Permitir avanAar mesmo sem equipamentos
      case 5: {/*{
        const instalados = formData.materiais_instalados?.length ?? 0;
        const retirados = formData.materiais_retirados?.length ?? 0;
        return instalados === 0 && retirados === 0;
      }*/} return false; // Permitir avanAar mesmo sem materiais
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
      await handleSave(formData);
    } catch (error) {
      console.error("Erro ao salvar folha:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Nova Folha de MediAAo
            </h1>
            <p className="text-slate-600 mt-1">
              Siga as etapas para cadastrar uma nova folha de mediAAo.
            </p>
          </div>
        </div>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {formErrors.length > 0 && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Revise os campos obrigatorios</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-1">
                {formErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-white border-0 shadow-lg mt-8">
          <CardHeader className="border-b border-slate-100">
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            {renderCurrentStep()}
          </CardContent>
        </Card>
      </div>

      {/* BOTAES COM DISTANCIA PADRAO DO CONTAINER */}
      <div className="fixed inset-0 z-40 flex items-center justify-between pointer-events-none">
        {/* CONTAINER INVISAVEL PARA ALINHAMENTO */}
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8 relative">
          {/* ESPAAO A ESQUERDA DO CONTAINER */}
          <div className="absolute -left-20 md:-left-24 lg:-left-32 top-1/2 transform -translate-y-1/2">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-900/5 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          {/* BOTAO DIREITA */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-[-8px] md:right-[-96px] lg:right-[-128px] xl:right-[-380px]"
          >
            {currentStep === steps.length ? (
              <Button
                onClick={handleFinalSave}
                disabled={isSaving}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSaving ? "Salvando..." : "Salvar e Concluir"}
                {!isSaving && <Save className="w-4 h-4" />}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-900 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
