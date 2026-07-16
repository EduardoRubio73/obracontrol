/* ── Regras de decisão: complexidade → profissional ── */

const CATEGORIAS_PROFISSIONAL = [
  { value: "pedreiro", label: "Pedreiro" },
  { value: "eletricista", label: "Eletricista" },
  { value: "encanador", label: "Encanador" },
  { value: "engenheiro", label: "Engenheiro" },
  { value: "arquiteto", label: "Arquiteto" },
  { value: "empreiteiro", label: "Empreiteiro" },
  { value: "pintor", label: "Pintor" },
  { value: "serralheiro", label: "Serralheiro" },
  { value: "gesseiro", label: "Gesseiro" },
  { value: "marceneiro", label: "Marceneiro" },
  { value: "tecnico", label: "Técnico" },
] as const;

const CATEGORIAS_LOJA = [
  { value: "material_construcao", label: "Material de Construção" },
  { value: "hidraulica", label: "Hidráulica" },
  { value: "eletrica", label: "Elétrica" },
  { value: "acabamento", label: "Acabamento" },
  { value: "ferragens", label: "Ferragens" },
  { value: "tintas", label: "Tintas" },
] as const;

export const TIPOS_FORNECEDOR = [
  { value: "profissional", label: "Profissional" },
  { value: "loja", label: "Loja / Fornecedor" },
] as const;

export const ALL_CATEGORIAS = [
  ...CATEGORIAS_PROFISSIONAL.map((c) => ({ ...c, tipo: "profissional" as const })),
  ...CATEGORIAS_LOJA.map((c) => ({ ...c, tipo: "loja" as const })),
];

/**
 * Given obra complexity, returns recommended professional categories
 * ordered by priority.
 */
export function profissionaisRecomendados(classificacao: string): string[] {
  switch (classificacao) {
    case "simples":
      return ["pedreiro", "empreiteiro"];
    case "media":
      return ["empreiteiro", "tecnico", "pedreiro"];
    case "complexa":
      return ["engenheiro", "arquiteto", "empreiteiro"];
    default:
      return ["empreiteiro", "pedreiro"];
  }
}

/**
 * Returns the label for the recommended professional type
 */
export function profissionalLabel(classificacao: string): string {
  switch (classificacao) {
    case "simples":
      return "Pedreiro / Empreiteiro";
    case "media":
      return "Empreiteiro + Técnico";
    case "complexa":
      return "Engenheiro / Arquiteto";
    default:
      return "Empreiteiro";
  }
}

/**
 * Checks if a fornecedor's categoria matches the recommended types
 */
export function isRecomendado(
  fornecedorCategoria: string | null,
  classificacao: string
): boolean {
  if (!fornecedorCategoria) return false;
  return profissionaisRecomendados(classificacao).includes(fornecedorCategoria);
}
