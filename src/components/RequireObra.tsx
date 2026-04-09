import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface RequireObraProps {
  children: React.ReactNode;
  /** Page name shown when "all" is selected */
  pageName?: string;
}

export function RequireObra({ children, pageName }: RequireObraProps) {
  const { obraAtivaId, isAll, obras, isLoading } = useObraAtiva();

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
        <Card className="max-w-sm w-full border-dashed border-2 rounded-2xl shadow-sm">
          <CardContent className="py-14 text-center">
            <p className="text-5xl mb-4">🏗️</p>
            <p className="text-xl font-bold text-foreground">Nenhuma obra cadastrada</p>
            <p className="text-base text-muted-foreground mt-2">Crie uma obra para começar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAll) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Card className="max-w-md w-full border-dashed border-2 rounded-2xl shadow-sm">
          <CardContent className="py-14 text-center">
            <p className="text-5xl mb-4">🏗️</p>
            <p className="text-xl font-bold text-foreground">
              Selecione uma obra específica
            </p>
            <p className="text-base text-muted-foreground mt-2">
              Para gerenciar {pageName || "esta seção"}, selecione uma obra específica no menu superior.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!obraAtivaId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Card className="max-w-sm w-full border-dashed border-2 rounded-2xl shadow-sm">
          <CardContent className="py-14 text-center">
            <p className="text-5xl mb-4">🏗️</p>
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
