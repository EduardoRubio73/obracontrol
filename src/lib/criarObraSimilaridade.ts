const STOPWORDS = new Set(["da", "de", "do", "das", "dos", "a", "o", "e"]);

export function normalizarNomeObra(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(nome: string): string[] {
  return normalizarNomeObra(nome)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Compara por similaridade de tokens (Jaccard), ignorando preposições.
 * Limiar de 0.5 evita falsos positivos entre obras com só 1 palavra em comum.
 */
export function buscarObraSimilar<T extends { id: string; nome: string }>(
  nome: string,
  obras: T[]
): T | null {
  const inputTokens = new Set(tokens(nome));
  if (inputTokens.size === 0) return null;

  let melhor: { obra: T; score: number } | null = null;

  for (const obra of obras) {
    const obraTokens = new Set(tokens(obra.nome));
    if (obraTokens.size === 0) continue;

    const intersecao = [...inputTokens].filter((t) => obraTokens.has(t)).length;
    const uniao = new Set([...inputTokens, ...obraTokens]).size;
    const score = intersecao / uniao;

    if (score >= 0.5 && (!melhor || score > melhor.score)) {
      melhor = { obra, score };
    }
  }

  return melhor?.obra ?? null;
}
