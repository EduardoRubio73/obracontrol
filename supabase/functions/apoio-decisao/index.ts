import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { propostas, descricao_cotacao, itens_solicitados } = await req.json();
    if (!propostas || !Array.isArray(propostas) || propostas.length < 2) {
      return new Response(JSON.stringify({ error: "Mínimo 2 propostas para comparar" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const itensMaoDeObra = Array.isArray(itens_solicitados)
      ? itens_solicitados.filter((i: any) => i.tipo === "mao_de_obra")
      : [];

    const escopoText = itensMaoDeObra.length > 0
      ? "\n\nItens de MÃO DE OBRA/SERVIÇO solicitados nesta cotação (exija prazo de execução, escopo e garantia — sinalize explicitamente quando alguma proposta não informar isso):\n"
        + itensMaoDeObra.map((i: any) => `- ${i.nome}: ${i.escopo || "escopo não detalhado pelo solicitante"}`).join("\n")
      : "";

    const propostasText = propostas.map((p: any, i: number) =>
      `Proposta ${i + 1} - ${p.fornecedor}: Valor R$${p.valor}, Prazo ${p.prazo_dias || "não informado"} dias, Observações/Garantia: ${p.observacoes || "nenhuma"}`
    ).join("\n");

    const systemPrompt = `Você é um consultor de obras especializado em análise de propostas no Brasil.
Analise as propostas abaixo e recomende a melhor opção custo-benefício.
Considere: valor, prazo, completude da proposta.
Quando a cotação incluir item de mão de obra/serviço, trate valor baixo sem prazo/garantia definidos como risco, não como vantagem, e cite isso nos pontos de atenção.
Use a função recomendar_proposta para retornar sua análise.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Cotação: ${descricao_cotacao || "Obra"}${escopoText}\n\n${propostasText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recomendar_proposta",
              description: "Retorna a recomendação de melhor proposta",
              parameters: {
                type: "object",
                properties: {
                  indice_recomendado: { type: "number", description: "Índice (0-based) da proposta recomendada" },
                  justificativa: { type: "string", description: "Explicação clara da recomendação" },
                  pontos_atencao: {
                    type: "array",
                    items: { type: "string" },
                    description: "Pontos de atenção ou riscos",
                  },
                },
                required: ["indice_recomendado", "justificativa", "pontos_atencao"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recomendar_proposta" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const recomendacao = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(recomendacao), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("apoio-decisao error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
