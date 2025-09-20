// ===================================
// Rules for Equipe section
// ===================================

// Rule: generates a unique identifier for a team
export function gerarIdUnico() {
  return Date.now();
}

// Rule: validates mandatory fields for a team
export function validarEquipe(equipe) {
  return Boolean(equipe?.codigo_equipe && equipe?.encarregado);
}

// Rule: verifies whether an electrician can be added to the list
export function validarEletricista(eletricista, eletricistasAtuais = []) {
  if (!eletricista) {
    alert("Selecione um eletricista antes de adicionar.");
    return false;
  }

  if (eletricistasAtuais.includes(eletricista)) {
    alert("Este eletricista ja foi adicionado a equipe.");
    return false;
  }

  return true;
}

// Rule: adds a team when required data is present
export function adicionarEquipe(novaEquipe, equipesAtuais = []) {
  if (
    !novaEquipe?.codigo_equipe ||
    !(novaEquipe?.eletricistas?.length > 0)
  ) {
    alert("Preencha os campos obrigatorios antes de adicionar a equipe.");
    return equipesAtuais;
  }

  return [
    ...equipesAtuais,
    { ...novaEquipe, id: gerarIdUnico() }
  ];
}

// Rule: removes a team by id
export function removerEquipe(id, equipesAtuais = []) {
  return equipesAtuais.filter((eq) => eq.id !== id);
}

// Rule: updates a field when editing a team
export function atualizarCampoEquipe(equipeAtual, campo, valor) {
  return { ...equipeAtual, [campo]: valor };
}

// Rule: returns helper text when there are no teams
export function obterMensagemEquipesVazia(equipes = []) {
  return equipes.length === 0 ? "Nenhuma equipe adicionada." : null;
}
