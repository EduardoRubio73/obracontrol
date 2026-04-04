import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle2 } from "lucide-react";

const acaoColors: Record<string, string> = {
  comprar: "bg-blue-100 text-blue-700",
  revisar: "bg-amber-100 text-amber-700",
  renegociar: "bg-red-100 text-red-700",
};

export default function Compras() {
  const { data: compras, isLoading } = useQuery({
    queryKey: ["sugestao-compra"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("vw_sugestao_compra" as any)
        .select("*")
        .neq("acao", "ok") as any);
      if (error) throw error;
      return data as {
        id: string;
        item: string;
        fase: string;
        acao: string;
      }[];
    },
  });

  const empty = !isLoading && !compras?.length;

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          O que precisa comprar
        </h1>
      </div>

      {compras?.map((c) => (
        <Card key={c.id} className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{c.item}</p>
              <p className="text-sm text-muted-foreground">{c.fase}</p>
            </div>
            <Badge className={acaoColors[c.acao] ?? "bg-secondary text-secondary-foreground"}>
              {c.acao}
            </Badge>
          </CardContent>
        </Card>
      ))}

      {empty && (
        <Card className="border-2 border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-xl font-bold text-emerald-800">
              Tudo comprado 👍
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
