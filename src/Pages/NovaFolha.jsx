

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, FileText, ArrowRight, Save } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { notifyFolhaStatusChange } from "@/lib/notifications";
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
    tipo_processo: '',
    caracteristica: '',
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
    eh_correcao: false,
    numero_fm_bloqueado: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [originalFolha, setOriginalFolha] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditPanelVisible, setIsEditPanelVisible] = useState(false);

  const editingQueryId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('editId');
  }, [location.search]);

  const isEditingMode = Boolean(editingQueryId || editingId);

  useEffect(() => {
    setIsEditPanelVisible(isEditingMode);
  }, [isEditingMode]);

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
    { number: 1, title: "Dados Gerais", description: "Informações gerais da obra" },
    { number: 2, title: "Equipes", description: "Equipes envolvidas" },
    { number: 3, title: "Serviços", description: "Serviços executados" },
    { number: 4, title: "Equipamentos", description: "Instalados/retirados" },
    { number: 5, title: "Materiais", description: "Utilizados/sobras" },
    { number: 6, title: "Revisão ", description: "Conferir e enviar" }
  ];

  const loadFolhaParaClonar = useCallback(async (id) => {
    setEditingId(null);
    setOriginalFolha(null);
    try {
      const folhaOriginal = await FolhaMedicao.get(id);
      const novaFolhaData = {
        ...folhaOriginal,
        status: 'rascunho',
        versao: (folhaOriginal.versao || 1) + 1,
        numero_fm: 'FM - ',
        folha_original_id: folhaOriginal.id, 
        data_envio: null,
        data_retorno_distribuidora: null,
        motivo_reprovacao: '',
        tipo_motivo_reprovacao: '',
        data_pagamento: null,
        numero_pagamento: '',
        status_historico: [...(folhaOriginal.status_historico || []), { status: 'reprovado', data: new Date().toISOString() }],
        eh_correcao: false,
        numero_fm_bloqueado: false,
      };
      delete novaFolhaData.id; 

      setFormData(novaFolhaData);
    } catch (error) {
      console.error("Erro ao carregar folha para clonar:", error);
      setFormData((prev) => ({ ...prev, numero_fm: prev.numero_fm || 'FM - ' }));
    }
  }, []);

  const loadFolhaParaEdicao = useCallback(async (id, stepNumber) => {
    setEditingId(id);
    try {
      const folhaExistente = await FolhaMedicao.get(id);
      if (!folhaExistente) {
        alert("Folha não encontrada para edição.");
        setEditingId(null);
        setOriginalFolha(null);
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

      setOriginalFolha(folhaExistente);
      setEditingId(folhaExistente.id);
      setFormData((prev) => ({
        ...prev,
        ...normalizada,
        numero_fm_bloqueado: Boolean(normalizada.eh_correcao),
      }));
      setCurrentStep(stepNumber);
    } catch (error) {

      console.error("Erro ao carregar folha para edição:", error);
      alert("Não foi possível carregar a folha para edição.");
      setEditingId(null);
      setOriginalFolha(null);
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
      setEditingId(null);
      setOriginalFolha(null);
      setFormData((prev) => ({ ...prev, numero_fm: prev.numero_fm || 'FM - ' }));
    }
  }, [location.search, loadFolhaParaClonar, loadFolhaParaEdicao, steps.length]);

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
        ['tecnico_light', 'Técnico Light'],
        ['data_obra', 'Data da Obra'],
        ['hora_acionada', 'Hora Acionada'],
        ['hora_inicio', 'Hora Início'],
        ['hora_fim', 'Hora Fim'],
        ['endereco', 'Endereço Completo'],
        ['municipio', 'Município'],
        ['tipo_processo', 'Tipo de Processo'], 
        ['caracteristica', 'Característica'], 
      ];

      req.forEach(([k, label]) => { if (!formData[k]) missing.push(label); });

      if (!missing.length) { 
        if (formData.caracteristica === 'Programada') {
          if (!formData.projeto || formData.projeto === 'OII-' || formData.projeto === 'OMI-') {
            missing.push('Projeto');
          }
        } else if (formData.caracteristica === 'Emergencial') {
          if (!formData.ordem_servico || formData.ordem_servico.trim() === '') {
            missing.push('Ordem de Serviço');
          }
        }
      }

      if (missing.length) {
        alert(`Preencha os campos obrigatórios:\n- ${missing.join('\n- ')}`);
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
        alert("Informe horários válidos (HH:MM) para acionamento, início e fim.");
        return;
      }
      if (minutosAcionada >= minutosInicio || minutosAcionada >= minutosFim) {
        alert("A Hora Acionada deve ser anterior a  Hora Início e a  Hora Fim.");
        return;
      }
      if (minutosInicio <= minutosAcionada || minutosInicio >= minutosFim) {
        alert("A Hora Início deve ser posterior a Hora Acionada e anterior a Hora Fim.");
        return;
      }
      if (minutosFim <= minutosInicio || minutosFim <= minutosAcionada) {
        alert("A Hora Fim deve ser posterior a Hora Acionada e a Hora Início.");
        return;
      }

      const numeroFmRaw = (formData.numero_fm || "").toUpperCase().trim();
      if (!numeroFmRaw || /^FM\s*-\s*$/.test(numeroFmRaw)) {
        alert("Informe o nAmero da Folha de Medição (exemplo: FM - 10.123).");
        return;
      }
      if (!numeroFmRaw.startsWith("FM -")) {
        alert("O número da Folha de Medição deve começar com 'FM -'.");
        return;
      }

      const numeroSemPrefixo = numeroFmRaw.replace(/^FM\s*-\s*/i, "");
      const versaoRegex = /-v\d+$/i;
      const possuiVersao = versaoRegex.test(numeroSemPrefixo);
      const numeroBase = numeroSemPrefixo.replace(versaoRegex, "");
      const contextoCorrecaoValido =
        !possuiVersao ||
        formData.eh_correcao ||
        formData.status === "reprovado" ||
        (formData.status_historico || []).some(
          (historico) => historico?.status === "reprovado"
        );
      if (possuiVersao && !contextoCorrecaoValido) {
        alert("O sufixo '-vX' só pode ser usado em folhas reprovadas que estão em correção.");
        return;
      }
      if (!/^\d{2}\.\d{3}$/.test(numeroBase)) {
        alert("O número da Folha de Medição deve seguir o formato 'FM - XX.XXX' (ou 'FM - XX.XXX-vX' para correções).");
        return;
      }

      const regionalKey = (formData.regional || formData.base_operacional || "").trim();
      const expectedPrefix = NUMERO_FM_PREFIX_MAP[regionalKey]?.[formData.tipo_processo];
      if (expectedPrefix && !numeroBase.startsWith(expectedPrefix)) {
        alert(
          `Para a base ${regionalKey} em ${formData.tipo_processo}, o número deve começar com '${expectedPrefix}' (exemplo: FM - ${expectedPrefix}123).`

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
          "Tem certeza que não existe nenhum equipamento instalado e/ou retirado ?"
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
          "Tem certeza que não existe nenhum material instalado e/ou retirado ?"
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

  const handleCancelEditing = async () => {
    const editTargetId = editingId || editingQueryId;
    if (!editTargetId) {
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar a edição ? Nenhuma alteracão será salva.",

    );
    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    try {
      const historicoAnterior = Array.isArray(originalFolha?.status_historico)
        ? originalFolha.status_historico
        : Array.isArray(formData.status_historico)
          ? formData.status_historico
          : [];

      const usuarioAtual =
        profile?.full_name ||
        profile?.email ||
        session?.user?.email ||
        session?.user?.user_metadata?.full_name ||
        "sistema";

      const updatedHistory = [
        ...historicoAnterior,
        {
          status: "edicao_cancelada",
          data: new Date().toISOString(),
          usuario: usuarioAtual,
          observacoes: "Edição cancelada pelo usuário antes de salvar.",
        },
      ];

      const statusAtual = originalFolha?.status ?? formData.status ?? "rascunho";

      await FolhaMedicao.update(editTargetId, {
        status: statusAtual,
        status_historico: updatedHistory,
      });

      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch { }

      alert("Edição cancelada. Nenhuma alteração foi salva.");
      setEditingId(null);
      setOriginalFolha(null);
      setIsEditPanelVisible(false);
      navigate(createPageUrl("ListaFolhas"));
    } catch (error) {
      console.error("Erro ao Cancelar edição da folha:", error);
      alert("Não foi possível cancelar a edição. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSave = async (payload) => {
    setIsSaving(true);
    try {
      const cleanedPayload = { ...payload };
      delete cleanedPayload.numero_fm_bloqueado;
      const wasAwaitingCorrection = cleanedPayload.status === "aguardando_correcao";
      const effectiveEditingId = editingId || editingQueryId;
      const isEditing = Boolean(effectiveEditingId);
      if (isEditing) {
        cleanedPayload.id = effectiveEditingId;
      }
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
        alert("Preencha os campos obrigatórios: " + missingFields.join(", "));
        setIsSaving(false);
        return;
      }

      setFormErrors([]);
      if (cleanedPayload.id) {
        if (wasAwaitingCorrection) {
          const usuarioAtual =
            profile?.full_name ||
            profile?.email ||
            session?.user?.email ||
            session?.user?.user_metadata?.full_name ||
            "sistema";

          const historicoAnterior = Array.isArray(cleanedPayload.status_historico)
            ? cleanedPayload.status_historico
            : [];

          cleanedPayload.status = "rascunho";
          cleanedPayload.status_historico = [
            ...historicoAnterior,
            {
              status: "rascunho",
              data: new Date().toISOString(),
              usuario: usuarioAtual,
              observacoes: "Status retornado para rascunho após edição",
            },
          ];
        }

        await FolhaMedicao.update(cleanedPayload.id, cleanedPayload);

      } else {
        if (isEditing) {
          alert("Nao é possível criar uma nova folha enquanto estiver editando uma existente. Volte a lista e tente novamente.");
          setIsSaving(false);
          return;
        }

        const createdBy = {
          created_by_user_id: session?.user?.id || null,
          created_by_matricula: profile?.matricula || null,
          created_by_name: profile?.full_name || null,
          created_by_email:
            session?.user?.email ||
            profile?.email ||
            session?.user?.user_metadata?.email ||
            null,
          created_by_role: profile?.role || null,
        };

        const novaFolha = await FolhaMedicao.create({ ...cleanedPayload, ...createdBy });
        try {
          const actorEmail =
            createdBy.created_by_email ||
            session?.user?.email ||
            profile?.email ||
            session?.user?.user_metadata?.email ||
            null;
          const actorRole = profile?.role || null;
          await notifyFolhaStatusChange({
            folha: novaFolha || { ...cleanedPayload, ...createdBy },
            novoStatus: "rascunho",
            context: { actorEmail, actorRole },
          });
        } catch (notificationError) {
          console.warn("[NovaFolha] Falha ao gerar notificacao de rascunho", notificationError);
        }

      }

      try {
        if (hasSupabase()) {
          alert("Folha salva com sucesso!");
        } else {
          alert("Folha salva com sucesso no armazenamento local (Banco de Dados desativado).");
        }
      } catch { }

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
      const fallbackMessage = error?.message || "Erro ao salvar a folha. Verifique os campos obrigatórios e tente novamente.";

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
        <div className="relative mb-6 md:mb-8">
          {isEditingMode && (
            <div
              className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 transition-all duration-300 ease-out z-10 ${isEditPanelVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6 pointer-events-none"
                }`}
              style={{ top: "-1.75rem" }}
            >
              <div className="w-full max-w-[14rem] sm:max-w-[16rem] border-2 border-blue-500 bg-white shadow-md rounded-3xl px-5 py-2.5 flex justify-center">
                <Button
                  onClick={handleCancelEditing}
                  disabled={isSaving || isCancelling || !isEditingMode}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {isCancelling ? "Cancelando..." : "Cancelar Edição"}
                </Button>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-4 ${isEditingMode ? "pt-10" : ""}`}>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-600" />
                {isEditingMode ? "Editar Folha de Medicão" : "Nova Folha de Medicão"}
              </h1>
              <p className="text-slate-600 mt-1">
                {isEditingMode ? "Revise os dados e atualize a folha de medição selecionada." : "Siga as etapas para cadastrar uma nova folha de medição."}
              </p>
            </div>
          </div>
        </div>
        <StepIndicator steps={steps} currentStep={currentStep} />
        {formErrors.length > 0 && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Revise os campos obrigatArios</AlertTitle>
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
              disabled={currentStep === 1 || isCancelling}
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
                disabled={isSaving || isCancelling}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSaving ? "Salvando..." : "Salvar e Concluir"}
                {!isSaving && <Save className="w-4 h-4" />}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled || isCancelling}
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