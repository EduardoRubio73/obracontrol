import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { descricao, tipo_obra, classificacao } = await req.json();
    if (!descricao) {
      return new Response(JSON.stringify({ error: "descricao is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente especializado em obras de construção civil no Brasil.
O usuário vai descrever uma obra em linguagem livre. Você deve:
1. Gerar uma descrição estruturada e profissional do escopo
2. Listar materiais e necessidades principais
3. Sugerir o tipo de profissional adequado (empreiteiro, técnico, engenheiro ou arquiteto)
4. Alertar sobre riscos de segurança se houver

Tipo da obra: ${tipo_obra || "casa"}
Classificação: ${classificacao || "simples"}

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
                  necessidades: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de materiais e necessidades principais",
                  },
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
                },
                required: ["descricao_estruturada", "necessidades", "profissional_recomendado", "alertas_seguranca"],
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
