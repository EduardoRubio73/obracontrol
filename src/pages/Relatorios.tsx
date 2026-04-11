import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";

const downloadCsv = (filename: string, headers: string[], rows: string[][]) => {
  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Relatorios = () => {
  const [obraId, setObraId] = useState<string>("");

  const { data: obras } = useQuery({
    queryKey: ["relatorios-obras"],
    queryFn: async () => {
      const { data } = await supabase.from("obras").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const exportFinanceiro = async () => {
    if (!obraId) { toast.error("Selecione uma obra"); return; }
    const { data, error } = await supabase
      .from("financeiro")
      .select("data_transacao, tipo, descricao, valor")
      .eq("obra_id", obraId)
      .order("data_transacao");
    if (error) { toast.error(error.message); return; }
    if (!data?.length) { toast.info("Sem dados financeiros"); return; }

    const headers = ["Data", "Tipo", "Descrição", "Valor"];
    const rows = data.map((r) => [
      r.data_transacao ?? "",
      r.tipo ?? "",
      (r.descricao ?? "").replace(/;/g, ","),
      String(r.valor ?? 0),
    ]);
    downloadCsv(`financeiro_${obraId.slice(0, 8)}.csv`, headers, rows);
    toast.success("Exportado!");
  };

  const exportDossie = async () => {
    if (!obraId) { toast.error("Selecione uma obra"); return; }
    const { data, error } = await (supabase
      .from("obra_dossie" as any)
      .select("created_at, tipo, titulo, descricao")
      .eq("obra_id", obraId)
      .order("created_at")) as any;
    if (error) { toast.error(error.message); return; }
    if (!data?.length) { toast.info("Sem dados no dossiê"); return; }

    const headers = ["Data", "Tipo", "Título", "Descrição"];
    const rows = (data as any[]).map((r: any) => [
      r.created_at ?? "",
      r.tipo ?? "",
      (r.titulo ?? "").replace(/;/g, ","),
      (r.descricao ?? "").replace(/;/g, ","),
    ]);
    downloadCsv(`dossie_${obraId.slice(0, 8)}.csv`, headers, rows);
    toast.success("Exportado!");
  };

  const exportFinanceiroPdf = async () => {
    if (!obraId) { toast.error("Selecione uma obra"); return; }
    const obraNome = obras?.find((o) => o.id === obraId)?.nome ?? "Obra";
    const { data, error } = await supabase
      .from("financeiro")
      .select("data_transacao, tipo, descricao, valor")
      .eq("obra_id", obraId)
      .order("data_transacao");
    if (error) { toast.error(error.message); return; }
    if (!data?.length) { toast.info("Sem dados financeiros"); return; }

    // Fetch profile signature
    let sigBase64 = "";
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("assinatura_url").eq("id", user.id).single();
      if (profile?.assinatura_url) {
        try {
          const resp = await fetch(profile.assinatura_url);
          const blob = await resp.blob();
          sigBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch { /* fallback */ }
      }
    }

    const totalDespesa = data.filter((r) => r.tipo === "despesa").reduce((a, r) => a + (r.valor ?? 0), 0);
    const totalReceita = data.filter((r) => r.tipo === "receita").reduce((a, r) => a + (r.valor ?? 0), 0);
    const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Popup bloqueado"); return; }

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Financeiro - ${obraNome}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; }
        .summary div { padding: 12px 16px; border-radius: 8px; background: #f5f5f5; }
        .summary .label { font-size: 12px; color: #666; }
        .summary .val { font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; font-weight: 600; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .despesa { color: #dc2626; }
        .receita { color: #16a34a; }
        .sig-section { margin-top: 60px; width: 250px; text-align: center; }
        .sig-section img { height: 60px; object-fit: contain; margin-bottom: -4px; }
        .sig-section .sig-label { border-top: 1px solid #333; padding-top: 8px; font-size: 12px; color: #666; }
        @media print { body { padding: 20px; } * { box-shadow: none !important; } }
      </style></head><body>
      <h1>Relatório Financeiro</h1>
      <p class="sub">${obraNome} — gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
      <div class="summary">
        <div><span class="label">Total Despesas</span><br><span class="val despesa">${fmt(totalDespesa)}</span></div>
        <div><span class="label">Total Receitas</span><br><span class="val receita">${fmt(totalReceita)}</span></div>
        <div><span class="label">Saldo</span><br><span class="val">${fmt(totalReceita - totalDespesa)}</span></div>
      </div>
      <table>
        <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${data.map((r) => `<tr>
          <td>${r.data_transacao ?? "-"}</td>
          <td class="${r.tipo}">${r.tipo ?? "-"}</td>
          <td>${r.descricao ?? "-"}</td>
          <td style="text-align:right" class="${r.tipo}">${fmt(r.valor ?? 0)}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="sig-section">
        ${sigBase64 ? `<img src="${sigBase64}" alt="Assinatura" />` : `<div style="height:60px"></div>`}
        <div class="sig-label">Assinatura do Responsável</div>
      </div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28">
      <h1 className="text-xl sm:text-2xl font-bold">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecione a obra</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolher obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras?.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6 flex flex-col items-center gap-3 sm:gap-4">
            <FileSpreadsheet className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
            <p className="font-semibold text-sm sm:text-base">Financeiro (CSV)</p>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Exporta todas as transações financeiras da obra
            </p>
            <Button onClick={exportFinanceiro} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex flex-col items-center gap-3 sm:gap-4">
            <FileDown className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" />
            <p className="font-semibold text-sm sm:text-base">Financeiro (PDF)</p>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Gera relatório financeiro pronto para impressão
            </p>
            <Button onClick={exportFinanceiroPdf} className="w-full" variant="destructive">
              <Download className="h-4 w-4 mr-2" /> Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex flex-col items-center gap-3 sm:gap-4">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
            <p className="font-semibold text-sm sm:text-base">Dossiê (CSV)</p>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Exporta a linha do tempo completa da obra
            </p>
            <Button onClick={exportDossie} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
