// ==============================
// 📌 Regras para MateriaisSection
// ==============================

// Estado inicial do formulário
export const initialState = {
  descricao: '',
  lote: '',
  quantidade: 0,
  origem: ''
};

// ✅ Gera ID único
export function gerarIdUnico() {
  return Date.now();
}

// ✅ Valida material (descrição + quantidade obrigatórios)
export function validarMaterial(material) {
  return Boolean(material.descricao && parseFloat(material.quantidade) > 0);
}

// ✅ Adiciona material à lista
export function adicionarMaterial(material, listaAtual) {
  if (!validarMaterial(material)) {
    alert("Os campos 'Descrição do Material' e 'Quantidade' são obrigatórios.");
    return listaAtual;
  }

  return [
    ...(listaAtual || []),
    { ...material, id: gerarIdUnico(), quantidade: parseFloat(material.quantidade) }
  ];
}

// ✅ Remove material pelo ID
export function removerMaterial(id, listaAtual) {
  return listaAtual.filter((m) => m.id !== id);
}

// ✅ Mensagem condicional se lista vazia
export function obterMensagemListaVazia(lista) {
  return (!lista || lista.length === 0) ? "Nenhum material cadastrado." : null;
}
