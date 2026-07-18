import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function callClaude(prompt: string): Promise<TemplateResponse | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      console.error("No content from Claude");
      return null;
    }

    // Extract JSON from response (Claude might wrap it in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error calling Claude:", error);
    return null;
  }
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
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
        headers: { "Content-Type": "application/json" },
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
        { status: 400, headers: { "Content-Type": "application/json" } }
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

    // Call Claude API
    const templateData = await callClaude(prompt);

    if (!templateData) {
      return new Response(
        JSON.stringify({
          error: "Failed to generate template from Claude",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate response structure
    if (!templateData.nome || !templateData.servicos || templateData.servicos.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid template structure from Claude",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
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
        { status: 500, headers: { "Content-Type": "application/json" } }
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
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gerar-template-ia:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
