import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, FileDown, ArrowRight } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { generatePdfFromHtml, downloadPdfBlob, toBase64 } from "@/lib/pdf";

const fmt = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("pt-BR") : "-");

const pdfShell = (title: string, obraNome: string, bodyHtml: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - ${obraNome}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin: 24px 0 8px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    @media print { body { padding: 20px; } * { box-shadow: none !important; } }
  </style></head><body>
  <h1>${title}</h1>
  <p class="sub">${obraNome} — gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
  ${bodyHtml}
  </body></html>`;

function GerencialTab({ obraId, obraNome, fases }: { obraId: string; obraNome: string; fases?: { id: string; nome: string }[] }) {
  const faseIds = fases?.map((f) => f.id) ?? [];

  const { data: previsao, isLoading } = useQuery({
    queryKey: ["relatorio-gerencial-previsao", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_fases_previsao").select("*").eq("obra_id", obraId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: eficiencia } = useQuery({
    queryKey: ["relatorio-gerencial-eficiencia", obraId, faseIds.join(",")],
    enabled: faseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_fase_eficiencia").select("*").in("id", faseIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (fases ?? []).map((f) => {
    const p = previsao?.find((x) => x.id === f.id);
    const e = eficiencia?.find((x) => x.id === f.id);
    return {
      id: f.id,
      nome: f.nome,
      status: p?.status ?? "-",
      progresso: p?.progresso ?? 0,
      progressoEsperado: p?.progresso_esperado ?? 0,
      atrasado: p?.atrasado ?? false,
      diasDecorridos: p?.dias_decorridos ?? 0,
      diasPlanejados: p?.dias_planejados ?? 0,
      previsto: e?.previsto ?? 0,
      real: e?.real ?? 0,
      eficiencia: e?.eficiencia_percentual ?? 0,
    };
  });

  const exportCsv = () => {
    if (!rows.length) { toast.info("Sem dados de etapas"); return; }
    downloadCsv(
      `gerencial_${obraId.slice(0, 8)}.csv`,
      ["Fase", "Status", "Progresso (%)", "Progresso Esperado (%)", "Atrasado", "Dias Decorridos", "Dias Planejados", "Previsto", "Real", "Eficiência (%)"],
      rows.map((r) => [r.nome, r.status, String(r.progresso), String(r.progressoEsperado), r.atrasado ? "Sim" : "Não", String(r.diasDecorridos), String(r.diasPlanejados), String(r.previsto), String(r.real), String(r.eficiencia)]),
    );
    toast.success("Exportado!");
  };

  const exportPdf = async () => {
    if (!rows.length) { toast.info("Sem dados de etapas"); return; }
    const body = `<table><thead><tr><th>Fase</th><th>Status</th><th>Progresso</th><th>Esperado</th><th>Atrasado</th><th>Previsto</th><th>Real</th><th>Eficiência</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.nome}</td><td>${r.status}</td><td>${r.progresso}%</td><td>${r.progressoEsperado}%</td><td>${r.atrasado ? "Sim" : "Não"}</td><td>${fmt(r.previsto)}</td><td>${fmt(r.real)}</td><td>${r.eficiencia}%</td></tr>`).join("")}</tbody></table>`;
    const filename = `gerencial_${obraId.slice(0, 8)}.pdf`;
    const blob = await generatePdfFromHtml(pdfShell("Relatório Gerencial", obraNome, body), filename);
    if (!blob) { toast.error("Erro ao gerar PDF"); return; }
    downloadPdfBlob(blob, filename);
    toast.success("PDF gerado!");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Progresso e eficiência por etapa</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma etapa cadastrada</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Esperado</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead>Real</TableHead>
                <TableHead>Eficiência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.progresso}%{r.atrasado && <Badge variant="destructive" className="ml-2 text-[10px]">Atrasado</Badge>}
                  </TableCell>
                  <TableCell>{r.progressoEsperado}%</TableCell>
                  <TableCell>{fmt(r.previsto)}</TableCell>
                  <TableCell>{fmt(r.real)}</TableCell>
                  <TableCell>{r.eficiencia}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MateriaisTab({ obraId, obraNome, faseIds, fases }: { obraId: string; obraNome: string; faseIds: string[]; fases?: { id: string; nome: string }[] }) {
  const { data: itens, isLoading: loadingItens } = useQuery({
    queryKey: ["relatorio-materiais-itens", obraId, faseIds.join(",")],
    enabled: faseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("fase_itens").select("*").in("fase_id", faseIds).order("executar_em");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: compras, isLoading: loadingCompras } = useQuery({
    queryKey: ["relatorio-materiais-compras", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("id, descricao, status, quantidade, valor_unitario, valor_total, created_at, produtos(nome), fornecedores(nome)")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const getFaseName = (faseId: string) => fases?.find((f) => f.id === faseId)?.nome ?? "-";

  const exportItensCsv = () => {
    if (!itens?.length) { toast.info("Sem itens planejados"); return; }
    downloadCsv(
      `materiais_itens_${obraId.slice(0, 8)}.csv`,
      ["Fase", "Item", "Status", "Previsto", "Real", "Executar em"],
      itens.map((i) => [getFaseName(i.fase_id), i.nome ?? "", i.status ?? "", String(i.valor_previsto ?? 0), String(i.valor_real ?? 0), i.executar_em ?? ""]),
    );
    toast.success("Exportado!");
  };

  const exportComprasCsv = () => {
    if (!compras?.length) { toast.info("Sem compras registradas"); return; }
    downloadCsv(
      `materiais_compras_${obraId.slice(0, 8)}.csv`,
      ["Data", "Produto", "Fornecedor", "Descrição", "Quantidade", "Valor Unit.", "Valor Total", "Status"],
      compras.map((c) => [
        fmtDate(c.created_at),
        c.produtos?.nome ?? "",
        c.fornecedores?.nome ?? "",
        (c.descricao ?? "").replace(/;/g, ","),
        String(c.quantidade ?? 0),
        String(c.valor_unitario ?? 0),
        String(c.valor_total ?? 0),
        c.status ?? "",
      ]),
    );
    toast.success("Exportado!");
  };

  const exportPdf = async () => {
    if (!itens?.length && !compras?.length) { toast.info("Sem dados de materiais"); return; }
    const itensTable = itens?.length
      ? `<h2>Itens planejados por fase</h2><table><thead><tr><th>Fase</th><th>Item</th><th>Status</th><th>Previsto</th><th>Real</th></tr></thead>
        <tbody>${itens.map((i) => `<tr><td>${getFaseName(i.fase_id)}</td><td>${i.nome}</td><td>${i.status ?? "-"}</td><td>${fmt(i.valor_previsto)}</td><td>${fmt(i.valor_real)}</td></tr>`).join("")}</tbody></table>`
      : "";
    const comprasTable = compras?.length
      ? `<h2>Compras registradas</h2><table><thead><tr><th>Data</th><th>Produto</th><th>Fornecedor</th><th>Qtd</th><th>Valor Total</th><th>Status</th></tr></thead>
        <tbody>${compras.map((c) => `<tr><td>${fmtDate(c.created_at)}</td><td>${c.produtos?.nome ?? "-"}</td><td>${c.fornecedores?.nome ?? "-"}</td><td>${c.quantidade ?? 0}</td><td>${fmt(c.valor_total)}</td><td>${c.status ?? "-"}</td></tr>`).join("")}</tbody></table>`
      : "";
    const filename = `materiais_${obraId.slice(0, 8)}.pdf`;
    const blob = await generatePdfFromHtml(pdfShell("Relatório de Materiais", obraNome, itensTable + comprasTable), filename);
    if (!blob) { toast.error("Erro ao gerar PDF"); return; }
    downloadPdfBlob(blob, filename);
    toast.success("PDF gerado!");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Itens planejados por fase</CardTitle>
          <Button size="sm" variant="outline" onClick={exportItensCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </CardHeader>
        <CardContent>
          {loadingItens ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : !itens?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Fase</TableHead><TableHead>Item</TableHead><TableHead>Status</TableHead><TableHead>Previsto</TableHead><TableHead>Real</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{getFaseName(i.fase_id)}</TableCell>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                    <TableCell>{fmt(i.valor_previsto)}</TableCell>
                    <TableCell>{fmt(i.valor_real)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Compras registradas</CardTitle>
          <Button size="sm" variant="outline" onClick={exportComprasCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingCompras ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : !compras?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma compra registrada</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Fornecedor</TableHead><TableHead>Qtd</TableHead><TableHead>Valor Total</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {compras.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{fmtDate(c.created_at)}</TableCell>
                      <TableCell>{c.produtos?.nome ?? "-"}</TableCell>
                      <TableCell>{c.fornecedores?.nome ?? "-"}</TableCell>
                      <TableCell>{c.quantidade}</TableCell>
                      <TableCell>{fmt(c.valor_total)}</TableCell>
                      <TableCell><Badge variant={c.status === "comprado" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground pt-2">Compras pendentes ainda não aparecem no relatório Financeiro.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={exportPdf}>
        <FileDown className="h-4 w-4 mr-2" /> Gerar PDF combinado
      </Button>
    </div>
  );
}

function FinanceiroTab({ obraId, obraNome, userId }: { obraId: string; obraNome: string; userId?: string }) {
  const { data: resumo } = useQuery({
    queryKey: ["relatorio-resumo-financeiro", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_resumo_financeiro").select("*").eq("id", obraId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["relatorio-financeiro-transacoes", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("financeiro").select("id, data_transacao, tipo, descricao, valor").eq("obra_id", obraId).order("data_transacao");
      if (error) throw error;
      return data ?? [];
    },
  });

  const exportCsv = () => {
    if (!transacoes?.length) { toast.info("Sem dados financeiros"); return; }
    downloadCsv(
      `financeiro_${obraId.slice(0, 8)}.csv`,
      ["Data", "Tipo", "Descrição", "Valor"],
      transacoes.map((r) => [r.data_transacao ?? "", r.tipo ?? "", (r.descricao ?? "").replace(/;/g, ","), String(r.valor ?? 0)]),
    );
    toast.success("Exportado!");
  };

  const exportPdf = async () => {
    if (!transacoes?.length) { toast.info("Sem dados financeiros"); return; }
    let sigBase64 = "";
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("assinatura_url").eq("id", userId).single();
      if (profile?.assinatura_url) sigBase64 = await toBase64(profile.assinatura_url);
    }
    const totalDespesa = transacoes.filter((r) => r.tipo === "despesa").reduce((a, r) => a + (r.valor ?? 0), 0);
    const totalReceita = transacoes.filter((r) => r.tipo === "receita").reduce((a, r) => a + (r.valor ?? 0), 0);
    const body = `
      <div style="display:flex;gap:24px;margin-bottom:24px;">
        <div style="padding:12px 16px;border-radius:8px;background:#f5f5f5;"><span style="font-size:12px;color:#666;">Total Despesas</span><br><span style="font-size:18px;font-weight:bold;color:#dc2626;">${fmt(totalDespesa)}</span></div>
        <div style="padding:12px 16px;border-radius:8px;background:#f5f5f5;"><span style="font-size:12px;color:#666;">Total Receitas</span><br><span style="font-size:18px;font-weight:bold;color:#16a34a;">${fmt(totalReceita)}</span></div>
        <div style="padding:12px 16px;border-radius:8px;background:#f5f5f5;"><span style="font-size:12px;color:#666;">Saldo</span><br><span style="font-size:18px;font-weight:bold;">${fmt(totalReceita - totalDespesa)}</span></div>
      </div>
      <table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${transacoes.map((r) => `<tr><td>${fmtDate(r.data_transacao)}</td><td>${r.tipo}</td><td>${r.descricao ?? "-"}</td><td style="text-align:right">${fmt(r.valor)}</td></tr>`).join("")}</tbody></table>
      <div style="margin-top:60px;width:250px;text-align:center;">
        ${sigBase64 ? `<img src="${sigBase64}" alt="Assinatura" style="height:60px;object-fit:contain;margin-bottom:-4px;" />` : `<div style="height:60px"></div>`}
        <div style="border-top:1px solid #333;padding-top:8px;font-size:12px;color:#666;">Assinatura do Responsável</div>
      </div>`;
    const filename = `financeiro_${obraId.slice(0, 8)}.pdf`;
    const blob = await generatePdfFromHtml(pdfShell("Relatório Financeiro", obraNome, body), filename);
    if (!blob) { toast.error("Erro ao gerar PDF"); return; }
    downloadPdfBlob(blob, filename);
    toast.success("PDF gerado!");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-xs text-muted-foreground">Previsto</p><p className="text-sm sm:text-lg font-bold truncate">{fmt(resumo?.valor_previsto)}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-xs text-muted-foreground">Gasto</p><p className="text-sm sm:text-lg font-bold truncate text-destructive">{fmt(resumo?.total_gasto)}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-sm sm:text-lg font-bold truncate ${(resumo?.saldo ?? 0) < 0 ? "text-destructive" : "text-success"}`}>{fmt(resumo?.saldo)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Transações</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : !transacoes?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma transação registrada</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {transacoes.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.data_transacao)}</TableCell>
                    <TableCell><Badge variant={r.tipo === "despesa" ? "destructive" : "default"}>{r.tipo}</Badge></TableCell>
                    <TableCell>{r.descricao ?? "-"}</TableCell>
                    <TableCell className="text-right">{fmt(r.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DossieTab({ obraId }: { obraId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["relatorio-dossie", obraId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("obra_dossie" as any)
        .select("created_at, tipo, titulo, descricao")
        .eq("obra_id", obraId)
        .order("created_at")) as any;
      if (error) throw error;
      return (data ?? []) as { created_at: string; tipo: string; titulo: string; descricao: string }[];
    },
  });

  const exportCsv = () => {
    if (!entries?.length) { toast.info("Sem dados no dossiê"); return; }
    downloadCsv(
      `dossie_${obraId.slice(0, 8)}.csv`,
      ["Data", "Tipo", "Título", "Descrição"],
      entries.map((r) => [r.created_at ?? "", r.tipo ?? "", (r.titulo ?? "").replace(/;/g, ","), (r.descricao ?? "").replace(/;/g, ",")]),
    );
    toast.success("Exportado!");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Eventos do dossiê</CardTitle>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {entries?.length ?? 0} evento(s) registrado(s) no dossiê desta obra.
          </p>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link to={`/obras/${obraId}/dossie`}>
            Ver linha do tempo completa <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RelatoriosContent({ obraId }: { obraId: string }) {
  const { user } = useAuth();
  const { obras } = useObraAtiva();
  const obraNome = obras.find((o) => o.id === obraId)?.nome ?? "Obra";

  const { data: fases } = useQuery({
    queryKey: ["relatorio-fases", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("obra_fases").select("id, nome").eq("obra_id", obraId).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
  const faseIds = fases?.map((f) => f.id) ?? [];

  return (
    <div className="space-y-4 sm:space-y-6 px-1 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28">
      <h1 className="text-xl sm:text-2xl font-bold truncate">
        Relatórios — <span className="text-blue-600 dark:text-blue-400">{obraNome}</span>
      </h1>

      <Tabs defaultValue="gerencial">
        <TabsList className="grid grid-cols-4 w-full h-auto">
          <TabsTrigger value="gerencial" className="text-xs sm:text-sm py-2">📊 Gerencial</TabsTrigger>
          <TabsTrigger value="materiais" className="text-xs sm:text-sm py-2">📦 Materiais</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs sm:text-sm py-2">💰 Financeiro</TabsTrigger>
          <TabsTrigger value="dossie" className="text-xs sm:text-sm py-2">🗂️ Dossiê</TabsTrigger>
        </TabsList>

        <TabsContent value="gerencial">
          <GerencialTab obraId={obraId} obraNome={obraNome} fases={fases} />
        </TabsContent>
        <TabsContent value="materiais">
          <MateriaisTab obraId={obraId} obraNome={obraNome} faseIds={faseIds} fases={fases} />
        </TabsContent>
        <TabsContent value="financeiro">
          <FinanceiroTab obraId={obraId} obraNome={obraNome} userId={user?.id} />
        </TabsContent>
        <TabsContent value="dossie">
          <DossieTab obraId={obraId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Relatorios() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Relatórios">
      {id && <RelatoriosContent obraId={id} />}
    </RequireObra>
  );
}
