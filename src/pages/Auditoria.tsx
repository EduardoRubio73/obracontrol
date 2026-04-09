import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Shield } from "lucide-react";

const acaoColor: Record<string, string> = {
  INSERT: "bg-success/10 text-success",
  UPDATE: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
};

const Auditoria = () => {
  const [tabela, setTabela] = useState<string>("todas");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["auditoria", tabela],
    queryFn: async () => {
      let q = supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (tabela !== "todas") q = q.eq("tabela", tabela);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const tabelas = ["todas", "obras", "obra_fases", "fase_itens", "financeiro", "fornecedores", "cotacoes", "propostas"];

  return (
    <div className="w-full max-w-screen-xl mx-auto space-y-4 sm:space-y-6 px-4 pb-24">
      <h1 className="text-xl sm:text-2xl font-bold">Auditoria</h1>

      <div className="flex gap-3 flex-wrap">
        <Select value={tabela} onValueChange={setTabela}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar tabela" />
          </SelectTrigger>
          <SelectContent>
            {tabelas.map((t) => (
              <SelectItem key={t} value={t}>{t === "todas" ? "Todas as tabelas" : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum registro de auditoria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="rounded-xl">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{log.tabela}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.created_at ? format(new Date(log.created_at), "dd/MM/yy HH:mm") : "—"}
                  </p>
                </div>
                <Badge variant="secondary" className={`shrink-0 ${acaoColor[log.acao ?? ""] ?? ""}`}>
                  {log.acao}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Auditoria;
