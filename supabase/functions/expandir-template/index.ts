import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  obra_id: z.string().uuid(),
  template_id: z.string().uuid(),
});

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    const { obra_id, template_id } = parsed.data;

    // Validate obra belongs to user
    const { data: obra, error: obraErr } = await supabase
      .from('obras')
      .select('id')
      .eq('id', obra_id)
      .eq('user_id', uid)
      .maybeSingle();

    if (obraErr || !obra) return json({ error: 'Obra not found or unauthorized' }, 404);

    // Fetch template with all related data
    const { data: template, error: templateErr } = await supabase
      .from('catalogo_templates')
      .select(
        `
        id,
        nome,
        catalogo_template_servicos(
          servico_id,
          ambiente_id,
          ordem,
          obrigatorio,
          catalogo_servicos(
            id,
            nome,
            descricao,
            catalogo_servico_etapas(
              id,
              nome,
              ordem,
              tempo_medio_dias,
              catalogo_etapa_tarefas(
                id,
                nome,
                descricao,
                ordem,
                criterios_qualidade
              )
            ),
            catalogo_servico_insumos_padrao(
              id,
              nome_insumo,
              unidade,
              quantidade_sugerida,
              perda_percentual
            )
          )
        )
      `
      )
      .eq('id', template_id)
      .maybeSingle();

    if (templateErr || !template) return json({ error: 'Template not found' }, 404);

    const obraServicos: any[] = [];
    const obraFases: any[] = [];
    const faseItens: any[] = [];
    const obraInsumos: any[] = [];

    // Process each service in template
    for (const ts of template.catalogo_template_servicos || []) {
      const servico = ts.catalogo_servicos;
      if (!servico) continue;

      // Create obra_servicos record
      const { data: novaObraServico, error: obraServicoErr } = await supabase
        .from('obra_servicos')
        .insert({
          obra_id,
          catalogo_servico_id: servico.id,
          ambiente_id: ts.ambiente_id,
          nome: servico.nome,
          ordem: ts.ordem || 0,
          status: 'pendente',
        })
        .select('id')
        .single();

      if (obraServicoErr) throw new Error(`Erro criando obra_servico: ${obraServicoErr.message}`);

      const obraServicoId = novaObraServico.id;
      obraServicos.push(novaObraServico);

      // Process stages (etapas)
      const etapas = servico.catalogo_servico_etapas || [];
      for (const etapa of etapas) {
        // Create obra_fases
        const { data: novaObraFase, error: obraFaseErr } = await supabase
          .from('obra_fases')
          .insert({
            obra_id,
            nome: etapa.nome,
            ordem: etapa.ordem || 0,
            status: 'pendente',
            obra_servico_id: obraServicoId,
            catalogo_etapa_id: etapa.id,
          })
          .select('id')
          .single();

        if (obraFaseErr) throw new Error(`Erro criando obra_fases: ${obraFaseErr.message}`);

        const obraFaseId = novaObraFase.id;
        obraFases.push(novaObraFase);

        // Process tasks (tarefas)
        const tarefas = etapa.catalogo_etapa_tarefas || [];
        for (const tarefa of tarefas) {
          const { data: novaFaseItem, error: faseItemErr } = await supabase
            .from('fase_itens')
            .insert({
              fase_id: obraFaseId,
              nome: tarefa.nome,
              descricao: tarefa.descricao,
              ordem: tarefa.ordem || 0,
              status: 'pendente',
              catalogo_tarefa_id: tarefa.id,
            })
            .select('id')
            .single();

          if (faseItemErr) throw new Error(`Erro criando fase_itens: ${faseItemErr.message}`);

          faseItens.push(novaFaseItem);
        }
      }

      // Process inputs (insumos)
      const insumos = servico.catalogo_servico_insumos_padrao || [];
      for (const insumo of insumos) {
        const { error: insumoErr } = await supabase
          .from('obra_servico_insumos')
          .insert({
            obra_servico_id: obraServicoId,
            nome_insumo: insumo.nome_insumo,
            unidade: insumo.unidade,
            quantidade_sugerida: insumo.quantidade_sugerida,
            perda_percentual: insumo.perda_percentual || 0,
          });

        if (insumoErr) throw new Error(`Erro criando obra_servico_insumos: ${insumoErr.message}`);
      }
    }

    return json({
      success: true,
      obra_id,
      template_id,
      obraServicos: obraServicos.length,
      obraFases: obraFases.length,
      faseItens: faseItens.length,
      message: `Template expandido com sucesso: ${obraServicos.length} serviços, ${obraFases.length} fases, ${faseItens.length} tarefas`,
    });
  } catch (error) {
    console.error('expandir-template error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
