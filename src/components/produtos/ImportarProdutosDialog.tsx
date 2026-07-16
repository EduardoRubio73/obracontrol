import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type PreviewMatch = { match: { id: string; nome: string } | null; score: number; decision: "auto" | "review" | "new" };
type PreviewItem = {
  nome_original: string; nome_normalizado: string; unidade: string;
  codigo_origem: string | null; quantidade: number; valor: number;
  produto_match: PreviewMatch; categoria_sugerida: string;
};
type Preview = {
  source_file: string; storage_path: string;
  meta: { fornecedor_nome: string | null; fornecedor_cnpj: string | null; numero_documento: string | null };
  tipo_documento: string; confianca_classificacao: number;
  fornecedor_match: PreviewMatch | null;
  items: PreviewItem[];
};

const ACCEPT = ".csv,.xlsx,.xls,.docx,.pdf,.md,.txt";

export function ImportarProdutosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [fornecedorDecision, setFornecedorDecision] = useState<string>("auto");
  const [obraId, setObraId] = useState<string>("");
  const [committing, setCommitting] = useState(false);

  const { data: obras = [] } = useQuery({
    queryKey: ["obras-select", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("obras").select("id, nome").eq("user_id", user!.id).order("nome");
      return data || [];
    },
    enabled: !!user && open,
  });

  const reset = () => {
    setPreview(null); setDecisions({}); setFornecedorDecision("auto"); setObraId("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo maior que 20 MB");
      return;
    }
    setUploading(true);
    try {
      const path = `imports/${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase.functions.invoke("importar-documento", {
        body: { storage_path: path, filename: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);

      const p = data as Preview;
      if (!p.items?.length) {
        toast.warning("Nenhum item detectado no arquivo. Verifique o formato.");
      }
      setPreview(p);
      // Init decisions: auto = accept match, review/new = force manual choice
      const init: Record<string, string> = {};
      p.items.forEach((it, i) => {
        if (it.produto_match.decision === "auto" && it.produto_match.match) init[String(i)] = `link:${it.produto_match.match.id}`;
        else init[String(i)] = "new";
      });
      setDecisions(init);
      if (p.fornecedor_match?.decision === "auto" && p.fornecedor_match.match) {
        setFornecedorDecision("auto");
      } else {
        setFornecedorDecision("new");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao importar: " + (e.message || String(e)));
    } finally {
      setUploading(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    if (!obraId) { toast.error("Selecione uma obra"); return; }
    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("commitar-importacao", {
        body: { preview, decisions, fornecedor_decision: fornecedorDecision, obra_id: obraId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);
      toast.success(`Importação concluída — ${data.created?.produtos || 0} produtos, ${data.created?.compras || 0} compras, ${data.created?.itens || 0} itens de cotação`);
      qc.invalidateQueries();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gravar: " + (e.message || String(e)));
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {preview ? "Revisar importação" : "Importar documento"}
          </DialogTitle>
        </DialogHeader>

        {!preview && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie pedidos, cotações, ordens de venda ou listas de preços. Formatos aceitos: CSV, XLSX, DOCX, PDF, MD, TXT (máx. 20 MB).
            </p>
            <label
              htmlFor="import-file"
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer hover:bg-muted/40 transition"
            >
              {uploading ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
              <div className="text-center">
                <p className="font-semibold">{uploading ? "Processando..." : "Clique ou arraste um arquivo"}</p>
                <p className="text-xs text-muted-foreground">CSV, XLSX, DOCX, PDF, MD, TXT</p>
              </div>
            </label>
            <input
              id="import-file" type="file" accept={ACCEPT} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              disabled={uploading}
            />
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-4 overflow-hidden flex-1">
            {/* Cabeçalho */}
            <div className="rounded-lg border p-3 space-y-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{preview.tipo_documento}</Badge>
                <span className="text-xs text-muted-foreground">
                  confiança {Math.round(preview.confianca_classificacao * 100)}%
                </span>
                <span className="text-xs text-muted-foreground ml-auto">📄 {preview.source_file}</span>
              </div>

              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground">Fornecedor</label>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{preview.meta.fornecedor_nome || "—"}</span>
                    {preview.meta.fornecedor_cnpj && <Badge variant="outline" className="text-xs">{preview.meta.fornecedor_cnpj}</Badge>}
                  </div>
                  <Select value={fornecedorDecision} onValueChange={setFornecedorDecision}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {preview.fornecedor_match?.match && (
                        <SelectItem value="auto">
                          ✓ Vincular a "{preview.fornecedor_match.match.nome}" ({Math.round(preview.fornecedor_match.score * 100)}%)
                        </SelectItem>
                      )}
                      <SelectItem value="new">➕ Criar novo fornecedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Obra <span className="text-destructive">*</span></label>
                  <Select value={obraId} onValueChange={setObraId}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                    <SelectContent>
                      {obras.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Itens */}
            <ScrollArea className="flex-1 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs sticky top-0">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">Un</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-left p-2">Categoria</th>
                    <th className="text-left p-2 w-64">Decisão</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it, i) => {
                    const m = it.produto_match;
                    const icon = m.decision === "auto" ? <CheckCircle2 className="h-3 w-3 text-success inline" /> :
                                 m.decision === "review" ? <AlertCircle className="h-3 w-3 text-warning inline" /> : null;
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          <div className="font-medium">{it.nome_original}</div>
                          {m.match && <div className="text-xs text-muted-foreground">{icon} match: {m.match.nome} ({Math.round(m.score * 100)}%)</div>}
                        </td>
                        <td className="p-2 text-xs">{it.unidade}</td>
                        <td className="p-2 text-right">{it.quantidade}</td>
                        <td className="p-2 text-right">R$ {it.valor.toFixed(2)}</td>
                        <td className="p-2"><Badge variant="outline" className="text-xs">{it.categoria_sugerida}</Badge></td>
                        <td className="p-2">
                          <Select value={decisions[String(i)] || "new"} onValueChange={(v) => setDecisions(d => ({ ...d, [String(i)]: v }))}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {m.match && <SelectItem value={`link:${m.match.id}`}>✓ Vincular a "{m.match.nome}"</SelectItem>}
                              <SelectItem value="new">➕ Criar novo produto</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex justify-between gap-2 shrink-0">
              <Button variant="outline" onClick={reset} disabled={committing}>← Reenviar arquivo</Button>
              <Button onClick={commit} disabled={committing || !obraId}>
                {committing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar importação ({preview.items.length} itens)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
