export interface EtapaPadraoOption {
  id: string;
  nome: string;
}

export function findEtapaPadraoPorNome(
  nome: string,
  opcoes: EtapaPadraoOption[]
): EtapaPadraoOption | undefined {
  const alvo = nome.trim().toLowerCase();
  if (!alvo) return undefined;
  return opcoes.find((o) => o.nome.trim().toLowerCase() === alvo);
}
