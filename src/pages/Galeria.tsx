import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";

const tipos = ["todos", "antes", "durante", "depois"] as const;

const Galeria = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<string>("todos");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: obra } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fotos, isLoading } = useQuery({
    queryKey: ["galeria", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("*, obra_fases(nome)")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = filtro === "todos" ? fotos : fotos?.filter((f) => f.tipo === filtro);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Galeria</h1>
          <p className="text-sm text-muted-foreground">{obra?.nome}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {tipos.map((t) => (
          <Badge
            key={t}
            variant={filtro === t ? "default" : "secondary"}
            className="cursor-pointer capitalize"
            onClick={() => setFiltro(t)}
          >
            {t}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma foto encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((foto) => (
            <div
              key={foto.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border"
              onClick={() => setLightbox(foto.url)}
            >
              <img
                src={foto.url}
                alt={foto.descricao ?? "Foto"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {foto.tipo}
                </Badge>
                <p className="text-xs text-white/80 truncate mt-0.5">
                  {(foto as any).obra_fases?.nome}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {lightbox && (
            <img src={lightbox} alt="Foto ampliada" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Galeria;
