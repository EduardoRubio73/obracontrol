import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente inteligente do ObraControl, um sistema de gestão de obras.
Você ajuda o usuário a gerenciar obras, gastos, etapas e cotações.

Regras:
- Sempre responda em português brasileiro, de forma curta e clara.
- Quando o usuário pedir para criar algo, use as ferramentas disponíveis.
- Sempre sugira próximos passos com botões de ação.
- Se o usuário enviar uma foto ou documento, analise o contexto e sugira ações.
- Nunca invente dados. Se não souber, diga que não tem a informação.
- Use markdown para formatar respostas (negrito, listas, etc).

Contexto atual:
- O usuário pode ter uma obra ativa selecionada. Se obra_id for fornecido, use-o nas operações.
- Se o usuário pedir algo que precisa de obra e não houver obra_id, peça para selecionar uma obra.`;

const tools = [
  {
    type: "function",
    function: {
      name: "criar_obra",
      description: "Cria uma nova obra com etapas automáticas. Use quando o usuário pedir para criar obra, projeto ou reforma.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da obra" },
          tipo: { type: "string", enum: ["reforma", "construcao"], description: "Tipo da obra" },
          classificacao: { type: "string", enum: ["simples", "media", "complexa"], description: "Classificação de complexidade" },
          descricao: { type: "string", description: "Descrição opcional da obra" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_gasto",
      description: "Registra uma despesa/gasto em uma obra. Requer obra_id.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          descricao: { type: "string", description: "Descrição do gasto" },
          valor: { type: "number", description: "Valor em reais" },
        },
        required: ["obra_id", "descricao", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_etapa",
      description: "Cria uma nova etapa/fase em uma obra. Requer obra_id.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          nome: { type: "string", description: "Nome da etapa" },
        },
        required: ["obra_id", "nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "status_obra",
      description: "Consulta o status e resumo de uma obra: progresso, etapas, gastos. Requer obra_id.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
        },
        required: ["obra_id"],
      },
    },
  },
];

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ result: string; acoes?: { label: string; route: string }[] }> {
  switch (toolName) {
    case "criar_obra": {
      const { data, error } = await supabaseAdmin.rpc("fn_criar_obra_inteligente", {
        p_nome: args.nome as string,
        p_tipo: (args.tipo as string) || "reforma",
        p_classificacao: (args.classificacao as string) || "simples",
        p_descricao: (args.descricao as string) || null,
      });
      if (error) return { result: `Erro ao criar obra: ${error.message}` };
      return {
        result: `Obra "${args.nome}" criada com sucesso! ID: ${data}`,
        acoes: [
          { label: "Ver obra", route: `/obras/${data}` },
          { label: "Ver etapas", route: "/etapas" },
        ],
      };
    }

    case "criar_gasto": {
      const { error } = await supabaseAdmin.from("financeiro").insert({
        obra_id: args.obra_id as string,
        descricao: args.descricao as string,
        valor: args.valor as number,
        tipo: "despesa",
        user_id: userId,
        data_transacao: new Date().toISOString().split("T")[0],
      });
      if (error) return { result: `Erro ao registrar gasto: ${error.message}` };
      return {
        result: `Gasto de R$ ${(args.valor as number).toFixed(2)} registrado: "${args.descricao}"`,
        acoes: [{ label: "Ver financeiro", route: "/financeiro" }],
      };
    }

    case "criar_etapa": {
      const { data: maxOrdem } = await supabaseAdmin
        .from("obra_fases")
        .select("ordem")
        .eq("obra_id", args.obra_id as string)
        .order("ordem", { ascending: false })
        .limit(1)
        .single();

      const { error } = await supabaseAdmin.from("obra_fases").insert({
        obra_id: args.obra_id as string,
        nome: args.nome as string,
        ordem: (maxOrdem?.ordem || 0) + 1,
        status: "pendente",
        progresso: 0,
      });
      if (error) return { result: `Erro ao criar etapa: ${error.message}` };
      return {
        result: `Etapa "${args.nome}" criada com sucesso!`,
        acoes: [{ label: "Ver etapas", route: "/etapas" }],
      };
    }

    case "status_obra": {
      const obraId = args.obra_id as string;

      const [obraRes, fasesRes, finRes] = await Promise.all([
        supabaseAdmin.from("obras").select("nome, status, valor_previsto").eq("id", obraId).single(),
        supabaseAdmin.from("obra_fases").select("nome, status, progresso").eq("obra_id", obraId).order("ordem"),
        supabaseAdmin.from("financeiro").select("valor, tipo").eq("obra_id", obraId),
      ]);

      if (obraRes.error) return { result: `Erro ao buscar obra: ${obraRes.error.message}` };

      const obra = obraRes.data;
      const fases = fasesRes.data || [];
      const financeiro = finRes.data || [];

      const totalGasto = financeiro.filter((f) => f.tipo === "despesa").reduce((s, f) => s + f.valor, 0);
      const progressoGeral = fases.length ? Math.round(fases.reduce((s, f) => s + (f.progresso || 0), 0) / fases.length) : 0;

      const fasesResumo = fases
        .map((f) => `- ${f.nome}: ${f.status} (${f.progresso || 0}%)`)
        .join("\n");

      return {
        result: `**${obra.nome}** — ${obra.status || "em andamento"}

