import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, LayoutGrid } from "lucide-react";

interface Obra {
  id: string;
  nome: string;
  status: string | null;
  main_image: string | null;
}

interface ObraSelectorVisualProps {
  obras: Obra[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusLabel = (s: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "Planejamento";

export function ObraSelectorVisual({ obras, selectedId, onSelect }: ObraSelectorVisualProps) {
  const [expanded, setExpanded] = useState(false);
  const isAll = selectedId === "all";
  const selected = isAll ? null : obras.find((o) => o.id === selectedId) ?? null;

  // Fallback images: fetch first fase_foto per obra that lacks main_image
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

  const handleSelect = (id: string) => {
    onSelect(id);
    setExpanded(false);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        Para onde vamos agora?
      </p>

      {/* Selected card */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 p-3 border rounded-xl bg-background shadow-sm cursor-pointer hover:bg-accent transition-colors"
      >
        {isAll || !selected ? (
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-lg shrink-0">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : (
          getImage(selected) ? (
            <img
              src={getImage(selected)!}
              className="w-10 h-10 rounded-md object-cover shrink-0"
              alt={selected.nome}
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-lg shrink-0">
              🏗️
            </div>
          )
        )}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {isAll || !selected ? "Todas as Obras" : selected.nome}
          </span>
          <span className="text-xs text-muted-foreground">
            {isAll || !selected ? "Visão geral" : statusLabel(selected.status)}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      {/* Expanded grid */}
      <div
        className={`grid grid-cols-2 md:grid-cols-3 gap-3 overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[2000px] opacity-100 mt-1" : "max-h-0 opacity-0"
        }`}
      >
        {/* "Todas as Obras" special card */}
        <div
          onClick={() => handleSelect("all")}
          className={`rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-all ${
            isAll ? "ring-2 ring-primary" : ""
          }`}
        >
          <div className="w-full h-28 bg-muted flex items-center justify-center">
            <LayoutGrid className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="p-2 text-center text-sm font-medium truncate">
            Todas as Obras
          </div>
        </div>

        {/* Obra cards */}
        {obras.map((obra) => {
          const img = getImage(obra);
          const isSelected = obra.id === selectedId;
          return (
            <div
              key={obra.id}
              onClick={() => handleSelect(obra.id)}
              className={`rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
            >
              {img ? (
                <img
                  src={img}
                  className="w-full h-28 object-cover"
                  alt={obra.nome}
                />
              ) : (
                <div className="w-full h-28 bg-muted flex items-center justify-center text-3xl">
                  🏗️
                </div>
              )}
              <div className="p-2 text-center text-sm font-medium truncate">
                {obra.nome}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
