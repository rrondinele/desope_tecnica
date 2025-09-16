// 🚀 Regras para Equipamentos

// Estado inicial de um equipamento
export const initialState = {
  serial: "",
  numero_lp: "",
  fabricante: "",
  capacidade: "",
  mes_fabricacao: "",
  ano_fabricacao: ""
};

// 📌 Adiciona equipamento na lista
export const adicionarEquipamento = (equipamento, lista) => {
  if (equipamento.serial && equipamento.fabricante) {
    return [
      ...lista,
      {
        ...equipamento,
        id: Date.now()
      }
    ];
  } else {
    alert("Os campos 'Serial do Equipamento' e 'Fabricante' são obrigatórios.");
    return lista;
  }
};

// 📌 Remove equipamento da lista pelo ID
export const removerEquipamento = (id, lista) => {
  return lista.filter((equip) => equip.id !== id);
};

// 📌 Mensagem padrão caso lista esteja vazia
export const obterMensagemListaVazia = (lista, tipo) => {
  if (!lista || lista.length === 0) {
    return `Nenhum equipamento ${tipo} cadastrado.`;
  }
  return null;
};
