import { Navigate, useParams } from "react-router-dom";
import { useObraAtiva } from "@/hooks/useObraAtiva";

interface LegacyObraRedirectProps {
  /** Seção obra-scoped de destino, ex: "etapas", "financeiro" */
  section: string;
  /** Monta um sufixo de path a partir dos params da rota antiga (ex: :faseId, :id) */
  sub?: (params: Record<string, string | undefined>) => string;
  /** Para onde ir quando não há nenhuma obra. Default: "/obras". */
  emptyFallback?: string;
}

/**
 * Redireciona rotas antigas sem obra na URL (ex: /etapas, /financeiro)
 * para a versão nova /obras/:id/... usando a última obra ativa lembrada.
 */
export function LegacyObraRedirect({ section, sub, emptyFallback = "/obras" }: LegacyObraRedirectProps) {
  const { obraAtivaId, obras, isLoading } = useObraAtiva();
  const params = useParams();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const targetObraId =
    obraAtivaId && obraAtivaId !== "all" && obras.some((o) => o.id === obraAtivaId)
      ? obraAtivaId
      : obras[0]?.id;

  if (!targetObraId) return <Navigate to={emptyFallback} replace />;

  const suffix = sub ? sub(params) : "";
  return <Navigate to={`/obras/${targetObraId}/${section}${suffix}`} replace />;
}
