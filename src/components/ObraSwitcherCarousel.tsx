import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

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

  if (!obras.length) return null;

  return (
    <div className="w-full">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Suas obras
      </p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1">
        {obras.map((obra) => {
          const img = getImage(obra);
          return (
            <button
              key={obra.id}
              onClick={() => navigate(`/obras/${obra.id}/dashboard`)}
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
    </div>
  );
}
