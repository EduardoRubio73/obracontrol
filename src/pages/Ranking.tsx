import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getScoreBadge(score: number | null) {
  const s = score ?? 0;
  if (s > 0.8) return { label: "Excelente", className: "bg-green-500/15 text-green-700 border-green-200" };
  if (s > 0.5) return { label: "Bom", className: "bg-blue-500/15 text-blue-700 border-blue-200" };
  if (s > 0.3) return { label: "Regular", className: "bg-orange-500/15 text-orange-700 border-orange-200" };
  return { label: "Ruim", className: "bg-red-500/15 text-red-700 border-red-200" };
}

export default function Ranking() {
  const { data: metricas, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedor_metricas")
        .select("*, fornecedores(nome, email)")
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Ranking de Fornecedores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Classificação por Score</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Carregando...</p>
          ) : !metricas?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <Trophy className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="font-medium">Nenhuma métrica registrada ainda</p>
              <p className="text-sm">As métricas serão calculadas automaticamente conforme os fornecedores participarem das cotações.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Convites</TableHead>
                  <TableHead className="text-center">Respostas</TableHead>
                  <TableHead className="text-center">Vitórias</TableHead>
                  <TableHead className="text-center">Tempo Médio (h)</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="w-36">Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricas.map((m, i) => {
                  const badge = getScoreBadge(m.score);
                  const fornecedor = m.fornecedores as any;
                  return (
                    <TableRow key={m.fornecedor_id}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fornecedor?.nome ?? "—"}</p>
                          {fornecedor?.email && (
                            <p className="text-xs text-muted-foreground">{fornecedor.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{m.total_convites ?? 0}</TableCell>
                      <TableCell className="text-center">{m.total_respostas ?? 0}</TableCell>
                      <TableCell className="text-center">{m.total_vitorias ?? 0}</TableCell>
                      <TableCell className="text-center">
                        {m.tempo_medio_resposta ? Number(m.tempo_medio_resposta).toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold">
                            {((m.score ?? 0) * 100).toFixed(0)}%
                          </span>
                          <Progress value={(m.score ?? 0) * 100} className="h-2 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
