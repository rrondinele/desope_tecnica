// ==============================
// 📌 Regras para EquipeSection
// ==============================

// ✅ Gera um ID único para a equipe
export function gerarIdUnico() {
  return Date.now();
}

// ✅ Valida se a equipe tem os campos obrigatórios
export function validarEquipe(equipe) {
  return Boolean(equipe.codigo_equipe && equipe.encarregado);
}

// ✅ Valida se o eletricista pode ser adicionado
export function validarEletricista(eletricista, eletricistasAtuais) {
  if (!eletricista) {
    alert("Selecione um eletricista antes de adicionar.");
    return false;
  }

  if (eletricistasAtuais.includes(eletricista)) {
    alert("Este eletricista já foi adicionado à equipe.");
    return false;
  }

  return true;
}

// ✅ Adiciona uma equipe nova à lista existente
export function adicionarEquipe(novaEquipe, equipesAtuais) {
  // Validação: Verifica se os campos obrigatórios de novaEquipe estão preenchidos
  if (
    !novaEquipe.codigo_equipe ||
    novaEquipe.eletricistas.length === 0 // Verifica se o array eletricistas está vazio
  ) {
    alert("Preencha todos os campos obrigatórios antes de adicionar a equipe.");
    return equipesAtuais;
  }

  // Adiciona a equipe
  return [
    ...(equipesAtuais || []),
    { ...novaEquipe, id: gerarIdUnico() }
  ];
}

// ✅ Remove uma equipe pelo ID
export function removerEquipe(id, equipesAtuais) {
  return equipesAtuais.filter((eq) => eq.id !== id);
}

// ✅ Atualiza um campo da equipe em edição
export function atualizarCampoEquipe(novaEquipe, campo, valor) {
  return { ...novaEquipe, [campo]: valor };
}

// ✅ Regras de exibição: retorna mensagem se a lista estiver vazia
export function obterMensagemEquipesVazia(equipes) {
  return (equipes?.length || 0) === 0
    ? "Nenhuma equipe adicionada."
    : null;
}
