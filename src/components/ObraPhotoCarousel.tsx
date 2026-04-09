import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";

interface FotoWithFase {
  id: string;
  url: string;
  tipo: string;
  descricao: string | null;
  fase_id: string;
  obra_fases: { nome: string } | null;
}

const tipoLabel: Record<string, string> = {
  antes: "Antes",
  durante: "Durante",
  depois: "Depois",
};

export function ObraPhotoCarousel({ obraId }: { obraId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<FotoWithFase | null>(null);

  const { data: fotos } = useQuery({
    queryKey: ["obra-carousel-fotos", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("id, url, tipo, descricao, fase_id, obra_fases(nome)")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FotoWithFase[];
    },
  });

  const scroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || paused) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft >= maxScroll - 2) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: 220, behavior: "smooth" });
    }
  }, [paused]);

  useEffect(() => {
    if (!fotos?.length) return;
    const id = setInterval(scroll, 4000);
    return () => clearInterval(id);
  }, [fotos, scroll]);

  if (!fotos?.length) return null;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-4 md:px-6 py-2 bg-muted/30 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {fotos.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelected(f)}
            className="flex-shrink-0 snap-start rounded-xl overflow-hidden relative group focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ width: 200, height: 120 }}
          >
            <img
              src={f.url}
              alt={f.descricao || "Foto da obra"}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-3 w-3 text-white" />
              <span className="text-[10px] text-white truncate font-medium">
                {f.obra_fases?.nome ?? "Fase"}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selected && (
            <div className="space-y-3">
              <img
                src={selected.url}
                alt={selected.descricao || "Foto ampliada"}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="px-2 pb-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {selected.obra_fases?.nome ?? "Fase"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {tipoLabel[selected.tipo] ?? selected.tipo}
                  </Badge>
                </div>
                {selected.descricao && (
                  <p className="text-sm text-muted-foreground">{selected.descricao}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
