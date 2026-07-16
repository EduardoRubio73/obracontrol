import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Agente de Gestão do ObraControl — um assistente especializado com capacidade CRUD total sobre todas as tabelas do sistema.

## Suas capacidades:
- CRIAR: obras, etapas, gastos, compras, fornecedores, cotações
- LER/CONSULTAR: financeiro (somas, saldos), compras, cotações, documentos, fornecedores, produtos, etapas
- ATUALIZAR: status de etapas, status de obras, status de compras
- EXCLUIR: gastos, etapas

## Regras obrigatórias:
1. Sempre responda em português brasileiro, de forma curta e clara.
2. NUNCA retorne tags HTML. Use APENAS markdown para formatação.
3. Para ações clicáveis, retorne no campo "acoes", NUNCA como HTML.
4. NUNCA invente dados. Sempre use as ferramentas de consulta ANTES de responder sobre dados.
5. Após executar uma ação CRUD, confirme com ✅ e detalhes (ex: "✅ Gasto de R$ 500 registrado na obra X").
6. Se o usuário perguntar "quanto gastei?", "qual o saldo?", "como está o andamento?" — use a ferramenta de consulta correspondente.
7. Se precisar de obra_id e não houver, peça para selecionar uma obra.
8. Todas as operações usam o user_id autenticado — NUNCA permita acesso a dados de outros usuários.

## Mapeamento de tabelas SQL:
- **obras**: id, nome, status, valor_previsto, valor_disponivel, tipo_obra, classificacao, data_inicio, data_prevista_conclusao, user_id
- **obra_fases**: id, nome, status (pendente/em_andamento/concluido), progresso (0-100), obra_id, ordem, data_inicio, data_fim
- **financeiro**: id, obra_id, descricao, valor, tipo (despesa/receita/adiantamento/reembolso), data_transacao, user_id
- **compras**: id, obra_id, descricao, quantidade, valor_unitario, valor_total, status (pendente/comprado), user_id
- **cotacoes**: id, obra_id, descricao, status (rascunho/enviada/recebendo_propostas/comparando/finalizada/cancelada)
- **fornecedores**: id, nome, email, telefone, cnpj, categoria, tipo, status (ativo/bloqueado/alerta), user_id
- **documentos**: id, obra_id, nome, url, tipo, tamanho_bytes, user_id
- **produtos**: id, nome, unidade, categoria_id, user_id

