import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Determina o diretório onde salvar os dados
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const FOLHAS_FILE = path.join(DATA_DIR, 'folhas.json');

// Garante que o diretório de dados existe
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Função interna para salvar o array completo de folhas
async function _saveAllFolhas(folhas) {
  await ensureDataDir();
  await fs.writeFile(FOLHAS_FILE, JSON.stringify(folhas, null, 2), 'utf8');
}

/**
 * Busca todas as folhas de medição salvas.
 * @returns {Promise<Array>} Um array com as folhas.
 */
export async function getFolhas() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(FOLHAS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Arquivo não existe, retorna array vazio
      return [];
    }
    throw error;
  }
}

/**
 * Cria uma nova folha de medição na lista.
 * @param {Object} novaFolha - O objeto da nova folha.
 * @returns {Promise<void>}
 */
export async function createFolha(novaFolha) {
  const folhasAtuais = await getFolhas();
  const folhaComData = {
    ...novaFolha,
    id: novaFolha.id || Date.now().toString(), // Gera ID se não tiver
    created_date: new Date().toISOString()
  };
  const novaLista = [...folhasAtuais, folhaComData];
  await _saveAllFolhas(novaLista);
}

/**
 * Atualiza uma folha de medição existente pelo seu ID.
 * @param {string | number} folhaId - O ID da folha a ser atualizada.
 * @param {Object} updates - Um objeto com os campos a serem atualizados.
 * @returns {Promise<boolean>} True se encontrou e atualizou, false caso contrário.
 */
export async function updateFolha(folhaId, updates) {
  const folhasAtuais = await getFolhas();
  let encontrou = false;
  
  const novaLista = folhasAtuais.map(folha => {
    if (folha.id === folhaId) {
      encontrou = true;
      return { 
        ...folha, 
        ...updates, 
        updated_date: new Date().toISOString() 
      };
    }
    return folha;
  });
  
  if (encontrou) {
    await _saveAllFolhas(novaLista);
  }
  
  return encontrou;
}

/**
 * Remove uma folha pelo ID.
 * @param {string | number} folhaId - O ID da folha a ser removida.
 * @returns {Promise<boolean>} True se encontrou e removeu, false caso contrário.
 */
export async function deleteFolha(folhaId) {
  const folhasAtuais = await getFolhas();
  const novaLista = folhasAtuais.filter(folha => folha.id !== folhaId);
  
  if (novaLista.length !== folhasAtuais.length) {
    await _saveAllFolhas(novaLista);
    return true;
  }
  
  return false;
}

/**
 * Limpa todos os dados (útil para testes).
 * @returns {Promise<void>}
 */
export async function clearAllFolhas() {
  try {
    await fs.unlink(FOLHAS_FILE);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Arquivo não existe, não há problema
  }
}

/**
 * Faz backup dos dados em um arquivo específico.
 * @param {string} backupPath - Caminho onde salvar o backup.
 * @returns {Promise<void>}
 */
export async function backupFolhas(backupPath) {
  const folhas = await getFolhas();
  await fs.writeFile(backupPath, JSON.stringify(folhas, null, 2), 'utf8');
}

/**
 * Restaura dados de um arquivo de backup.
 * @param {string} backupPath - Caminho do arquivo de backup.
 * @returns {Promise<void>}
 */
export async function restoreFolhas(backupPath) {
  const data = await fs.readFile(backupPath, 'utf8');
  const folhas = JSON.parse(data);
  await _saveAllFolhas(folhas);
}