// src/rules/servicosStepRules.js

export const servicosDisponiveis = [
  { codigo: "001", descricao: "Instalação de Poste de Concreto 9m", unidade: "UN", valor_unitario: 450.00 },
  { codigo: "002", descricao: "Instalação de Transformador 15kVA", unidade: "UN", valor_unitario: 1250.00 },
  { codigo: "003", descricao: "Ligação Nova BT Monofásica", unidade: "UN", valor_unitario: 85.50 },
  { codigo: "004", descricao: "Manutenção Preventiva Rede BT", unidade: "M", valor_unitario: 25.00 },
  { codigo: "005", descricao: "Substituição de Cabo Multiplexado", unidade: "M", valor_unitario: 35.75 }
];

export function selecionarServico(descricao) {
  return servicosDisponiveis.find(s => s.descricao === descricao);
}

export function calcularValorTotal(servicos) {
  return servicos?.reduce((sum, s) => sum + (s.valor_total || 0), 0) || 0;
}

export function calcularValorServico(servico) {
  return servico.valor_unitario * servico.quantidade;
}

export function criarServico(novoServico) {
  return {
    ...novoServico,
    id: Date.now(),
    valor_total: calcularValorServico(novoServico)
  };
}

export function removerServico(id, servicos) {
  return servicos.filter((s) => s.id !== id);
}

export function resetarServico(quantidade = 1) {
  return {
    codigo: '',
    descricao: '',
    unidade: '',
    valor_unitario: 0,
    quantidade
  };
}

export function validarServico(novoServico, servicos) {

if (novoServico.quantidade <= 0) {
throw new Error("A quantidade deve ser maior que zero.");
}


if (servicos?.some(s => s.descricao === novoServico.descricao)) {
throw new Error("Este serviço já foi adicionado.");
}
}