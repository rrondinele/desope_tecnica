import React, { useState } from "react";
import { createServico } from "@/components/api";
import { formatCurrency, formatDate } from "@/components/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function FormularioCadastro({ onSuccess }) {
  const [formData, setFormData] = useState({
    data_programacao: "",
    projeto: "",
    ordem_servico: "",
    tipo_processo: "",
    caracteristica_processo: "",
    municipio: "",
    base_operacional: "",
    codigo_equipe: "",
    tipo_turma: "",
    tecnico_responsavel_cliente: "",
    lda_lsa: "",
    descricao_servicos: "",
    quantidade: "",
    valor_servicos: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
  };

  const resetForm = () => {
    setFormData({
      data_programacao: "",
      projeto: "",
      ordem_servico: "",
      tipo_processo: "",
      caracteristica_processo: "",
      municipio: "",
      base_operacional: "",
      codigo_equipe: "",
      tipo_turma: "",
      tecnico_responsavel_cliente: "",
      lda_lsa: "",
      descricao_servicos: "",
      quantidade: "",
      valor_servicos: ""
    });
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        quantidade: parseFloat(formData.quantidade) || 0,
        valor_servicos: parseFloat(formData.valor_servicos) || 0
      };

      await createServico(dataToSave);
      setSuccess(true);
      if (onSuccess) onSuccess();
      
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (err) {
      setError("Erro ao salvar os dados. Verifique os campos obrigatórios.");
    }
    
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >    
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="bg-blue-700 text-white py-6 px-6 rounded-t-lg shadow-sm">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold">Cadastro de Programação de Serviços</h2>
          </div>
          <p className="text-sm text-white mt-1">Preencha todos os campos para registrar uma nova programação</p>
        </CardHeader>
        
        <CardContent className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                Serviço cadastrado com sucesso! Redirecionando...
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Gerais */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
                Informações Gerais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="data_programacao" className="text-sm font-semibold text-gray-700">
                    Data da Programação *
                  </Label>
                  <Input
                    id="data_programacao"
                    type="date"
                    value={formData.data_programacao}
                    onChange={(e) => handleInputChange('data_programacao', e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projeto" className="text-sm font-semibold text-gray-700">
                    Projeto *
                  </Label>
                  <Input
                    id="projeto"
                    value={formData.projeto}
                    onChange={(e) => handleInputChange('projeto', e.target.value)}
                    placeholder="Nome ou código do projeto"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordem_servico" className="text-sm font-semibold text-gray-700">
                    Ordem de Serviço *
                  </Label>
                  <Input
                    id="ordem_servico"
                    value={formData.ordem_servico}
                    onChange={(e) => handleInputChange('ordem_servico', e.target.value)}
                    placeholder="Número da OS"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Processo e Características */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
                Processo e Características
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tipo_processo" className="text-sm font-semibold text-gray-700">
                    Tipo de Processo *
                  </Label>
                  <Select
                    value={formData.tipo_processo}
                    onValueChange={(value) => handleInputChange('tipo_processo', value)}
                  >
                    {/*<SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">*/}
                    <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"> 
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      className="mt-1 w-full min-w-[var(--radix-select-trigger-width)]"
                      align="start"
                    >
                      <SelectItem value="Expansão">Expansão</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caracteristica_processo" className="text-sm font-semibold text-gray-700">
                    Característica do Processo
                  </Label>
                  <Input
                    id="caracteristica_processo"
                    value={formData.caracteristica_processo}
                    onChange={(e) => handleInputChange('caracteristica_processo', e.target.value)}
                    placeholder="Descreva as características"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Localização e Equipe */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
                Localização e Equipe
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="municipio" className="text-sm font-semibold text-gray-700">
                    Município *
                  </Label>
                  <Input
                    id="municipio"
                    value={formData.municipio}
                    onChange={(e) => handleInputChange('municipio', e.target.value)}
                    placeholder="Nome do município"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_operacional" className="text-sm font-semibold text-gray-700">
                    Base Operacional
                  </Label>
                  <Input
                    id="base_operacional"
                    value={formData.base_operacional}
                    onChange={(e) => handleInputChange('base_operacional', e.target.value)}
                    placeholder="Base responsável"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo_equipe" className="text-sm font-semibold text-gray-700">
                    Código da Equipe
                  </Label>
                  <Input
                    id="codigo_equipe"
                    value={formData.codigo_equipe}
                    onChange={(e) => handleInputChange('codigo_equipe', e.target.value)}
                    placeholder="Código da equipe"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_turma" className="text-sm font-semibold text-gray-700">
                    Tipo de Turma
                  </Label>
                  <Select
                    value={formData.tipo_turma}
                    onValueChange={(value) => handleInputChange('tipo_turma', value)}
                  >
                    {/*<SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">*/}
                    <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"> 
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      className="mt-1 w-full min-w-[var(--radix-select-trigger-width)]"
                      align="start"
                    >
                      <SelectItem value="Diurna">Linha Morta</SelectItem>
                      <SelectItem value="Noturna">Linha Viva</SelectItem>
                      <SelectItem value="Emergência">Poda</SelectItem>
                      <SelectItem value="Fins de Semana">Fins de Semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Responsável e Códigos */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
                Responsabilidade e Códigos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tecnico_responsavel_cliente" className="text-sm font-semibold text-gray-700">
                    Técnico Responsável (Cliente)
                  </Label>
                  <Input
                    id="tecnico_responsavel_cliente"
                    value={formData.tecnico_responsavel_cliente}
                    onChange={(e) => handleInputChange('tecnico_responsavel_cliente', e.target.value)}
                    placeholder="Nome do técnico"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lda_lsa" className="text-sm font-semibold text-gray-700">
                    LDA/LSA
                  </Label>
                  <Input
                    id="lda_lsa"
                    value={formData.lda_lsa}
                    onChange={(e) => handleInputChange('lda_lsa', e.target.value)}
                    placeholder="Código LDA/LSA"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Serviços e Valores */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
                Serviços e Valores
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="descricao_servicos" className="text-sm font-semibold text-gray-700">
                    Descrição dos Serviços
                  </Label>
                  <Textarea
                    id="descricao_servicos"
                    value={formData.descricao_servicos}
                    onChange={(e) => handleInputChange('descricao_servicos', e.target.value)}
                    placeholder="Descreva detalhadamente os serviços a serem executados"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-24"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="quantidade" className="text-sm font-semibold text-gray-700">
                      Quantidade *
                    </Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantidade}
                      onChange={(e) => handleInputChange('quantidade', e.target.value)}
                      placeholder="0"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor_servicos" className="text-sm font-semibold text-gray-700">
                      Valor dos Serviços (R$) *
                    </Label>
                    <Input
                      id="valor_servicos"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.valor_servicos}
                      onChange={(e) => handleInputChange('valor_servicos', e.target.value)}
                      placeholder="0,00"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Limpar Formulário
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-2 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? 'Salvando...' : 'Salvar Programação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}