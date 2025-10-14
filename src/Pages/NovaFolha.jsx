import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { FolhaMedicao } from "@/entities/FolhaMedicao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, FileText, Save } from "lucide-react";
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

const NUMERO_FM_PREFIX_MAP = {
  "Volta Redonda": {
    "Expansão": "10.",
    "Manutenção": "60.",
  },
  "Barra do Piraí": {
    "Expansão": "70.",
    "Manutenção": "50.",
  },
  "Tres Rios": {
    "Expansão": "00.",
    "Manutenção": "40.",
  },
  "Três Rios": {
    "Expansão": "00.",
    "Manutenção": "40.",
  },
};

const toMinutes = (time) => {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const initialSteps = [
  { number: 1, title: "Dados Gerais", description: "Informações da obra" },
  { number: 2, title: "Equipes", description: "Equipes envolvidas" },
  { number: 3, title: "Serviços", description: "Serviços executados" },
  { number: 4, title: "Equipamentos", description: "Instalados/retirados" },
  { number: 5, title: "Materiais", description: "Utilizados/sobras" },
  { number: 6, title: "Revisão", description: "Conferir e enviar" },
];

export default function NovaFolha() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    numero_fm: "FM - ",
    numero_fm_bloqueado: false,
    empreiteira: "CENEGED",
    tecnico_light: "",
    endereco: "",
    tipo_processo: "Expansão",
    caracteristica: "Programada",
    data_obra: "",
    hora_acionada: "",
    hora_inicio: "",
    hora_fim: "",
    municipio: "",
    base_operacional: "",
    circuito: "",
    projeto: "OII-",
    ordem_servico: "",
    ordem_manutencao: "",
    reserva: "",
    ntc: "",
    pi: "",
    ks: "",
    cf: "",
    zona: "",
    servicos: [],
    equipes: [],
    equipamentos_instalados: [],
    equipamentos_retirados: [],
    materiais_instalados: [],
    materiais_retirados: [],
    status: "rascunho",
    versao: 1,
    status_historico: [],
    data_envio: null,
    data_retorno_distribuidora: null,
    motivo_reprovacao: "",
    tipo_motivo_reprovacao: "",
    data_pagamento: null,
    numero_pagamento: "",
  });

  const steps = initialSteps;

  const resolveStep = useCallback(
    (value) => {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= steps.length) {
        return parsed;
      }
      return 1;
    },
    [steps.length]
  );

  const validateDadosGerais = useCallback((data) => {
    const messages = [];
    const requiredFields = [
      ["tecnico_light", "Técnico Light"],
      ["data_obra", "Data da Obra"],
      ["hora_acionada", "Hora Acionada"],
      ["hora_inicio", "Hora Início"],
      ["hora_fim", "Hora Fim"],
      ["endereco", "Endereço Completo"],
      ["municipio", "Município"],
    ];

    const missing = requiredFields
      .filter(([key]) => !data[key])
      .map(([, label]) => label);

    if (data.tipo_processo === "Expansão") {
      if (!data.projeto || data.projeto === "OII-") {
        missing.push("Projeto");
      }
    } else if (data.tipo_processo === "Manutenção") {
      const isProjetoValido = data.projeto && data.projeto !== "OMI-";
      const isOsValida = data.ordem_servico && data.ordem_servico.trim() !== "";
      if (!isProjetoValido && !isOsValida) {
        missing.push("Projeto ou Ordem de Serviço");
      }
    }

    if (missing.length) {
      messages.push(`Preencha os campos obrigatórios:\n- ${missing.join("\n- ")}`);
    }

    return { valid: messages.length === 0, messages };
  }, []);

  const equipesCount = formData.equipes?.length ?? 0;
  const servicosCount = formData.servicos?.length ?? 0;

  const isNextDisabled = useMemo(() => {
    if (currentStep === 1) return !validateDadosGerais(formData).valid;
    if (currentStep === 2) return equipesCount === 0;
    if (currentStep === 3) return servicosCount === 0;
    return false;
  }, [currentStep, formData, equipesCount, servicosCount, validateDadosGerais]);

  const loadFolha = useCallback(
    async (id, stepNumber) => {
      try {
        const folha = await FolhaMedicao.get(id);
        if (!folha) return;

        const normalizada = {
          ...folha,
          servicos: folha.servicos || [],
          equipes: folha.equipes || [],
          equipamentos_instalados: folha.equipamentos_instalados || [],
          equipamentos_retirados: folha.equipamentos_retirados || [],
          materiais_instalados: folha.materiais_instalados || [],
          materiais_retirados: folha.materiais_retirados || [],
          status_historico: folha.status_historico || [],
        };

        const numeroComVersao = normalizada.numero_fm || "";
        const isFolhaCorrecao =
          Boolean(normalizada.eh_correcao) ||
          (normalizada.versao || 1) > 1 ||
          /-v\d+$/i.test(numeroComVersao);

        setFormData((prev) => ({
          ...prev,
          ...normalizada,
          numero_fm: numeroComVersao || prev.numero_fm,
          numero_fm_bloqueado: isFolhaCorrecao,
        }));

        setCurrentStep(resolveStep(stepNumber));
      } catch (err) {
        console.error("Erro ao carregar folha:", err);
      }
    },
    [resolveStep]
  );

  const loadFolhaParaClonar = useCallback(async (id) => {
    try {
      const folhaOriginal = await FolhaMedicao.get(id);
      if (!folhaOriginal) return;
      const novaFolhaData = {
        ...folhaOriginal,
        servicos: folhaOriginal.servicos || [],
        equipes: folhaOriginal.equipes || [],
        equipamentos_instalados: folhaOriginal.equipamentos_instalados || [],
        equipamentos_retirados: folhaOriginal.equipamentos_retirados || [],
        materiais_instalados: folhaOriginal.materiais_instalados || [],
        materiais_retirados: folhaOriginal.materiais_retirados || [],
        status: "rascunho",
        versao: (folhaOriginal.versao || 1) + 1,
        numero_fm: "FM - ",
        folha_original_id: folhaOriginal.id,
        data_envio: null,
        data_retorno_distribuidora: null,
        motivo_reprovacao: "",
        tipo_motivo_reprovacao: "",
        data_pagamento: null,
        numero_pagamento: "",
        status_historico: [
          ...(folhaOriginal.status_historico || []),
          { status: "reprovado", data: new Date().toISOString() },
        ],
        numero_fm_bloqueado: false,
      };
      delete novaFolhaData.id;
      setFormData(novaFolhaData);
    } catch (error) {
      console.error("Erro ao carregar folha para clonar:", error);
    }
  }, []);

  useEffect(() => {
    const state = location.state || {};
    const params = new URLSearchParams(location.search || "");

    const editId = state.editId ?? params.get("editId");
    const cloneId = state.cloneFrom ?? params.get("cloneFrom");
    const stepParam = state.step ?? params.get("step");
    const targetStep = resolveStep(stepParam);

    if (editId) {
      loadFolha(editId, targetStep);
      return;
    }

    if (cloneId) {
      loadFolhaParaClonar(cloneId);
      setCurrentStep(targetStep);
      return;
    }

    setCurrentStep(targetStep);
    setFormData((prev) => ({
      ...prev,
      numero_fm: prev.numero_fm || "FM - ",
      numero_fm_bloqueado: false,
    }));
  }, [location.state, location.search, loadFolha, loadFolhaParaClonar, resolveStep]);

  const handleNext = () => {
    if (currentStep === 1) {
      const { valid, messages } = validateDadosGerais(formData);
      if (!valid) {
        alert(messages.join("\n\n"));
        return;
      }

      const minutosAcionada = toMinutes(formData.hora_acionada);
      const minutosInicio = toMinutes(formData.hora_inicio);
      const minutosFim = toMinutes(formData.hora_fim);

      if (minutosAcionada === null || minutosInicio === null || minutosFim === null) {
        alert("Informe horários válidos (HH:MM) para acionamento, início e fim.");
        return;
      }

      if (minutosAcionada >= minutosInicio || minutosAcionada >= minutosFim) {
        alert("A Hora Acionada deve ser anterior à Hora Início e à Hora Fim.");
        return;
      }

      if (minutosInicio <= minutosAcionada || minutosInicio >= minutosFim) {
        alert("A Hora Início deve ser posterior à Hora Acionada e anterior à Hora Fim.");
        return;
      }

      if (minutosFim <= minutosInicio || minutosFim <= minutosAcionada) {
        alert("A Hora Fim deve ser posterior à Hora Acionada e à Hora Início.");
        return;
      }

      const numeroFmRaw = (formData.numero_fm || "").toUpperCase().trim();
      if (!numeroFmRaw || /^FM\s*-\s*$/.test(numeroFmRaw)) {
        alert("Informe o número da Folha de Medição (exemplo: FM - 10.123).");
        return;
      }

      if (!numeroFmRaw.startsWith("FM -")) {
        alert("O número da Folha de Medição deve começar com 'FM -'.");
        return;
      }

      const numeroSemPrefixo = numeroFmRaw.replace(/^FM\s*-\s*/i, "");
      const numeroMatch = numeroSemPrefixo.match(/^(\d{2}\.\d{3})(-v\d+)?$/i);
      if (!numeroMatch) {
        alert("O número da Folha de Medição deve seguir o formato 'FM - XX.XXX' (versões usam sufixo -vN).");
        return;
      }
      const numeroBase = numeroMatch[1];

      const regionalKey = (formData.regional || formData.base_operacional || "").trim();
      const expectedPrefix = NUMERO_FM_PREFIX_MAP[regionalKey]?.[formData.tipo_processo];
      if (expectedPrefix && !numeroBase.startsWith(expectedPrefix)) {
        alert(
          `Para a base ${regionalKey} em ${formData.tipo_processo}, o número deve começar com '${expectedPrefix}' (exemplo: FM - ${expectedPrefix}123).`
        );
        return;
      }
    }

    if (currentStep === 2 && (formData.equipes?.length ?? 0) === 0) {
      alert("Adicione ao menos uma equipe para continuar.");
      return;
    }

    if (currentStep === 3 && (formData.servicos?.length ?? 0) === 0) {
      alert("Adicione ao menos um serviço para continuar.");
      return;
    }

    if (
      currentStep === 4 &&
      (formData.equipamentos_instalados?.length ?? 0) === 0 &&
      (formData.equipamentos_retirados?.length ?? 0) === 0
    ) {
      const confirmarEquipamentos = window.confirm(
        "Tem certeza que não existe nenhum equipamento instalado e/ou retirado?"
      );
      if (!confirmarEquipamentos) return;
    }

    if (
      currentStep === 5 &&
      (formData.materiais_instalados?.length ?? 0) === 0 &&
      (formData.materiais_retirados?.length ?? 0) === 0
    ) {
      const confirmarMateriais = window.confirm(
        "Tem certeza que não existe nenhum material instalado e/ou retirado?"
      );
      if (!confirmarMateriais) return;
    }

    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleSave = async (payload) => {
    setIsSaving(true);
    try {
      const cleanedPayload = { ...payload };
      cleanedPayload.numero_fm = cleanedPayload.numero_fm
        ? cleanedPayload.numero_fm.trim()
        : cleanedPayload.numero_fm;

      Object.keys(cleanedPayload).forEach((key) => {
        if (
          cleanedPayload[key] === null ||
          cleanedPayload[key] === undefined ||
          (typeof cleanedPayload[key] === "string" && cleanedPayload[key].trim() === "")
        ) {
          if (typeof cleanedPayload[key] !== "boolean") {
            delete cleanedPayload[key];
          }
        }
      });

      delete cleanedPayload.numero_fm_bloqueado;

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
          alert("Folha salva com sucesso!");
        } else {
          alert("Folha salva com sucesso no armazenamento local (Supabase desativado).");
        }
      } catch {
        alert("Folha salva com sucesso.");
      }
      navigate(createPageUrl("ListaFolhas"));
    } catch (error) {
      console.error("Erro ao salvar folha:", error);
      alert("Erro ao salvar a folha. Verifique os campos obrigatórios e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSave = () => {
    if (isSaving) return;
    handleSave({ ...formData, status: formData.status || "rascunho" });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <DadosGerais data={formData} updateData={updateFormData} />;
      case 2:
        return (
          <EquipeSection
            equipes={formData.equipes}
            onChange={(equipes) => updateFormData({ equipes })}
          />
        );
      case 3:
        return <ServicosStep data={formData} updateData={updateFormData} />;
      case 4:
        return (
          <EquipamentosSection
            equipamentosInstalados={formData.equipamentos_instalados}
            equipamentosRetirados={formData.equipamentos_retirados}
            onChangeInstalados={(equipamentos_instalados) =>
              updateFormData({ equipamentos_instalados })
            }
            onChangeRetirados={(equipamentos_retirados) =>
              updateFormData({ equipamentos_retirados })
            }
          />
        );
      case 5:
        return (
          <MateriaisSection
            materiaisInstalados={formData.materiais_instalados}
            materiaisRetirados={formData.materiais_retirados}
            onChangeInstalados={(materiais_instalados) =>
              updateFormData({ materiais_instalados })
            }
            onChangeRetirados={(materiais_retirados) =>
              updateFormData({ materiais_retirados })
            }
          />
        );
      case 6:
        return <Revisao data={formData} />;
      default:
        return null;
    }
  };

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-24">
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
          <CardHeader className="border-b border-slate-100" />
          <CardContent className="p-4 md:p-8">{renderCurrentStep()}</CardContent>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto sticky bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={isFirstStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          {isLastStep ? (
            <Button
              onClick={handleFinalSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Salvando..." : "Salvar e Concluir"}
              {!isSaving && <Save className="w-4 h-4 ml-2" />}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
