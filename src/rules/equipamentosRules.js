// ===================================
// Rules for Equipamentos section
// ===================================

// State: default values for a new equipment entry
export const initialState = {
  serial: "",
  numero_lp: "",
  fabricante: "",
  capacidade: "",
  mes_fabricacao: "",
  ano_fabricacao: ""
};

// Rule: generate an identifier for list items
export function gerarIdUnico() {
  return Date.now();
}

// Rule: append a new equipment when required fields are present
export function adicionarEquipamento(equipamento, lista = []) {
  if (equipamento.serial && equipamento.fabricante) {
    return [
      ...lista,
      {
        ...equipamento,
        id: gerarIdUnico()
      }
    ];
  }

  alert("Os campos 'Serial do Equipamento' e 'Fabricante' sao obrigatorios.");
  return lista;
}

// Rule: remove equipment by id
export function removerEquipamento(id, lista = []) {
  return lista.filter((equip) => equip.id !== id);
}

// Rule: message to display when the list has no items
export function obterMensagemListaVazia(lista, tipo) {
  if (!lista || lista.length === 0) {
    return `Nenhum equipamento ${tipo} cadastrado.`;
  }
  return null;
}
