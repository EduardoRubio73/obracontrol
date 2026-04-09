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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

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

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <p className="font-semibold">Financeiro (CSV)</p>
            <p className="text-sm text-muted-foreground text-center">
              Exporta todas as transações financeiras da obra
            </p>
            <Button onClick={exportFinanceiro} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <FileText className="h-12 w-12 text-primary" />
            <p className="font-semibold">Dossiê (CSV)</p>
            <p className="text-sm text-muted-foreground text-center">
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
