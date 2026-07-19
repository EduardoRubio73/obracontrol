import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      descricao, tipo_obra, classificacao,
      data_inicio, data_prevista_conclusao, valor_previsto, localizacao,
    } = await req.json();
    if (!descricao) {
      return new Response(JSON.stringify({ error: "descricao is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente especializado em obras de construção civil no Brasil.
O usuário vai descrever uma obra em linguagem livre. Você deve gerar o escopo COMPLETO:
1. Uma descrição estruturada e profissional do escopo
2. A lista de MATERIAIS com quantidade e unidade compatíveis com o porte e a classificação da obra
3. Os serviços de MÃO DE OBRA necessários, cada um com escopo detalhado o suficiente para um profissional orçar sem visitar a obra (nível de detalhe conforme a classificação)
4. TODAS as etapas da obra, do início ao fim, em ordem de execução, cada uma com duração estimada em dias corridos e suas tarefas
5. O tipo de profissional adequado (empreiteiro, técnico, engenheiro ou arquiteto)
6. Alertas de segurança se houver

Tipo da obra: ${tipo_obra || "casa"}
Classificação: ${classificacao || "simples"}
${data_inicio ? `Data de início prevista: ${data_inicio}` : ""}
${data_prevista_conclusao ? `Pretensão de término do usuário: ${data_prevista_conclusao}` : ""}
${valor_previsto ? `Orçamento total estimado pelo usuário: R$ ${valor_previsto}` : ""}
${localizacao ? `Localização da obra: ${localizacao}` : ""}

Regras para os campos de alerta (use null quando não aplicável):
- Se a localização foi informada, considere o clima típico da região na época da obra (a partir da data de início) ao dimensionar a duração das etapas externas; se o clima for um risco relevante (ex: período chuvoso), explique em alerta_clima.
- Se o usuário informou pretensão de término, compare com a soma das durações das etapas: se for inviável ou apertado, explique em alerta_prazo.
- Se o usuário informou orçamento, avalie grosseiramente se é compatível com o escopo: se parecer insuficiente, explique em alerta_orcamento. Não distribua o orçamento por etapa.

Use a função gerar_escopo para retornar os dados estruturados.`;

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
          { role: "user", content: descricao },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "gerar_escopo",
              description: "Retorna o escopo estruturado da obra",
              parameters: {
                type: "object",
                properties: {
                  descricao_estruturada: { type: "string", description: "Descrição profissional e detalhada do escopo da obra" },
                  profissional_recomendado: {
                    type: "string",
                    enum: ["empreiteiro", "técnico", "engenheiro", "arquiteto"],
                    description: "Tipo de profissional recomendado",
                  },
                  alertas_seguranca: {
                    type: "array",
                    items: { type: "string" },
                    description: "Alertas de segurança relevantes (vazio se não houver)",
                  },
                  materiais: {
                    type: "array",
                    description: "Lista de materiais para cotação em lojas",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        quantidade: { type: "number" },
                        unidade: { type: "string", description: "un, m, m2, m3, kg, sc, l, pc" },
                      },
                      required: ["nome", "quantidade", "unidade"],
                      additionalProperties: false,
                    },
                  },
                  mao_de_obra: {
                    type: "array",
                    description: "Serviços de mão de obra para cotação com profissionais",
                    items: {
                      type: "object",
                      properties: {
                        servico: { type: "string", description: "Nome curto do serviço" },
                        escopo: { type: "string", description: "Escopo detalhado do serviço para o profissional orçar" },
                      },
                      required: ["servico", "escopo"],
                      additionalProperties: false,
                    },
                  },
                  etapas: {
                    type: "array",
                    description: "Todas as etapas da obra em ordem de execução",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        duracao_dias: { type: "integer", description: "Duração estimada em dias corridos, já considerando o clima da região" },
                        tarefas: { type: "array", items: { type: "string" } },
                      },
                      required: ["nome", "duracao_dias", "tarefas"],
                      additionalProperties: false,
                    },
                  },
                  alerta_prazo: { type: ["string", "null"], description: "Análise de viabilidade do prazo pretendido pelo usuário; null se não informado ou viável" },
                  alerta_clima: { type: ["string", "null"], description: "Alerta sobre o clima da região no período da obra; null se não relevante" },
                  alerta_orcamento: { type: ["string", "null"], description: "Alerta se o orçamento parecer incompatível com o escopo; null se ok ou não informado" },
                },
                required: [
                  "descricao_estruturada", "profissional_recomendado", "alertas_seguranca",
                  "materiais", "mao_de_obra", "etapas",
                  "alerta_prazo", "alerta_clima", "alerta_orcamento",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "gerar_escopo" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const escopo = JSON.parse(toolCall.function.arguments);
    // Retrocompatibilidade: consumidores antigos (fluxo de chat) leem `necessidades`
    escopo.necessidades = (escopo.materiais ?? []).map((m: { nome: string }) => m.nome);

    return new Response(JSON.stringify(escopo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-escopo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
