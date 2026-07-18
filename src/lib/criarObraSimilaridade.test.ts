import { describe, it, expect } from "vitest";
import { normalizarNomeObra, buscarObraSimilar } from "./criarObraSimilaridade";

describe("normalizarNomeObra", () => {
  it("remove acentos, baixa a caixa e colapsa espaços", () => {
    expect(normalizarNomeObra("  Reforma Da Piscína  ")).toBe("reforma da piscina");
  });
});

describe("buscarObraSimilar", () => {
  const obras = [
    { id: "1", nome: "Reforma da Piscina" },
    { id: "2", nome: "Quadra Polesportiva" },
    { id: "3", nome: "Reforma do Telhado" },
  ];

  it("encontra obra com os mesmos tokens significativos, ignorando preposições", () => {
    const resultado = buscarObraSimilar("reforma piscina", obras);
    expect(resultado).toEqual({ id: "1", nome: "Reforma da Piscina" });
  });

  it("é insensível a acento e caixa", () => {
    const resultado = buscarObraSimilar("REFORMA DA PISCÍNA", obras);
    expect(resultado?.id).toBe("1");
  });

  it("não confunde obras com apenas uma palavra em comum", () => {
    const resultado = buscarObraSimilar("Reforma da Cozinha", obras);
    expect(resultado).toBeNull();
  });

  it("retorna null para nome sem nenhuma obra parecida", () => {
    expect(buscarObraSimilar("Muro Novo", obras)).toBeNull();
  });

  it("retorna null quando a lista de obras está vazia", () => {
    expect(buscarObraSimilar("Reforma da Piscina", [])).toBeNull();
  });

  it("em empate de score, prefere a primeira da lista (mais recente, já ordenada por created_at desc)", () => {
    const empatadas = [
      { id: "a", nome: "Portaria Norte" },
      { id: "b", nome: "Portaria Sul" },
    ];
    const resultado = buscarObraSimilar("Portaria", empatadas);
    expect(resultado?.id).toBe("a");
  });
});