📊 Progresso geral: **${progressoGeral}%**
💰 Orçamento: R$ ${(obra.valor_previsto || 0).toFixed(2)}
💸 Gasto: R$ ${totalGasto.toFixed(2)}

**Etapas:**
${fasesResumo || "Nenhuma etapa cadastrada."}`,
        acoes: [
          { label: "Ver dashboard", route: "/dashboard" },
          { label: "Ver etapas", route: "/etapas" },
          { label: "Ver financeiro", route: "/financeiro" },
        ],
      };
    }

    default:
      return { result: "Ferramenta não reconhecida." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.user.id;

    // Admin client for tool execution
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { mensagem, obra_id, historico = [], anexos = [] } = await req.json();

    if (!mensagem || typeof mensagem !== "string") {
      return new Response(JSON.stringify({ error: "mensagem is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build messages
    const contextInfo = obra_id ? `\nObra ativa ID: ${obra_id}` : "\nNenhuma obra selecionada.";
    const anexoInfo = anexos.length
      ? `\nO usuário enviou ${anexos.length} anexo(s): ${anexos.map((a: { nome: string; url: string }) => a.nome).join(", ")}`
      : "";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + contextInfo + anexoInfo },
      ...historico.map((h: { role: string; content: string }) => ({
        role: h.role,
        content: h.content,
      })),
      { role: "user", content: mensagem },
    ];

    // Call AI with tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    if (!choice) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle tool calls
    if (choice.finish_reason === "tool_calls" || choice.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      let combinedResponse = "";
      let allAcoes: { label: string; route: string }[] = [];

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        let fnArgs: Record<string, unknown>;
        try {
          fnArgs = JSON.parse(tc.function.arguments);
        } catch {
          fnArgs = {};
        }

        // Inject obra_id if tool needs it and user has one active
        if (["criar_gasto", "criar_etapa", "status_obra"].includes(fnName) && !fnArgs.obra_id && obra_id) {
          fnArgs.obra_id = obra_id;
        }

        const toolResult = await executeTool(fnName, fnArgs, userId, supabaseAdmin);
        combinedResponse += (combinedResponse ? "\n\n" : "") + toolResult.result;
        if (toolResult.acoes) allAcoes.push(...toolResult.acoes);
      }

      // Get a final natural language response after tool execution
      const followUpMessages = [
        ...messages,
        choice.message,
        ...toolCalls.map((tc: { id: string; function: { name: string } }) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: combinedResponse,
        })),
      ];

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
        }),
      });

      let finalText = combinedResponse;
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpContent = followUpData.choices?.[0]?.message?.content;
        if (followUpContent) finalText = followUpContent;
      }

      return new Response(
        JSON.stringify({ resposta: finalText, acoes: allAcoes, executado: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple text response
    const textContent = choice.message?.content || "Não consegui processar sua mensagem.";
    return new Response(
      JSON.stringify({ resposta: textContent, acoes: [], executado: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-assistente error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
