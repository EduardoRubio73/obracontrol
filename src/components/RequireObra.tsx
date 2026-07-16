import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Card, CardContent } from "@/components/ui/card";

interface RequireObraProps {
  children: React.ReactNode;
  /** Obra id resolvido a partir da URL (useParams) */
  obraId: string | null | undefined;
  /** Page name shown when a obra não é encontrada */
  pageName?: string;
}

export function RequireObra({ children, obraId, pageName }: RequireObraProps) {
  const { obras, isLoading } = useObraAtiva();

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

  if (!obraId || !obras.some((o) => o.id === obraId)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Card className="max-w-sm w-full border-dashed border-2 rounded-2xl shadow-sm">
          <CardContent className="py-14 text-center">
            <p className="text-5xl mb-4">🏗️</p>
            <p className="text-xl font-bold text-foreground">Obra não encontrada</p>
            <p className="text-base text-muted-foreground mt-2">
              Selecione uma obra na lista para gerenciar {pageName || "esta seção"}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
