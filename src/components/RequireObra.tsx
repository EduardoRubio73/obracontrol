import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export function RequireObra({ children }: { children: React.ReactNode }) {
  const { obraAtivaId, obras, isLoading } = useObraAtiva();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!obras.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Card className="max-w-sm w-full border-dashed border-2">
          <CardContent className="py-14 text-center">
            <Building2 className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">Nenhuma obra cadastrada</p>
            <p className="text-base text-muted-foreground mt-2">Crie uma obra para começar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!obraAtivaId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Card className="max-w-sm w-full border-dashed border-2">
          <CardContent className="py-14 text-center">
            <Building2 className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">Selecione uma obra</p>
            <p className="text-base text-muted-foreground mt-2">
              Use o seletor no topo para escolher a obra ativa.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
