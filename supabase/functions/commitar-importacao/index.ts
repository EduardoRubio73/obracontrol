import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  preview: z.object({
    source_file: z.string(),
    meta: z.object({
      fornecedor_nome: z.string().nullable(),
      fornecedor_cnpj: z.string().nullable(),
      cidade: z.string().nullable(),
      numero_documento: z.string().nullable(),
    }).passthrough(),
    tipo_documento: z.string(),
    fornecedor_match: z.any().nullable(),
    items: z.array(z.object({
      nome_original: z.string(),
      nome_normalizado: z.string(),
      unidade: z.string(),
      quantidade: z.number(),
      valor: z.number(),
      produto_match: z.any(),
      categoria_sugerida: z.string(),
    })),
  }),
  decisions: z.record(z.string()).default({}),
  fornecedor_decision: z.string().default('auto'), // 'auto' | 'new' | `link:<id>`
  obra_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing auth' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const uid = userData.user.id;

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    const { preview, decisions, fornecedor_decision, obra_id } = parsed.data;
    const { meta, tipo_documento: tipo, fornecedor_match, items } = preview;

    // Validate obra belongs to user
    const { data: obra } = await supabase.from('obras').select('id').eq('id', obra_id).eq('user_id', uid).maybeSingle();
    if (!obra) return json({ error: 'Obra inválida' }, 400);

    // ---- Fornecedor ----
    let fornecedor_id: string | null = null;
    if (fornecedor_decision.startsWith('link:')) {
      const linkedId = fornecedor_decision.slice(5);
      const { data: fOwned } = await supabase.from('fornecedores').select('id').eq('id', linkedId).eq('user_id', uid).maybeSingle();
      if (!fOwned) return json({ error: 'Fornecedor inválido' }, 400);
      fornecedor_id = fOwned.id;
    } else if (fornecedor_decision === 'auto' && fornecedor_match?.match?.id) {
      fornecedor_id = fornecedor_match.match.id;
    } else if (meta.fornecedor_nome) {
      const { data: newF, error } = await supabase.from('fornecedores').insert({
        nome: meta.fornecedor_nome,
        cnpj: meta.fornecedor_cnpj,
        user_id: uid,
      }).select('id').single();
      if (error) return json({ error: 'Erro criando fornecedor', details: error.message }, 400);
      fornecedor_id = newF.id;
    }

    // Preload categorias/unidades
    const [{ data: cats }, { data: uns }] = await Promise.all([
      supabase.from('categorias_produtos').select('id, nome').eq('user_id', uid),
      supabase.from('unidades_medida').select('id, nome').eq('user_id', uid),
    ]);
    const catMap = new Map((cats || []).map(c => [c.nome, c.id]));
    const unSet = new Set((uns || []).map(u => u.nome));

    const getOrCreateCategoria = async (nome: string): Promise<string> => {
      const existing = catMap.get(nome);
      if (existing) return existing;
      const { data, error } = await supabase.from('categorias_produtos').insert({ nome, user_id: uid }).select('id').single();
      if (error) throw new Error('cat: ' + error.message);
      catMap.set(nome, data.id);
      return data.id;
    };
    const ensureUnidade = async (nome: string) => {
      if (!nome || unSet.has(nome)) return;
      const { error } = await supabase.from('unidades_medida').insert({ nome, user_id: uid });
      if (!error) unSet.add(nome);
    };

    // ---- Cotação bootstrap ----
    let cotacao_id: string | null = null;
    let proposta_id: string | null = null;
    if (tipo === 'cotacao') {
      const { data: cot, error: e1 } = await supabase.from('cotacoes').insert({
        obra_id, descricao: `Cotação ${meta.numero_documento || preview.source_file}`,
        status: 'rascunho',
      }).select('id').single();
      if (e1) return json({ error: 'Erro criando cotação', details: e1.message }, 400);
      cotacao_id = cot.id;
      if (fornecedor_id) {
        await supabase.from('cotacao_fornecedores').insert({ cotacao_id, fornecedor_id, status: 'pendente' });
        const total = items.reduce((s, i) => s + i.valor * i.quantidade, 0);
        const { data: prop, error: e2 } = await supabase.from('propostas').insert({
          cotacao_id, fornecedor_id, valor: total, status: 'recebida',
        }).select('id').single();
        if (e2) return json({ error: 'Erro criando proposta', details: e2.message }, 400);
        proposta_id = prop.id;
      }
    }

    // ---- Items ----
    const localCache = new Map<string, string>();
    const created = { produtos: 0, compras: 0, itens: 0 };

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const decision = decisions[String(idx)];
      const pm = item.produto_match;
      const cacheKey = `${item.nome_normalizado}|${item.unidade}`;

      let produto_id: string | null = null;
      if (localCache.has(cacheKey)) {
        produto_id = localCache.get(cacheKey)!;
      } else if (decision?.startsWith('link:')) {
        const linkedId = decision.slice(5);
        const { data: pOwned } = await supabase.from('produtos').select('id').eq('id', linkedId).eq('user_id', uid).maybeSingle();
        if (!pOwned) return json({ error: `Produto inválido para "${item.nome_original}"` }, 400);
        produto_id = pOwned.id;
      } else if (decision === 'new' || !pm?.match) {
        await ensureUnidade(item.unidade);
        const cat_id = await getOrCreateCategoria(item.categoria_sugerida);
        const { data: newP, error } = await supabase.from('produtos').insert({
          nome: item.nome_original, unidade: item.unidade, categoria_id: cat_id, user_id: uid,
        }).select('id').single();
        if (error) return json({ error: `Erro criando produto "${item.nome_original}"`, details: error.message }, 400);
        produto_id = newP.id;
        created.produtos++;
      } else {
        produto_id = pm.match.id;
      }
      localCache.set(cacheKey, produto_id!);

      if (tipo === 'cotacao' && cotacao_id) {
        await supabase.from('itens_cotacao').insert({
          cotacao_id, nome: item.nome_original, quantidade: item.quantidade, unidade: item.unidade,
        });
        if (proposta_id) {
          await supabase.from('proposta_itens').insert({
            proposta_id, nome: item.nome_original, quantidade: item.quantidade, valor_unitario: item.valor,
          });
        }
        created.itens++;
      } else {
        const { error } = await supabase.from('compras').insert({
          obra_id, fornecedor_id, produto_id,
          descricao: item.nome_original,
          quantidade: item.quantidade,
          valor_unitario: item.valor,
          valor_total: item.valor * item.quantidade,
          user_id: uid,
          status: 'pendente',
          observacao: `Importado de ${preview.source_file}`,
        });
        if (error) return json({ error: `Erro criando compra`, details: error.message }, 400);
        created.compras++;
      }
    }

    return json({ ok: true, tipo, cotacao_id, fornecedor_id, created });
  } catch (e) {
    console.error('commitar-importacao error:', e);
    return json({ error: 'Falha ao commitar', details: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
