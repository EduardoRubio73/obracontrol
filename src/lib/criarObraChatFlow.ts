export type Complexidade = "simples" | "media" | "complexa";

export interface EscopoIA {
  descricao_estruturada: string;
  necessidades: string[];
  profissional_recomendado: string;
  alertas_seguranca: string[];
}

export interface FornecedorSelecionado {
  id: string;
  nome: string;
  categoria: string | null;
  tipo?: string | null;
  score?: number | null;
  telefone?: string | null;
}

export interface ObraSimilar {
  id: string;
  nome: string;
}

export const classificacoes: { value: Complexidade; label: string; desc: string; color: string }[] = [
  { value: "simples", label: "Simples", desc: "Pedreiro / Empreiteiro", color: "from-emerald-400 to-emerald-500" },
  { value: "media", label: "Média", desc: "Empreiteiro + Técnico", color: "from-amber-400 to-orange-500" },
  { value: "complexa", label: "Complexa", desc: "Engenheiro / Arquiteto", color: "from-red-400 to-rose-500" },
];

export type CriacaoObraStep =
  | "nome"
  | "duplicata"
  | "tipo"
  | "complexidade"
  | "descricao"
  | "escopo"
  | "template"
  | "fornecedores"
  | "criando"
  | "sucesso";

export interface CriacaoObraState {
  ativo: boolean;
  step: CriacaoObraStep;
  nome: string;
  duplicata: ObraSimilar | null;
  tipoObra: string;
  classificacao: Complexidade;
  descricao: string;
  escopo: EscopoIA | null;
  templateSelecionado: string | null;
  fornecedoresSelecionados: FornecedorSelecionado[];
  erro: string | null;
  carregando: boolean;
  novaObraId: string | null;
}

export const ESTADO_INICIAL: CriacaoObraState = {
  ativo: false,
  step: "nome",
  nome: "",
  duplicata: null,
  tipoObra: "",
  classificacao: "simples",
  descricao: "",
  escopo: null,
  templateSelecionado: null,
  fornecedoresSelecionados: [],
  erro: null,
  carregando: false,
  novaObraId: null,
};

export type CriacaoObraAction =
  | { type: "iniciar" }
  | { type: "cancelar" }
  | { type: "informar_nome"; nome: string; duplicata: ObraSimilar | null }
  | { type: "ignorar_duplicata" }
  | { type: "informar_tipo"; tipoObra: string }
  | { type: "informar_classificacao"; classificacao: Complexidade }
  | { type: "informar_descricao"; descricao: string }
  | { type: "voltar_para_descricao" }
  | { type: "gerando_escopo" }
  | { type: "escopo_gerado"; escopo: EscopoIA }
  | { type: "escopo_falhou"; erro: string }
  | { type: "confirmar_escopo" }
  | { type: "selecionar_template"; templateId: string | null }
  | { type: "confirmar_template" }
  | { type: "definir_fornecedores_sugeridos"; fornecedores: FornecedorSelecionado[] }
  | { type: "alternar_fornecedor"; fornecedor: FornecedorSelecionado }
  | { type: "criando_obra" }
  | { type: "obra_criada"; obraId: string }
  | { type: "criacao_falhou"; erro: string };

export function criacaoObraReducer(state: CriacaoObraState, action: CriacaoObraAction): CriacaoObraState {
  switch (action.type) {
    case "iniciar":
      return { ...ESTADO_INICIAL, ativo: true };
    case "cancelar":
      return { ...ESTADO_INICIAL, ativo: false };
    case "informar_nome":
      return {
        ...state,
        nome: action.nome,
        duplicata: action.duplicata,
        step: action.duplicata ? "duplicata" : "tipo",
        erro: null,
      };
    case "ignorar_duplicata":
      return { ...state, step: "tipo", duplicata: null };
    case "informar_tipo":
      return { ...state, tipoObra: action.tipoObra, step: "complexidade" };
    case "informar_classificacao":
      return { ...state, classificacao: action.classificacao, step: "descricao" };
    case "informar_descricao":
      return { ...state, descricao: action.descricao };
    case "voltar_para_descricao":
      return { ...state, step: "descricao", escopo: null, erro: null };
    case "gerando_escopo":
      return { ...state, carregando: true, erro: null };
    case "escopo_gerado":
      return { ...state, escopo: action.escopo, step: "escopo", carregando: false };
    case "escopo_falhou":
      return { ...state, erro: action.erro, carregando: false };
    case "confirmar_escopo":
      return { ...state, step: "template" };
    case "selecionar_template":
      return { ...state, templateSelecionado: action.templateId };
    case "confirmar_template":
      return { ...state, step: "fornecedores" };
    case "definir_fornecedores_sugeridos":
      return { ...state, fornecedoresSelecionados: action.fornecedores };
    case "alternar_fornecedor": {
      const existe = state.fornecedoresSelecionados.some((f) => f.id === action.fornecedor.id);
      if (existe) {
        return {
          ...state,
          fornecedoresSelecionados: state.fornecedoresSelecionados.filter((f) => f.id !== action.fornecedor.id),
        };
      }
      if (state.fornecedoresSelecionados.length >= 3) return state;
      return { ...state, fornecedoresSelecionados: [...state.fornecedoresSelecionados, action.fornecedor] };
    }
    case "criando_obra":
      return { ...state, step: "criando", carregando: true, erro: null };
    case "obra_criada":
      return { ...state, step: "sucesso", carregando: false, novaObraId: action.obraId };
    case "criacao_falhou":
      return { ...state, erro: action.erro, carregando: false, step: "fornecedores" };
    default:
      return state;
  }
}

export type CriacaoObraCardData =
  | { kind: "duplicata"; obra: ObraSimilar }
  | { kind: "tipo" }
  | { kind: "complexidade" }
  | { kind: "escopo"; escopo: EscopoIA }
  | { kind: "escopo_erro"; mensagem: string }
  | { kind: "template" }
  | { kind: "fornecedores" }
  | { kind: "criacao_erro"; mensagem: string };
