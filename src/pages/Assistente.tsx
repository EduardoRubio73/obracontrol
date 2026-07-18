import { Navigate } from "react-router-dom";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { ChatContent } from "@/pages/Chat";

export default function Assistente() {
  const { obras, isLoading } = useObraAtiva();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (obras.length > 0) {
    return <Navigate to={`/obras/${obras[0].id}/chat`} replace />;
  }

  return <ChatContent obraId={null} />;
}
