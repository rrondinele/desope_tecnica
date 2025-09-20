// ===================================
// Rules for Servicos step
// ===================================

// Catalog of available services displayed in the selector
export const servicosDisponiveis = [
  { codigo: "001", descricao: "Instalação de Poste de Concreto 9m", unidade: "UN", valor_unitario: 450.0 },
  { codigo: "002", descricao: "Instalação de Transformador 15kVA", unidade: "UN", valor_unitario: 1250.0 },
  { codigo: "003", descricao: "Ligação Nova BT Monofásica", unidade: "UN", valor_unitario: 85.5 },
  { codigo: "004", descricao: "Manutenção Preventiva Rede BT", unidade: "M", valor_unitario: 25.0 },
  { codigo: "005", descricao: "Substituição de Cabo Multiplexado", unidade: "M", valor_unitario: 35.75 }
];

// Rule: finds a service by description
export function selecionarServico(descricao) {
  return servicosDisponiveis.find((servico) => servico.descricao === descricao);
}

// Rule: sums the total value of all services in a collection
export function calcularValorTotal(servicos = []) {
  return servicos.reduce((sum, item) => sum + (item.valor_total || 0), 0);
}

// Rule: calculates the total value of a single service
export function calcularValorServico(servico) {
  return (servico.valor_unitario || 0) * (servico.quantidade || 0);
}

// Rule: creates a new service entry with id and total value
export function criarServico(novoServico) {
  return {
    ...novoServico,
    id: Date.now(),
    valor_total: calcularValorServico(novoServico)
  };
}

// Rule: removes a service by id
export function removerServico(id, servicos = []) {
  return servicos.filter((servico) => servico.id !== id);
}

// Rule: resets service form values
export function resetarServico(quantidade = 1) {
  return {
    codigo: "",
    descricao: "",
    unidade: "",
    valor_unitario: 0,
    quantidade
  };
}

// Rule: validates service payload before inserting
export function validarServico(novoServico, servicos = []) {
  if (novoServico.quantidade <= 0) {
    throw new Error("A quantidade deve ser maior que zero.");
  }

  if (servicos.some((servico) => servico.descricao === novoServico.descricao)) {
    throw new Error("Este serviço já foi adicionado.");
  }

  return true;
}
