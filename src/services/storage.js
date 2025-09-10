// A "chave" da nossa "tabela" de folhas no localStorage
const FOLHAS_STORAGE_KEY = 'folhasDeMedicaoApp:folhas';

// Função interna para salvar o array completo de folhas.
function _saveAllFolhas(folhas) {
  localStorage.setItem(FOLHAS_STORAGE_KEY, JSON.stringify(folhas));
}

/**
 * Busca todas as folhas de medição salvas.
 * @returns {Array} Um array com as folhas.
 */
export function getFolhas() {
  const data = localStorage.getItem(FOLHAS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Cria uma nova folha de medição na lista.
 * @param {Object} novaFolha - O objeto da nova folha.
 */
export function createFolha(novaFolha) {
  const folhasAtuais = getFolhas();
  const novaLista = [...folhasAtuais, novaFolha];
  _saveAllFolhas(novaLista);
}

/**
 * Atualiza uma folha de medição existente pelo seu ID.
 * @param {string | number} folhaId - O ID da folha a ser atualizada.
 * @param {Object} updates - Um objeto com os campos a serem atualizados.
 */
export function updateFolha(folhaId, updates) {
  const folhasAtuais = getFolhas();
  const novaLista = folhasAtuais.map(folha => {
    if (folha.id === folhaId) {
      // Se encontrar a folha, mescla as atualizações com os dados existentes
      return { ...folha, ...updates, updated_date: new Date().toISOString() };
    }
    return folha;
  });
  _saveAllFolhas(novaLista);
}

/**
 * Limpa todos os dados (útil para testes).
 */
export function clearAllFolhas() {
  localStorage.removeItem(FOLHAS_STORAGE_KEY);
}