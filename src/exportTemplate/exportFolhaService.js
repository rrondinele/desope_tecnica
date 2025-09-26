// Fallback simples para exportação enquanto o template definitivo não existe.
// Implementa exportFolhaById(id, opts) e salva um JSON com os dados recebidos.

import { FolhaMedicao } from '@/entities/FolhaMedicao'

function downloadBlob(filename, data, type = 'application/json') {
  try {
    const blob = new Blob([data], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('[export] erro ao baixar blob', e)
  }
}

export async function exportFolhaById(id, opts = {}) {
  try {
    const { fallbackData } = opts
    let folha = fallbackData
    if (!folha) {
      try {
        folha = await FolhaMedicao.get(id)
      } catch {}
    }
    if (!folha) throw new Error('Folha não encontrada para exportação')

    const filename = `folha-${folha.numero_fm || id}.json`
    const pretty = JSON.stringify(folha, null, 2)
    downloadBlob(filename, pretty)
    return { ok: true }
  } catch (error) {
    console.error('[exportFolhaById] erro', error)
    throw error
  }
}

export default { exportFolhaById }

