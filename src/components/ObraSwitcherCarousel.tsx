import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

interface Obra {
  id: string;
  nome: string;
  status: string | null;
  main_image: string | null;
}

const statusLabel = (s: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "Planejamento";

export function ObraSwitcherCarousel({ obras }: { obras: Obra[] }) {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<"ativas" | "arquivadas">("ativas");

  const obraIdsNoImage = obras.filter((o) => !o.main_image).map((o) => o.id);
  const { data: fallbackImages } = useQuery({
    queryKey: ["obra-fallback-images", obraIdsNoImage],
    enabled: obraIdsNoImage.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("fase_fotos")
        .select("obra_id, url")
        .in("obra_id", obraIdsNoImage)
        .order("created_at", { ascending: true });
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => {
        if (!map[r.obra_id]) map[r.obra_id] = r.url;
      });
      return map;
    },
  });

  const getImage = (obra: Obra): string | null =>
    obra.main_image || fallbackImages?.[obra.id] || null;

  const filtered = obras.filter((o) =>
    filtro === "ativas" ? o.status !== "cancelado" : o.status === "cancelado"
  );

  if (!obras.length) return null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">
          Suas obras
        </p>
        <Button size="sm" className="gap-1" onClick={() => navigate("/nova-obra")}>
          <Plus className="h-3.5 w-3.5" /> Nova
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFiltro("ativas")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            filtro === "ativas"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          Obras Ativas
        </button>
        <button
          onClick={() => setFiltro("arquivadas")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            filtro === "arquivadas"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          Obras Arquivadas
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1">
        {filtered.map((obra) => {
          const img = getImage(obra);
          return (
            <button
              key={obra.id}
              onClick={() => navigate(`/obras/${obra.id}/hoje`)}
              className="flex-shrink-0 snap-start w-36 rounded-2xl border bg-card overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all"
            >
              {img ? (
                <img src={img} alt={obra.nome} className="w-full h-24 object-cover" />
              ) : (
                <div className="w-full h-24 bg-muted flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-2.5 space-y-1">
                <p className="text-sm font-semibold truncate">{obra.nome}</p>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {statusLabel(obra.status)}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          {filtro === "ativas" ? "Nenhuma obra ativa" : "Nenhuma obra arquivada"}
        </p>
      )}
    </div>
  );
}
