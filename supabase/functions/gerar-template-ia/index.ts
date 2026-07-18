import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface GenerateTemplateRequest {
  tipo_obra: string;
  ambientes: string[];
  descricao: string;
}

interface TemplateResponse {
  nome: string;
  descricao: string;
  ambientes: string[];
  servicos: {
    nome: string;
    descricao?: string;
    prioridade: number;
    tempo_medio_dias: number;
    etapas: {
      nome: string;
      tarefas: {
        nome: string;
        tempo_dias: number;
      }[];
    }[];
  }[];
}

async function callGemini(prompt: string): Promise<TemplateResponse | null> {
  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured in Supabase secrets");
      return null;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("No content from Gemini");
      return null;
    }

    // Extract JSON from response (Gemini might wrap it in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // DEBUG: Check if API key is available
  if (req.url.includes("debug")) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    return new Response(
      JSON.stringify({
        debug: true,
        apiKeyConfigured: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) + "..." || "NOT_SET",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse request
    const { tipo_obra, ambientes, descricao } =
      (await req.json()) as GenerateTemplateRequest;

    if (!tipo_obra || !ambientes || ambientes.length === 0 || !descricao) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: tipo_obra, ambientes, descricao",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build prompt for Claude
    const prompt = `Você é um especialista em construção e projetos. Crie um template de obra detalhado em formato JSON.

Requisitos:
- Tipo de obra: ${tipo_obra}
- Ambientes: ${ambientes.join(", ")}
- Descrição: ${descricao}

Gere um JSON com esta estrutura EXATA:
{
  "nome": "Nome descritivo do template",
  "descricao": "Descrição completa",
  "ambientes": ["Ambiente 1", "Ambiente 2"],
  "servicos": [
    {
      "nome": "Nome do serviço",
      "descricao": "Descrição breve",
      "prioridade": 1,
      "tempo_medio_dias": 3,
      "etapas": [
        {
          "nome": "Nome da etapa",
          "tarefas": [
            {
              "nome": "Tarefa específica",
              "tempo_dias": 1
            }
          ]
        }
      ]
    }
  ]
}

Inclua:
- 3-5 serviços principais (Pintura, Hidráulica, Elétrica, Estrutura, Alvenaria, etc)
- Cada serviço com 2-3 etapas
- Cada etapa com 2-3 tarefas
- Tempo realista em dias para cada tarefa
- Prioridade de 1-5 (1=alta, 5=baixa)

Responda APENAS com o JSON, sem markdown code blocks.`;

    // Call Gemini API
    const templateData = await callGemini(prompt);

    if (!templateData) {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      const errorMsg = !apiKey
        ? "GEMINI_API_KEY not configured in Supabase secrets"
        : "Failed to generate template from Gemini (API error or invalid response)";

      console.error("Template generation failed:", errorMsg, "API key status:", !!apiKey);

      return new Response(
        JSON.stringify({
          error: errorMsg,
          debug: {
            apiKeyConfigured: !!apiKey,
            apiKeyLength: apiKey?.length || 0,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate response structure
    if (!templateData.nome || !templateData.servicos || templateData.servicos.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid template structure from Claude",
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Save as draft template in database
    const { data: template, error: insertError } = await supabase
      .from("catalogo_templates")
      .insert({
        nome: templateData.nome,
        descricao: templateData.descricao,
        ativo: false, // Draft mode
      })
      .select()
      .single();

    if (insertError || !template) {
      console.error("Error saving template:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save template to database",
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Return success response with generated template
    return new Response(
      JSON.stringify({
        success: true,
        template_id: template.id,
        template_data: templateData,
        message:
          "Template gerado com sucesso! Salvo como draft (ativo=false). Revise e clique em ativar para usar.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in gerar-template-ia:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
