// src/lib/criarObraChatFlow.test.ts
import { describe, it, expect } from "vitest";
import { criacaoObraReducer, ESTADO_INICIAL, CriacaoObraState } from "./criarObraChatFlow";

describe("criacaoObraReducer", () => {
  it("iniciar ativa o fluxo e reseta para o estado inicial", () => {
    const sujo: CriacaoObraState = { ...ESTADO_INICIAL, ativo: true, nome: "lixo", step: "fornecedores" };
    const resultado = criacaoObraReducer(sujo, { type: "iniciar" });
    expect(resultado).toEqual({ ...ESTADO_INICIAL, ativo: true });
  });

  it("cancelar desativa e reseta", () => {
    const emAndamento: CriacaoObraState = { ...ESTADO_INICIAL, ativo: true, nome: "Reforma", step: "tipo" };
    const resultado = criacaoObraReducer(emAndamento, { type: "cancelar" });
    expect(resultado.ativo).toBe(false);
    expect(resultado.nome).toBe("");
  });

  it("informar_nome sem duplicata avança direto para tipo", () => {
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true },
      { type: "informar_nome", nome: "Reforma da Garagem", duplicata: null }
    );
    expect(resultado.step).toBe("tipo");
    expect(resultado.nome).toBe("Reforma da Garagem");
    expect(resultado.duplicata).toBeNull();
  });

  it("informar_nome com duplicata pausa no passo duplicata", () => {
    const duplicata = { id: "1", nome: "Reforma da Garagem" };
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true },
      { type: "informar_nome", nome: "reforma garagem", duplicata }
    );
    expect(resultado.step).toBe("duplicata");
    expect(resultado.duplicata).toEqual(duplicata);
  });

  it("ignorar_duplicata segue para tipo e limpa a duplicata", () => {
    const comDuplicata: CriacaoObraState = {
      ...ESTADO_INICIAL, ativo: true, step: "duplicata", duplicata: { id: "1", nome: "X" },
    };
    const resultado = criacaoObraReducer(comDuplicata, { type: "ignorar_duplicata" });
    expect(resultado.step).toBe("tipo");
    expect(resultado.duplicata).toBeNull();
  });

  it("informar_tipo avança para complexidade", () => {
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "tipo" },
      { type: "informar_tipo", tipoObra: "Reforma" }
    );
    expect(resultado.step).toBe("complexidade");
    expect(resultado.tipoObra).toBe("Reforma");
  });

  it("informar_classificacao avança para descricao", () => {
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "complexidade" },
      { type: "informar_classificacao", classificacao: "media" }
    );
    expect(resultado.step).toBe("descricao");
    expect(resultado.classificacao).toBe("media");
  });

  it("gerando_escopo liga carregando e limpa erro; escopo_gerado avança para escopo", () => {
    const escopo = { descricao_estruturada: "x", necessidades: [], profissional_recomendado: "técnico", alertas_seguranca: [] };
    let s = criacaoObraReducer({ ...ESTADO_INICIAL, ativo: true, step: "descricao" }, { type: "gerando_escopo" });
    expect(s.carregando).toBe(true);
    s = criacaoObraReducer(s, { type: "escopo_gerado", escopo });
    expect(s.step).toBe("escopo");
    expect(s.carregando).toBe(false);
    expect(s.escopo).toEqual(escopo);
  });

  it("escopo_falhou guarda o erro e desliga carregando sem mudar de passo", () => {
    const s = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "descricao", carregando: true },
      { type: "escopo_falhou", erro: "boom" }
    );
    expect(s.erro).toBe("boom");
    expect(s.carregando).toBe(false);
    expect(s.step).toBe("descricao");
  });

  it("voltar_para_descricao limpa o escopo e volta o passo", () => {
    const s = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "escopo", escopo: { descricao_estruturada: "x", necessidades: [], profissional_recomendado: "y", alertas_seguranca: [] } },
      { type: "voltar_para_descricao" }
    );
    expect(s.step).toBe("descricao");
    expect(s.escopo).toBeNull();
  });

  it("confirmar_escopo avança direto para fornecedores (não há mais passo de template)", () => {
    const s = criacaoObraReducer({ ...ESTADO_INICIAL, ativo: true, step: "escopo" }, { type: "confirmar_escopo" });
    expect(s.step).toBe("fornecedores");
  });

  it("alternar_fornecedor adiciona, remove, e respeita o limite de 3", () => {
    const f1 = { id: "1", nome: "A", categoria: null };
    const f2 = { id: "2", nome: "B", categoria: null };
    const f3 = { id: "3", nome: "C", categoria: null };
    const f4 = { id: "4", nome: "D", categoria: null };

    let s = { ...ESTADO_INICIAL, ativo: true, step: "fornecedores" as const };
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f1 });
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f2 });
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f3 });
    expect(s.fornecedoresSelecionados).toHaveLength(3);

    // 4º é ignorado (limite atingido)
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f4 });
    expect(s.fornecedoresSelecionados).toHaveLength(3);
    expect(s.fornecedoresSelecionados.find((f) => f.id === "4")).toBeUndefined();

    // remove um já selecionado
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f1 });
    expect(s.fornecedoresSelecionados).toHaveLength(2);
    expect(s.fornecedoresSelecionados.find((f) => f.id === "1")).toBeUndefined();
  });

  it("criando_obra -> obra_criada finaliza em sucesso com o id", () => {
    let s = criacaoObraReducer({ ...ESTADO_INICIAL, ativo: true, step: "fornecedores" }, { type: "criando_obra" });
    expect(s.step).toBe("criando");
    expect(s.carregando).toBe(true);
    s = criacaoObraReducer(s, { type: "obra_criada", obraId: "obra-1" });
    expect(s.step).toBe("sucesso");
    expect(s.novaObraId).toBe("obra-1");
    expect(s.carregando).toBe(false);
  });

  it("criacao_falhou volta para fornecedores com o erro visível", () => {
    const s = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "criando", carregando: true },
      { type: "criacao_falhou", erro: "falhou" }
    );
    expect(s.step).toBe("fornecedores");
    expect(s.erro).toBe("falhou");
    expect(s.carregando).toBe(false);
  });
});
