import { Edit, Clock, Send, CheckCircle, AlertTriangle, DollarSign, XCircle } from "lucide-react";

export const STATUS_CONFIG = {
  rascunho: { 
    label: "Rascunho", 
    color: "bg-gray-100 text-gray-800 border-gray-200", 
    icon: Edit,
  },
  pendente: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  aguardando_correcao: {
    label: "Aguardando Correção",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Edit,
  },
  aguardando_aprovacao: {
    label: "Aguardando Aprovação",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Send,
  },
  aguardando_cancelamento: {
    label: "Aguardando Cancelamento",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
  },
  aprovado: {
    label: "Aprovado",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  reprovado: {
    label: "Reprovado",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
  },
  pago: {
    label: "Pago",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: DollarSign,
  },
  cancelado_distribuidora: {
    label: "Cancelado pela Distribuidora",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  cancelado_empreitera: {
    label: "Cancelado pela Empreitera",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

export const ITEMS_PER_PAGE = 15;

export const CSV_HEADERS = [
  "Numero FM",
  "Versao",
  "Projeto",
  "Municipio",
  "Data Obra",
  "Status",
  "Data Envio",
  "Metodo Envio",
  "Data Retorno",
  "Tipo Motivo Reprovacao",
  "Motivo Reprovacao",
  "Valor Total",
  "Data Pagamento",
  "Numero Pagamento",
  "Motivo Cancelamento",
];

export const METODO_ENVIO_OPTIONS = [
  { value: "E-mail", label: "E-mail" },
  { value: "Sharepoint", label: "Sharepoint" },
];

export const RETORNO_PARECER_OPTIONS = [
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
];

export const MOTIVO_REPROVACAO_TIPOS = [
  "Erro Lançamentos de Serviços",
  "Erro Dados Cadastrais",
];

export const EXPORT_FILE_NAME = "folhas_de_medicao.csv";