## Instruções de contexto:
- Você receberá dados da obra ativa automaticamente.
- Use os dados contextuais para responder rapidamente.
- Para perguntas detalhadas, use as ferramentas de consulta para dados atualizados.`;

const tools = [
  // === CREATE ===
  {
    type: "function",
    function: {
      name: "criar_obra",
      description: "Cria uma nova obra com etapas automáticas.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da obra" },
          tipo: { type: "string", enum: ["reforma", "construcao"], description: "Tipo da obra" },
          classificacao: { type: "string", enum: ["simples", "media", "complexa"], description: "Classificação" },
          descricao: { type: "string", description: "Descrição opcional" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_gasto",
      description: "Registra uma despesa/gasto no financeiro de uma obra.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          descricao: { type: "string", description: "Descrição do gasto" },
          valor: { type: "number", description: "Valor em reais" },
          tipo: { type: "string", enum: ["despesa", "receita", "adiantamento", "reembolso"], description: "Tipo da transação. Default: despesa" },
        },
        required: ["obra_id", "descricao", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_etapa",
      description: "Cria uma nova etapa/fase em uma obra.",
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
      name: "criar_compra",
      description: "Registra uma compra de material/serviço em uma obra.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          descricao: { type: "string", description: "Descrição da compra (ex: 10 sacos de cimento)" },
          quantidade: { type: "number", description: "Quantidade" },
          valor_unitario: { type: "number", description: "Valor unitário em reais" },
          valor_total: { type: "number", description: "Valor total em reais" },
          status: { type: "string", enum: ["pendente", "comprado"], description: "Status da compra. Default: pendente" },
        },
        required: ["obra_id", "descricao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_fornecedor",
      description: "Cadastra um novo fornecedor.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do fornecedor" },
          email: { type: "string", description: "Email" },
          telefone: { type: "string", description: "Telefone" },
          cnpj: { type: "string", description: "CNPJ" },
          categoria: { type: "string", description: "Categoria (pedreiro, eletricista, encanador, etc)" },
          tipo: { type: "string", description: "Tipo do fornecedor" },
        },
        required: ["nome"],
      },
    },
  },
  // === READ ===
  {
    type: "function",
    function: {
      name: "status_obra",
      description: "Consulta status completo de uma obra: progresso, etapas, gastos.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
        },
        required: ["obra_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_financeiro",
      description: "Consulta dados financeiros: soma de gastos, receitas, saldo, lista de movimentações. Use para responder 'quanto gastei?', 'qual o saldo?', etc.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
        },
        required: ["obra_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_compras",
      description: "Lista compras de uma obra, com filtro por status (pendente/comprado).",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          status: { type: "string", enum: ["pendente", "comprado"], description: "Filtrar por status (opcional)" },
        },
        required: ["obra_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_cotacoes",
      description: "Lista cotações de uma obra e seus status.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
        },
        required: ["obra_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_documentos",
      description: "Lista documentos anexados a uma obra.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
        },
        required: ["obra_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_fornecedores",
      description: "Lista fornecedores do usuário, com filtro opcional por categoria ou status.",
      parameters: {
        type: "object",
        properties: {
          categoria: { type: "string", description: "Filtrar por categoria (opcional)" },
          status: { type: "string", enum: ["ativo", "bloqueado", "alerta"], description: "Filtrar por status (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_produtos",
      description: "Lista produtos cadastrados pelo usuário.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // === UPDATE ===
  {
    type: "function",
    function: {
      name: "atualizar_etapa",
      description: "Atualiza o status ou progresso de uma etapa. Use quando o usuário pedir para marcar como concluída, em andamento, etc.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          nome_etapa: { type: "string", description: "Nome da etapa a atualizar" },
          status: { type: "string", enum: ["pendente", "em_andamento", "concluido"], description: "Novo status" },
          progresso: { type: "number", description: "Novo progresso (0-100)" },
        },
        required: ["obra_id", "nome_etapa"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_obra",
      description: "Atualiza dados de uma obra: status, valor_previsto, datas.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          status: { type: "string", enum: ["planejamento", "execução", "concluído", "pausado", "cancelado"], description: "Novo status" },
          valor_previsto: { type: "number", description: "Novo valor previsto" },
          data_inicio: { type: "string", description: "Nova data de início (YYYY-MM-DD)" },
          data_prevista_conclusao: { type: "string", description: "Nova data de conclusão (YYYY-MM-DD)" },
        },
        required: ["obra_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_compra",
      description: "Atualiza o status de uma compra (ex: pendente → comprado).",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          descricao_compra: { type: "string", description: "Descrição da compra a atualizar" },
          status: { type: "string", enum: ["pendente", "comprado"], description: "Novo status" },
        },
        required: ["obra_id", "descricao_compra", "status"],
      },
    },
  },
  // === DELETE ===
  {
    type: "function",
    function: {
      name: "excluir_gasto",
      description: "Remove um registro do financeiro por descrição.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          descricao: { type: "string", description: "Descrição do gasto a remover" },
        },
        required: ["obra_id", "descricao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_etapa",
      description: "Remove uma etapa por nome.",
      parameters: {
        type: "object",
        properties: {
          obra_id: { type: "string", description: "ID da obra (UUID)" },
          nome_etapa: { type: "string", description: "Nome da etapa a remover" },
        },
        required: ["obra_id", "nome_etapa"],
      },
    },
  },
];

// List of tools that need obra_id injection
const TOOLS_NEEDING_OBRA_ID = [
  "criar_gasto", "criar_etapa", "criar_compra",
  "status_obra", "consultar_financeiro", "consultar_compras",
  "consultar_cotacoes", "consultar_documentos",
  "atualizar_etapa", "atualizar_obra", "atualizar_compra",
  "excluir_gasto", "excluir_etapa",
];

async function buildObraContext(obraId: string, userId: string, supabaseAdmin: ReturnType<typeof createClient>): Promise<string> {
  try {
    const [obraRes, fasesRes, finRes, cotacoesRes, comprasRes] = await Promise.all([
      supabaseAdmin.from("obras").select("nome, status, valor_previsto, data_inicio, data_prevista_conclusao, classificacao, tipo_obra").eq("id", obraId).eq("user_id", userId).single(),
      supabaseAdmin.from("obra_fases").select("nome, status, progresso, data_inicio, data_fim").eq("obra_id", obraId).order("ordem"),
      supabaseAdmin.from("financeiro").select("descricao, valor, tipo, data_transacao").eq("obra_id", obraId).eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("cotacoes").select("descricao, status").eq("obra_id", obraId).limit(10),
      supabaseAdmin.from("compras").select("descricao, status, valor_total").eq("obra_id", obraId).eq("user_id", userId).limit(10),
    ]);

    if (obraRes.error || !obraRes.data) return "\nNão foi possível carregar dados da obra ativa.";

    const obra = obraRes.data;
    const fases = fasesRes.data || [];
    const financeiro = finRes.data || [];
    const cotacoes = cotacoesRes.data || [];
    const compras = comprasRes.data || [];

    const totalGasto = financeiro.filter((f: any) => f.tipo === "despesa").reduce((s: number, f: any) => s + (f.valor || 0), 0);
    const totalReceita = financeiro.filter((f: any) => f.tipo === "receita").reduce((s: number, f: any) => s + (f.valor || 0), 0);
    const progressoGeral = fases.length ? Math.round(fases.reduce((s: number, f: any) => s + (f.progresso || 0), 0) / fases.length) : 0;

    const fasesResumo = fases.map((f: any) => `  - ${f.nome}: ${f.status} (${f.progresso || 0}%)`).join("\n");
    const finResumo = financeiro.slice(0, 10).map((f: any) => `  - ${f.descricao || f.tipo}: R$ ${Number(f.valor).toFixed(2)} (${f.tipo})`).join("\n");
    const cotacoesResumo = cotacoes.map((c: any) => `  - ${c.descricao}: ${c.status}`).join("\n");
    const comprasResumo = compras.map((c: any) => `  - ${c.descricao || "Compra"}: ${c.status} - R$ ${Number(c.valor_total || 0).toFixed(2)}`).join("\n");

    return `
