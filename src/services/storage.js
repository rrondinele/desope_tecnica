const FOLHAS_STORAGE_KEY = 'folhasDeMedicaoApp:folhas';

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function createSafeStorage() {
  if (typeof window === 'undefined') {
    return createMemoryStorage();
  }

  const tryStorage = (candidate, label) => {
    if (!candidate) {
      return null;
    }

    try {
      const testKey = `${FOLHAS_STORAGE_KEY}__test__`;
      candidate.setItem(testKey, 'ok');
      candidate.removeItem(testKey);
      return candidate;
    } catch (error) {
      console.warn(`[storage] ${label} indisponivel.`, error);
      return null;
    }
  };

  const local = tryStorage(window.localStorage, 'localStorage');
  if (local) {
    return local;
  }

  const session = tryStorage(window.sessionStorage, 'sessionStorage');
  if (session) {
    return session;
  }

  console.warn('[storage] Usando armazenamento em memoria como fallback.');
  return createMemoryStorage();
}

const storage = createSafeStorage();

function readAllFolhas() {
  const raw = storage.getItem(FOLHAS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[storage] Dados corrompidos, limpando armazenamento.', error);
    storage.removeItem(FOLHAS_STORAGE_KEY);
    return [];
  }
}

function saveAllFolhas(folhas) {
  storage.setItem(FOLHAS_STORAGE_KEY, JSON.stringify(folhas));
}

/**
 * Busca todas as folhas de medicao salvas.
 * @returns {Array} Um array com as folhas.
 */
export function getFolhas() {
  return readAllFolhas();
}

/**
 * Cria uma nova folha de medicao na lista.
 * @param {Object} novaFolha - O objeto da nova folha.
 */
export function createFolha(novaFolha) {
  const folhasAtuais = getFolhas();
  const novaLista = [...folhasAtuais, novaFolha];
  saveAllFolhas(novaLista);
}

/**
 * Atualiza uma folha de medicao existente pelo seu ID.
 * @param {string | number} folhaId - O ID da folha a ser atualizada.
 * @param {Object} updates - Um objeto com os campos a serem atualizados.
 */
export function updateFolha(folhaId, updates) {
  const folhasAtuais = getFolhas();
  const novaLista = folhasAtuais.map((folha) => {
    if (folha.id === folhaId) {
      return { ...folha, ...updates, updated_date: new Date().toISOString() };
    }
    return folha;
  });
  saveAllFolhas(novaLista);
}

/**
 * Limpa todos os dados (util para testes).
 */
export function clearAllFolhas() {
  storage.removeItem(FOLHAS_STORAGE_KEY);
}
