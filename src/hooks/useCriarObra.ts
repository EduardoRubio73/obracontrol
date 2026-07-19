import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Complexidade, EscopoIA, FornecedorSelecionado } from "@/lib/criarObraChatFlow";

export interface CriarObraInput {
  nome: string;
  tipoObra: string;
  classificacao: Complexidade;
  descricao: string;
  escopo: EscopoIA | null;
  dataInicio?: string | null; // YYYY-MM-DD
  dataPrevista?: string | null; // YYYY-MM-DD
  valorPrevisto?: number | null;
  localizacao?: string | null;
  fornecedoresLojas: FornecedorSelecionado[];
  fornecedoresProfissionais: FornecedorSelecionado[];
  userId: string;
}

// Datas sempre como string YYYY-MM-DD local — nunca toISOString() (shift de fuso)
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const parseDia = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

async function criarCotacao(
  obraId: string,
  descricao: string,
  fornecedores: FornecedorSelecionado[],
  itens: Array<{ nome: string; quantidade: number; unidade: string; tipo: string; escopo?: string }>,
  tipoCotacao: "materiais" | "mao_de_obra"
) {
  const fornIds = fornecedores.map((f) => f.id);
  const { data: cotacaoId, error: cotErr } = await supabase.rpc(
    "fn_criar_cotacao_com_fornecedores" as any,
    { p_obra_id: obraId, p_descricao: descricao, p_fornecedores_ids: fornIds }
  );
  if (cotErr) throw cotErr;

  if (itens.length > 0 && cotacaoId) {
    const { error: itensErr } = await supabase
      .from("itens_cotacao")
      .insert(itens.map((i) => ({ ...i, cotacao_id: cotacaoId })));
    if (itensErr) throw itensErr;
  }

  await (supabase.from("obra_dossie" as any) as any).insert({
    obra_id: obraId,
    tipo: "solicitacao_enviada",
    titulo: tipoCotacao === "materiais" ? "Cotação de materiais enviada" : "Cotação de mão de obra enviada",
    descricao: `Enviada para ${fornecedores.length} ${tipoCotacao === "materiais" ? "fornecedor(es)" : "profissional(is)"}`,
    dados: { cotacao_id: cotacaoId, fornecedor_ids: fornIds, tipo: tipoCotacao },
  });
}

export function useCriarObra() {
  const queryClient = useQueryClient();

  const criarObra = useMutation({
    mutationFn: async (input: CriarObraInput) => {
      const etapas = input.escopo?.etapas ?? [];
      const duracaoTotal = etapas.reduce((acc, e) => acc + Math.max(1, e.duracao_dias), 0);

      // Conclusão: a informada pelo usuário, ou calculada das durações das etapas
      let dataPrevista = input.dataPrevista || null;
      if (!dataPrevista && input.dataInicio && duracaoTotal > 0) {
        dataPrevista = fmt(addDays(parseDia(input.dataInicio), duracaoTotal - 1));
      }

      const { data: obra, error: obraErr } = await (supabase.from("obras") as any)
        .insert({
          nome: input.nome,
          tipo_obra: input.tipoObra,
          classificacao: input.classificacao,
          descricao: input.escopo?.descricao_estruturada || input.descricao,
          escopo_ia: input.escopo ? JSON.stringify(input.escopo) : null,
          profissional_recomendado: input.escopo?.profissional_recomendado || null,
          data_inicio: input.dataInicio || null,
          data_prevista_conclusao: dataPrevista,
          valor_previsto: input.valorPrevisto ?? null,
          localizacao: input.localizacao || null,
          user_id: input.userId,
          status: "planejamento",
        })
        .select("id")
        .single();
      if (obraErr) throw obraErr;

      const novaObraId = obra.id as string;

      // Etapas (obra_fases) sequenciais + tarefas (fase_itens) datadas
      if (etapas.length > 0 && input.dataInicio) {
        let cursor = parseDia(input.dataInicio);
        const fases = etapas.map((e, i) => {
          const inicio = cursor;
          const fim = addDays(inicio, Math.max(1, e.duracao_dias) - 1);
          cursor = addDays(fim, 1);
          return {
            obra_id: novaObraId,
            nome: e.nome,
            ordem: i + 1,
            status: "pendente",
            progresso: 0,
            data_inicio: fmt(inicio),
            data_fim: fmt(fim),
          };
        });
        const { data: fasesCriadas, error: fasesErr } = await (supabase.from("obra_fases") as any)
          .insert(fases)
          .select("id");
        if (fasesErr) throw fasesErr;

        const tarefas = etapas.flatMap((e, i) =>
          e.tarefas.map((t, j) => ({
            fase_id: fasesCriadas[i].id,
            nome: t,
            status: "pendente",
            ordem: j + 1,
            executar_em: fases[i].data_inicio,
          }))
        );
        if (tarefas.length > 0) {
          const { error: tarefasErr } = await (supabase.from("fase_itens") as any).insert(tarefas);
          if (tarefasErr) throw tarefasErr;
        }
      }

      await (supabase.from("obra_dossie" as any) as any).insert({
        obra_id: novaObraId,
        tipo: "obra_criada",
        titulo: "Obra criada",
        descricao: `Obra "${input.nome}" criada com classificação ${input.classificacao}`,
        dados: {
          tipo_obra: input.tipoObra,
          classificacao: input.classificacao,
          escopo: input.escopo,
          cronograma: input.dataInicio
            ? { data_inicio: input.dataInicio, data_prevista_conclusao: dataPrevista, etapas: etapas.length }
            : null,
        },
      });

      // Cotação de materiais → lojas
      const materiais = input.escopo?.materiais ?? [];
      const necessidades = input.escopo?.necessidades ?? [];
      if (input.fornecedoresLojas.length > 0 && (materiais.length > 0 || necessidades.length > 0)) {
        const itens = materiais.length > 0
          ? materiais.map((m) => ({ nome: m.nome, quantidade: m.quantidade, unidade: m.unidade, tipo: "produto" }))
          : necessidades.map((n) => ({ nome: n, quantidade: 1, unidade: "un", tipo: "produto" }));
        await criarCotacao(novaObraId, `Cotação de materiais - ${input.nome}`, input.fornecedoresLojas, itens, "materiais");
      }

      // Cotação de mão de obra → profissionais
      const maoDeObra = input.escopo?.mao_de_obra ?? [];
      if (input.fornecedoresProfissionais.length > 0) {
        if (maoDeObra.length > 0) {
          const itens = maoDeObra.map((m) => ({
            nome: m.servico,
            escopo: m.escopo,
            quantidade: 1,
            unidade: "un",
            tipo: "mao_de_obra",
          }));
          await criarCotacao(novaObraId, `Cotação de mão de obra - ${input.nome}`, input.fornecedoresProfissionais, itens, "mao_de_obra");
        } else if (necessidades.length > 0) {
          // Escopo antigo (sem mao_de_obra): comportamento anterior — necessidades como produto
          const itens = necessidades.map((n) => ({ nome: n, quantidade: 1, unidade: "un", tipo: "produto" }));
          await criarCotacao(novaObraId, `Cotação inicial - ${input.nome}`, input.fornecedoresProfissionais, itens, "materiais");
        }
      }

      return novaObraId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras-lista"] });
      queryClient.invalidateQueries({ queryKey: ["obra-fases"] });
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
    },
  });

  return {
    criarObra,
    isPending: criarObra.isPending,
  };
}