--- DADOS REAIS DA OBRA ATIVA ---
Nome: ${obra.nome}
Status: ${obra.status || "planejamento"}
Tipo: ${obra.tipo_obra || "N/A"} | Classificação: ${obra.classificacao || "N/A"}
Orçamento previsto: R$ ${Number(obra.valor_previsto || 0).toFixed(2)}
Total gasto: R$ ${totalGasto.toFixed(2)}
Total receita: R$ ${totalReceita.toFixed(2)}
Saldo: R$ ${(Number(obra.valor_previsto || 0) - totalGasto).toFixed(2)}
Progresso geral: ${progressoGeral}%
Data início: ${obra.data_inicio || "Não definida"}
Previsão conclusão: ${obra.data_prevista_conclusao || "Não definida"}

Etapas (${fases.length}):
${fasesResumo || "  Nenhuma etapa cadastrada."}

Últimas movimentações financeiras:
${finResumo || "  Nenhuma movimentação registrada."}

Cotações (${cotacoes.length}):
${cotacoesResumo || "  Nenhuma cotação."}

Compras (${compras.length}):
${comprasResumo || "  Nenhuma compra."}
--- FIM DOS DADOS ---
Use SOMENTE estes dados para responder perguntas sobre a obra. Se um dado não está listado acima, use a ferramenta de consulta correspondente para buscar dados atualizados.`;
  } catch (e) {
    console.error("Error building obra context:", e);
    return "\nErro ao carregar dados da obra.";
  }
}

async function userOwnsObra(
  obraId: string,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("obras")
    .select("id")
    .eq("id", obraId)
    .eq("user_id", userId)
    .single();
  return !error && !!data;
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ result: string; acoes?: { label: string; route: string }[] }> {
  console.log(`[TOOL] ${toolName}`, JSON.stringify(args));

  switch (toolName) {
    // === CREATE ===
    case "criar_obra": {
      const { data, error } = await supabaseAdmin.rpc("fn_criar_obra_inteligente", {
        p_nome: args.nome as string,
        p_tipo: (args.tipo as string) || "reforma",
        p_classificacao: (args.classificacao as string) || "simples",
        p_descricao: (args.descricao as string) || null,
      });
      if (error) { console.error("criar_obra error:", error); return { result: `Erro ao criar obra: ${error.message}` }; }
      return {
        result: `✅ Obra "${args.nome}" criada com sucesso! ID: ${data}`,
        acoes: [
          { label: "🏗️ Ver obra", route: `/obras/${data}` },
          { label: "📋 Ver etapas", route: "/etapas" },
        ],
      };
    }

    case "criar_gasto": {
      const tipo = (args.tipo as string) || "despesa";
      const { error } = await supabaseAdmin.from("financeiro").insert({
        obra_id: args.obra_id as string,
        descricao: args.descricao as string,
        valor: args.valor as number,
        tipo,
        user_id: userId,
        data_transacao: new Date().toISOString().split("T")[0],
      });
      if (error) { console.error("criar_gasto error:", error); return { result: `Erro ao registrar: ${error.message}` }; }
      return {
        result: `✅ ${tipo === "despesa" ? "Gasto" : tipo} de R$ ${(args.valor as number).toFixed(2)} registrado: "${args.descricao}"`,
        acoes: [{ label: "💰 Ver financeiro", route: "/financeiro" }],
      };
    }

    case "criar_etapa": {
      const { data: maxOrdem } = await supabaseAdmin
        .from("obra_fases").select("ordem").eq("obra_id", args.obra_id as string)
        .order("ordem", { ascending: false }).limit(1).single();

      const { error } = await supabaseAdmin.from("obra_fases").insert({
        obra_id: args.obra_id as string,
        nome: args.nome as string,
        ordem: (maxOrdem?.ordem || 0) + 1,
        status: "pendente",
        progresso: 0,
      });
      if (error) { console.error("criar_etapa error:", error); return { result: `Erro ao criar etapa: ${error.message}` }; }
      return {
        result: `✅ Etapa "${args.nome}" criada com sucesso!`,
        acoes: [{ label: "📋 Ver etapas", route: "/etapas" }],
      };
    }

    case "criar_compra": {
      const qty = (args.quantidade as number) || 1;
      const unitPrice = (args.valor_unitario as number) || 0;
      const total = (args.valor_total as number) || (qty * unitPrice);
      const status = (args.status as string) || "pendente";

      const { error } = await supabaseAdmin.from("compras").insert({
        obra_id: args.obra_id as string,
        descricao: args.descricao as string,
        quantidade: qty,
        valor_unitario: unitPrice,
        valor_total: total,
        status,
        user_id: userId,
      });
      if (error) { console.error("criar_compra error:", error); return { result: `Erro ao registrar compra: ${error.message}` }; }

      // If status is "comprado", also register in financeiro
      if (status === "comprado" && total > 0) {
        await supabaseAdmin.from("financeiro").insert({
          obra_id: args.obra_id as string,
          descricao: `Compra: ${args.descricao}`,
          valor: total,
          tipo: "despesa",
          user_id: userId,
          data_transacao: new Date().toISOString().split("T")[0],
        });
      }

      return {
        result: `✅ Compra registrada: "${args.descricao}" — ${qty}x R$ ${unitPrice.toFixed(2)} = R$ ${total.toFixed(2)} (${status})`,
        acoes: [{ label: "🛒 Ver compras", route: "/compras" }],
      };
    }

    case "criar_fornecedor": {
      const { error } = await supabaseAdmin.from("fornecedores").insert({
        nome: args.nome as string,
        email: (args.email as string) || null,
        telefone: (args.telefone as string) || null,
        cnpj: (args.cnpj as string) || null,
        categoria: (args.categoria as string) || null,
        tipo: (args.tipo as string) || null,
        user_id: userId,
        status: "ativo",
      });
      if (error) { console.error("criar_fornecedor error:", error); return { result: `Erro ao cadastrar fornecedor: ${error.message}` }; }
      return {
        result: `✅ Fornecedor "${args.nome}" cadastrado com sucesso!`,
        acoes: [{ label: "👷 Ver fornecedores", route: "/fornecedores" }],
      };
    }

    // === READ ===
    case "status_obra": {
      const obraId = args.obra_id as string;
      const [obraRes, fasesRes, finRes] = await Promise.all([
        supabaseAdmin.from("obras").select("nome, status, valor_previsto").eq("id", obraId).single(),
        supabaseAdmin.from("obra_fases").select("nome, status, progresso").eq("obra_id", obraId).order("ordem"),
        supabaseAdmin.from("financeiro").select("valor, tipo").eq("obra_id", obraId),
      ]);

      if (obraRes.error) return { result: "Não encontrei registros desta obra." };

      const obra = obraRes.data;
      const fases = fasesRes.data || [];
      const financeiro = finRes.data || [];
      const totalGasto = financeiro.filter((f: any) => f.tipo === "despesa").reduce((s: number, f: any) => s + f.valor, 0);
      const progressoGeral = fases.length ? Math.round(fases.reduce((s: number, f: any) => s + (f.progresso || 0), 0) / fases.length) : 0;
      const fasesResumo = fases.map((f: any) => `- ${f.nome}: ${f.status} (${f.progresso || 0}%)`).join("\n");

      return {
        result: `**${obra.nome}** — ${obra.status || "em andamento"}\n\n📊 Progresso: **${progressoGeral}%**\n💰 Orçamento: R$ ${(obra.valor_previsto || 0).toFixed(2)}\n💸 Gasto: R$ ${totalGasto.toFixed(2)}\n\n**Etapas:**\n${fasesResumo || "Nenhuma etapa cadastrada."}`,
        acoes: [
          { label: "📊 Dashboard", route: "/dashboard" },
          { label: "📋 Etapas", route: "/etapas" },
          { label: "💰 Financeiro", route: "/financeiro" },
        ],
      };
    }

    case "consultar_financeiro": {
      const obraId = args.obra_id as string;
      const { data, error } = await supabaseAdmin
        .from("financeiro")
        .select("descricao, valor, tipo, data_transacao")
        .eq("obra_id", obraId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) { console.error("consultar_financeiro error:", error); return { result: `Erro: ${error.message}` }; }

      const registros = data || [];
      const despesas = registros.filter((r: any) => r.tipo === "despesa").reduce((s: number, r: any) => s + (r.valor || 0), 0);
      const receitas = registros.filter((r: any) => r.tipo === "receita").reduce((s: number, r: any) => s + (r.valor || 0), 0);
      const outros = registros.filter((r: any) => !["despesa", "receita"].includes(r.tipo)).reduce((s: number, r: any) => s + (r.valor || 0), 0);

      // Get obra budget
      const { data: obraData } = await supabaseAdmin.from("obras").select("valor_previsto, nome").eq("id", obraId).single();
      const orcamento = obraData?.valor_previsto || 0;
      const saldo = orcamento - despesas;

      const lista = registros.slice(0, 15).map((r: any) =>
        `- ${r.descricao || r.tipo}: R$ ${Number(r.valor).toFixed(2)} (${r.tipo}) — ${r.data_transacao || "s/d"}`
      ).join("\n");

      return {
        result: `💰 **Resumo Financeiro${obraData ? ` — ${obraData.nome}` : ""}**\n\nOrçamento: R$ ${orcamento.toFixed(2)}\nTotal despesas: R$ ${despesas.toFixed(2)}\nTotal receitas: R$ ${receitas.toFixed(2)}\n${outros > 0 ? `Outros: R$ ${outros.toFixed(2)}\n` : ""}**Saldo: R$ ${saldo.toFixed(2)}**\n\n📋 Últimas movimentações:\n${lista || "Nenhuma movimentação."}`,
        acoes: [{ label: "💰 Ver financeiro", route: "/financeiro" }],
      };
    }

    case "consultar_compras": {
      const obraId = args.obra_id as string;
      let query = supabaseAdmin
        .from("compras")
        .select("descricao, quantidade, valor_total, status, created_at")
        .eq("obra_id", obraId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (args.status) query = query.eq("status", args.status as string);

      const { data, error } = await query;
      if (error) { console.error("consultar_compras error:", error); return { result: `Erro: ${error.message}` }; }

      const compras = data || [];
      const pendentes = compras.filter((c: any) => c.status === "pendente");
      const compradas = compras.filter((c: any) => c.status === "comprado");
      const totalPendente = pendentes.reduce((s: number, c: any) => s + (c.valor_total || 0), 0);

      const lista = compras.map((c: any) =>
        `- ${c.descricao || "Compra"}: ${c.quantidade || 1}x — R$ ${Number(c.valor_total || 0).toFixed(2)} (${c.status})`
      ).join("\n");

      return {
        result: `🛒 **Compras** (${compras.length} registros)\n\nPendentes: ${pendentes.length} — R$ ${totalPendente.toFixed(2)}\nCompradas: ${compradas.length}\n\n${lista || "Nenhuma compra registrada."}`,
        acoes: [{ label: "🛒 Ver compras", route: "/compras" }],
      };
    }

    case "consultar_cotacoes": {
      const obraId = args.obra_id as string;
      const { data, error } = await supabaseAdmin
        .from("cotacoes")
        .select("descricao, status, created_at")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) { console.error("consultar_cotacoes error:", error); return { result: `Erro: ${error.message}` }; }

      const cotacoes = data || [];
      const abertas = cotacoes.filter((c: any) => !["finalizada", "cancelada"].includes(c.status));

      const lista = cotacoes.map((c: any) => `- ${c.descricao}: ${c.status}`).join("\n");

      return {
        result: `📋 **Cotações** (${cotacoes.length} total, ${abertas.length} abertas)\n\n${lista || "Nenhuma cotação."}`,
        acoes: [{ label: "📋 Ver cotações", route: "/cotacoes" }],
      };
    }

    case "consultar_documentos": {
      const obraId = args.obra_id as string;
      const { data, error } = await supabaseAdmin
        .from("documentos")
        .select("nome, tipo, tamanho_bytes, created_at")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) { console.error("consultar_documentos error:", error); return { result: `Erro: ${error.message}` }; }

      const docs = data || [];
      const lista = docs.map((d: any) => {
        const size = d.tamanho_bytes ? `${(d.tamanho_bytes / 1024).toFixed(0)}KB` : "";
        return `- ${d.nome} (${d.tipo || "arquivo"}) ${size}`;
      }).join("\n");

      return {
        result: `📄 **Documentos** (${docs.length})\n\n${lista || "Nenhum documento."}`,
        acoes: [{ label: "📄 Ver documentos", route: "/documentos" }],
      };
    }

    case "consultar_fornecedores": {
      let query = supabaseAdmin
        .from("fornecedores")
        .select("nome, email, telefone, categoria, status, score")
        .eq("user_id", userId)
        .order("nome")
        .limit(30);

      if (args.categoria) query = query.ilike("categoria", `%${args.categoria}%`);
      if (args.status) query = query.eq("status", args.status as string);

      const { data, error } = await query;
      if (error) { console.error("consultar_fornecedores error:", error); return { result: `Erro: ${error.message}` }; }

      const fornecedores = data || [];
      const lista = fornecedores.map((f: any) =>
        `- **${f.nome}** — ${f.categoria || "sem categoria"} | ${f.status} | ${f.email || ""} ${f.telefone || ""}`
      ).join("\n");

      return {
        result: `👷 **Fornecedores** (${fornecedores.length})\n\n${lista || "Nenhum fornecedor cadastrado."}`,
        acoes: [{ label: "👷 Ver fornecedores", route: "/fornecedores" }],
      };
    }

    case "consultar_produtos": {
      const { data, error } = await supabaseAdmin
        .from("produtos")
        .select("nome, unidade")
        .eq("user_id", userId)
        .order("nome")
        .limit(50);

      if (error) { console.error("consultar_produtos error:", error); return { result: `Erro: ${error.message}` }; }

      const produtos = data || [];
      const lista = produtos.map((p: any) => `- ${p.nome} (${p.unidade || "un"})`).join("\n");

      return {
        result: `📦 **Produtos** (${produtos.length})\n\n${lista || "Nenhum produto cadastrado."}`,
        acoes: [{ label: "📦 Ver produtos", route: "/produtos" }],
      };
    }

    // === UPDATE ===
    case "atualizar_etapa": {
      const obraId = args.obra_id as string;
      const nomeEtapa = args.nome_etapa as string;

      // Find the etapa by name
      const { data: fases } = await supabaseAdmin
        .from("obra_fases")
        .select("id, nome, status, progresso")
        .eq("obra_id", obraId)
        .ilike("nome", `%${nomeEtapa}%`)
        .limit(1)
        .single();

      if (!fases) return { result: `Etapa "${nomeEtapa}" não encontrada nesta obra.` };

      const updates: Record<string, unknown> = {};
      if (args.status) {
        updates.status = args.status;
        if (args.status === "concluido") updates.progresso = 100;
        if (args.status === "pendente") updates.progresso = 0;
      }
      if (args.progresso !== undefined) updates.progresso = args.progresso;

      const { error } = await supabaseAdmin
        .from("obra_fases")
        .update(updates)
        .eq("id", fases.id);

      if (error) { console.error("atualizar_etapa error:", error); return { result: `Erro ao atualizar etapa: ${error.message}` }; }

      return {
        result: `✅ Etapa "${fases.nome}" atualizada: ${args.status ? `status → ${args.status}` : ""}${args.progresso !== undefined ? ` progresso → ${args.progresso}%` : ""}`,
        acoes: [{ label: "📋 Ver etapas", route: "/etapas" }],
      };
    }

    case "atualizar_obra": {
      const obraId = args.obra_id as string;
      const updates: Record<string, unknown> = {};
      if (args.status) updates.status = args.status;
      if (args.valor_previsto) updates.valor_previsto = args.valor_previsto;
      if (args.data_inicio) updates.data_inicio = args.data_inicio;
      if (args.data_prevista_conclusao) updates.data_prevista_conclusao = args.data_prevista_conclusao;

      if (Object.keys(updates).length === 0) return { result: "Nenhum campo para atualizar foi informado." };

      const { error } = await supabaseAdmin.from("obras").update(updates).eq("id", obraId).eq("user_id", userId);
      if (error) { console.error("atualizar_obra error:", error); return { result: `Erro ao atualizar obra: ${error.message}` }; }

      const campos = Object.entries(updates).map(([k, v]) => `${k} → ${v}`).join(", ");
      return {
        result: `✅ Obra atualizada: ${campos}`,
        acoes: [{ label: "🏗️ Ver obra", route: `/obras/${obraId}` }],
      };
    }

    case "atualizar_compra": {
      const obraId = args.obra_id as string;
      const descricao = args.descricao_compra as string;
      const novoStatus = args.status as string;

      // Find the compra by description
      const { data: compra } = await supabaseAdmin
        .from("compras")
        .select("id, descricao, valor_total")
        .eq("obra_id", obraId)
        .eq("user_id", userId)
        .ilike("descricao", `%${descricao}%`)
        .limit(1)
        .single();

      if (!compra) return { result: `Compra "${descricao}" não encontrada nesta obra.` };

      const { error } = await supabaseAdmin.from("compras").update({ status: novoStatus }).eq("id", compra.id);
      if (error) { console.error("atualizar_compra error:", error); return { result: `Erro: ${error.message}` }; }

      // If marking as comprado, register in financeiro
      if (novoStatus === "comprado" && compra.valor_total > 0) {
        await supabaseAdmin.from("financeiro").insert({
          obra_id: obraId,
          descricao: `Compra: ${compra.descricao}`,
          valor: compra.valor_total,
          tipo: "despesa",
          user_id: userId,
          data_transacao: new Date().toISOString().split("T")[0],
        });
      }

      return {
        result: `✅ Compra "${compra.descricao}" atualizada para ${novoStatus}${novoStatus === "comprado" ? ` — R$ ${Number(compra.valor_total || 0).toFixed(2)} lançado no financeiro` : ""}`,
        acoes: [{ label: "🛒 Ver compras", route: "/compras" }],
      };
    }

    // === DELETE ===
    case "excluir_gasto": {
      const obraId = args.obra_id as string;
      const descricao = args.descricao as string;

      const { data: gasto } = await supabaseAdmin
        .from("financeiro")
        .select("id, descricao, valor")
        .eq("obra_id", obraId)
        .eq("user_id", userId)
        .ilike("descricao", `%${descricao}%`)
        .limit(1)
        .single();

      if (!gasto) return { result: `Gasto "${descricao}" não encontrado nesta obra.` };

      const { error } = await supabaseAdmin.from("financeiro").delete().eq("id", gasto.id);
      if (error) { console.error("excluir_gasto error:", error); return { result: `Erro: ${error.message}` }; }

      return {
        result: `✅ Gasto removido: "${gasto.descricao}" — R$ ${Number(gasto.valor).toFixed(2)}`,
        acoes: [{ label: "💰 Ver financeiro", route: "/financeiro" }],
      };
    }

    case "excluir_etapa": {
      const obraId = args.obra_id as string;
      const nomeEtapa = args.nome_etapa as string;

      const { data: fase } = await supabaseAdmin
        .from("obra_fases")
        .select("id, nome")
        .eq("obra_id", obraId)
        .ilike("nome", `%${nomeEtapa}%`)
        .limit(1)
        .single();

      if (!fase) return { result: `Etapa "${nomeEtapa}" não encontrada nesta obra.` };

      const { error } = await supabaseAdmin.from("obra_fases").delete().eq("id", fase.id);
      if (error) { console.error("excluir_etapa error:", error); return { result: `Erro: ${error.message}` }; }

      return {
        result: `✅ Etapa "${fase.nome}" removida com sucesso!`,
        acoes: [{ label: "📋 Ver etapas", route: "/etapas" }],
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { mensagem, obra_id, historico = [], anexos = [] } = await req.json();

    if (!mensagem || typeof mensagem !== "string") {
      return new Response(JSON.stringify({ error: "mensagem is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let contextInfo = "";
    if (obra_id) {
      contextInfo = await buildObraContext(obra_id, userId, supabaseAdmin);
    } else {
      contextInfo = "\nNenhuma obra selecionada. Se o usuário perguntar sobre dados específicos de uma obra, peça para selecionar uma obra primeiro.";
    }

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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    if (!choice) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle tool calls (possibly multiple rounds)
    if (choice.finish_reason === "tool_calls" || choice.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      let combinedResponse = "";
      const allAcoes: { label: string; route: string }[] = [];
      const obrasVerificadas = new Map<string, boolean>();

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        let fnArgs: Record<string, unknown>;
        try {
          fnArgs = JSON.parse(tc.function.arguments);
        } catch {
          fnArgs = {};
        }

        // Inject obra_id if tool needs it and user has one active
        if (TOOLS_NEEDING_OBRA_ID.includes(fnName) && !fnArgs.obra_id && obra_id) {
          fnArgs.obra_id = obra_id;
        }

        // Toda ferramenta que opera sobre uma obra precisa ter a posse
        // confirmada aqui — args.obra_id pode ter sido informado pelo
        // próprio LLM/conversa e não pode ser confiado sem checagem,
        // já que executeTool roda com supabaseAdmin (bypassa RLS).
        if (TOOLS_NEEDING_OBRA_ID.includes(fnName)) {
          const obraId = fnArgs.obra_id as string | undefined;
          if (!obraId) {
            combinedResponse += (combinedResponse ? "\n\n" : "") + "Preciso saber de qual obra você está falando. Selecione uma obra e tente novamente.";
            continue;
          }
          let pertence = obrasVerificadas.get(obraId);
          if (pertence === undefined) {
            pertence = await userOwnsObra(obraId, userId, supabaseAdmin);
            obrasVerificadas.set(obraId, pertence);
          }
          if (!pertence) {
            combinedResponse += (combinedResponse ? "\n\n" : "") + "Não encontrei essa obra na sua conta.";
            continue;
          }
        }

        const toolResult = await executeTool(fnName, fnArgs, userId, supabaseAdmin);
        combinedResponse += (combinedResponse ? "\n\n" : "") + toolResult.result;
        if (toolResult.acoes) allAcoes.push(...toolResult.acoes);
      }

      // Follow-up for natural language
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
