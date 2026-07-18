import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Complexidade, EscopoIA, FornecedorSelecionado } from "@/lib/criarObraChatFlow";

export interface CriarObraInput {
  nome: string;
  tipoObra: string;
  classificacao: Complexidade;
  descricao: string;
  escopo: EscopoIA | null;
  fornecedores: FornecedorSelecionado[];
  userId: string;
}

export function useCriarObra() {
  const queryClient = useQueryClient();

  const criarObra = useMutation({
    mutationFn: async (input: CriarObraInput) => {
      const { data: obra, error: obraErr } = await (supabase.from("obras") as any)
        .insert({
          nome: input.nome,
          tipo_obra: input.tipoObra,
          classificacao: input.classificacao,
          descricao: input.escopo?.descricao_estruturada || input.descricao,
          escopo_ia: input.escopo ? JSON.stringify(input.escopo) : null,
          profissional_recomendado: input.escopo?.profissional_recomendado || null,
          user_id: input.userId,
          status: "planejamento",
        })
        .select("id")
        .single();
      if (obraErr) throw obraErr;

      const novaObraId = obra.id as string;

      await (supabase.from("obra_dossie" as any) as any).insert({
        obra_id: novaObraId,
        tipo: "obra_criada",
        titulo: "Obra criada",
        descricao: `Obra "${input.nome}" criada com classificação ${input.classificacao}`,
        dados: { tipo_obra: input.tipoObra, classificacao: input.classificacao, escopo: input.escopo },
      });

      if (input.fornecedores.length > 0) {
        const fornIds = input.fornecedores.map((f) => f.id);
        const { data: cotacaoId, error: cotErr } = await supabase.rpc(
          "fn_criar_cotacao_com_fornecedores" as any,
          {
            p_obra_id: novaObraId,
            p_descricao: `Cotação inicial - ${input.nome}`,
            p_fornecedores_ids: fornIds,
          }
        );
        if (cotErr) throw cotErr;

        if (input.escopo?.necessidades && cotacaoId) {
          const itens = input.escopo.necessidades.map((n) => ({
            cotacao_id: cotacaoId,
            nome: n,
            quantidade: 1,
            unidade: "un",
          }));
          await supabase.from("itens_cotacao").insert(itens);
        }

        await (supabase.from("obra_dossie" as any) as any).insert({
          obra_id: novaObraId,
          tipo: "solicitacao_enviada",
          titulo: "Solicitação enviada para profissionais",
          descricao: `Enviada para ${input.fornecedores.length} profissional(is)`,
          dados: { cotacao_id: cotacaoId, fornecedor_ids: fornIds },
        });
      }

      return novaObraId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras-lista"] });
    },
  });

  return {
    criarObra,
    isPending: criarObra.isPending,
  };
}
