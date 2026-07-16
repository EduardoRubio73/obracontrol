import { describe, it, expect } from "vitest";
import { findEtapaPadraoPorNome } from "./etapaPadrao";

describe("findEtapaPadraoPorNome", () => {
  const opcoes = [
    { id: "1", nome: "Demolição" },
    { id: "2", nome: "Fundação" },
  ];

  it("encontra por nome exato", () => {
    expect(findEtapaPadraoPorNome("Demolição", opcoes)?.id).toBe("1");
  });

  it("encontra ignorando maiúsculas/minúsculas e espaços nas pontas", () => {
    expect(findEtapaPadraoPorNome("  demolição  ", opcoes)?.id).toBe("1");
  });

  it("retorna undefined quando não encontra correspondência", () => {
    expect(findEtapaPadraoPorNome("Pintura", opcoes)).toBeUndefined();
  });

  it("retorna undefined para nome vazio ou só espaços", () => {
    expect(findEtapaPadraoPorNome("   ", opcoes)).toBeUndefined();
  });
});
