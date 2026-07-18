import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, ImageIcon, Loader2, Building2, Layers, Clock } from "lucide-react";

const tipoLabels: Record<string, string> = {
  antes: "📷 Antes",
  durante: "🔨 Durante",
  depois: "✅ Depois",
};

interface FasePhotosProps {
  faseId: string;
  obraId: string;
  faseNome?: string;
}

export function FasePhotos({ faseId, obraId, faseNome }: FasePhotosProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const { data: obra } = useQuery({
    queryKey: ["obra-nome", obraId],
    queryFn: async () => {
      const { data } = await supabase
        .from("obras")
        .select("nome")
        .eq("id", obraId)
        .single();
      return data;
    },
  });

  const { data: fotos } = useQuery({
    queryKey: ["fase-fotos", faseId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("fase_fotos" as any) as any)
        .select("*")
        .eq("fase_id", faseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const grouped = {
    antes: fotos?.filter((f: any) => f.tipo === "antes") ?? [],
    durante: fotos?.filter((f: any) => f.tipo === "durante") ?? [],
    depois: fotos?.filter((f: any) => f.tipo === "depois") ?? [],
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("foto") as File;
    const tipo = fd.get("tipo") as string;
    const descricao = (fd.get("descricao") as string) || null;

    if (!file || !file.size) {
      toast.error("Selecione uma foto.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `fase-fotos/${faseId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("obras")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("obras")
        .getPublicUrl(path);

      const { error: insertError } = await (supabase
        .from("fase_fotos" as any) as any)
        .insert({
          fase_id: faseId,
          obra_id: obraId,
          user_id: user!.id,
          tipo,
          url: urlData.publicUrl,
          descricao,
        });
      if (insertError) throw insertError;

      await (supabase.from("obra_dossie" as any) as any).insert({
        obra_id: obraId,
        user_id: user!.id,
        tipo: "foto_adicionada",
        titulo: `Foto (${tipo}) adicionada`,
        descricao: descricao || `Registro fotográfico: ${tipo}`,
      });

      queryClient.invalidateQueries({ queryKey: ["fase-fotos", faseId] });
      toast.success("Foto registrada!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  const totalFotos = fotos?.length ?? 0;

  const fmtDateTime = (d?: string) =>
    d
      ? new Date(d).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-muted-foreground">
          📸 Registro visual
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-2"
          onClick={() => setOpen(true)}
        >
          <Camera className="h-4 w-4" />
          Adicionar foto
        </Button>
      </div>

      {totalFotos === 0 ? (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-8 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma foto registrada</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([tipo, items]) =>
          items.length > 0 ? (
            <div key={tipo}>
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                {tipoLabels[tipo]}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {items.map((foto: any) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => setViewing({ ...foto, _tipo: tipo })}
                    className="aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={foto.url}
                      alt={foto.descricao || tipo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )
      )}

      {/* Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar foto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                name="tipo"
                required
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
              >
                <option value="antes">Antes</option>
                <option value="durante">Durante</option>
                <option value="depois">Depois</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <Input
                name="foto"
                type="file"
                accept="image/*"
                capture="environment"
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                name="descricao"
                placeholder="Ex: Parede antes da pintura"
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Salvar foto"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog with context */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewing && tipoLabels[viewing._tipo]}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-muted">
                <img
                  src={viewing.url}
                  alt={viewing.descricao || ""}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>
              {viewing.descricao && (
                <p className="text-sm font-medium text-foreground">
                  {viewing.descricao}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium text-blue-600 dark:text-blue-400 truncate">
                    {obra?.nome ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground truncate">
                    {faseNome ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {fmtDateTime(viewing.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
