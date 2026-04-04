import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2 } from "lucide-react";

const acaoColors: Record<string, string> = {
  comprar: "bg-primary/10 text-primary",
  revisar: "bg-warning/15 text-warning-foreground",
  renegociar: "bg-destructive/10 text-destructive",
};

const acaoLabel: Record<string, string> = {
  comprar: "Comprar hoje",
  revisar: "Revisar",
  renegociar: "Renegociar",
};

export default function Compras() {
  const { data: compras, isLoading } = useQuery({
    queryKey: ["sugestao-compra"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("vw_sugestao_compra" as any)
        .select("*")
        .neq("acao", "ok")) as any;
      if (error) throw error;
      return data as {
        id: string;
        item: string;
        fase: string;
        acao: string;
        valor_previsto: number | null;
        valor_real: number | null;
      }[];
    },
  });

  const empty = !isLoading && !compras?.length;

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-28 px-1">
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          O que precisa comprar
        </h1>
      </div>

      {compras?.map((c) => (
        <Card key={c.id} className="shadow-sm">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground">{c.item}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{c.fase}</p>
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${acaoColors[c.acao] ?? "bg-secondary text-secondary-foreground"}`}
            >
              {acaoLabel[c.acao] ?? c.acao}
            </Badge>
          </CardContent>
        </Card>
      ))}

      {/* IA simples — sugestão */}
      {compras && compras.length > 0 && (
        <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-6">
            <p className="text-base font-semibold text-foreground">
              💡 Sugestão
            </p>
            <p className="text-base text-muted-foreground mt-1">
              Você tem {compras.length} {compras.length === 1 ? "item" : "itens"}{" "}
              para comprar. Resolva hoje para não atrasar a obra.
            </p>
          </CardContent>
        </Card>
      )}

      {empty && (
        <Card className="border-2 border-success/30 bg-success/10 shadow-sm">
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4 text-success" />
            <p className="text-2xl font-bold text-foreground">
              Tudo comprado 👍
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
