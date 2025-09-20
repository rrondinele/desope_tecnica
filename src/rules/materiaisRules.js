// ===================================
// Rules for Materiais section
// ===================================

// State: default values for a new material entry
export const initialState = {
  descricao: "",
  lote: "",
  quantidade: 0,
  origem: ""
};

// Rule: generate a unique identifier
export function gerarIdUnico() {
  return Date.now();
}

// Rule: validates mandatory material fields
export function validarMaterial(material) {
  return Boolean(material?.descricao && parseFloat(material?.quantidade) > 0);
}

// Rule: add material to the list when valid
export function adicionarMaterial(material, listaAtual = []) {
  if (!validarMaterial(material)) {
    alert("Os campos 'Descricao do Material' e 'Quantidade' sao obrigatorios.");
    return listaAtual;
  }

  return [
    ...listaAtual,
    {
      ...material,
      id: gerarIdUnico(),
      quantidade: parseFloat(material.quantidade)
    }
  ];
}

// Rule: remove material by id
export function removerMaterial(id, listaAtual = []) {
  return listaAtual.filter((item) => item.id !== id);
}

// Rule: helper message when the list is empty
export function obterMensagemListaVazia(lista = []) {
  return lista.length === 0 ? "Nenhum material cadastrado." : null;
}
