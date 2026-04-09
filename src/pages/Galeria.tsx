import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Image as ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const tipos = ["todos", "antes", "durante", "depois"] as const;
const tiposUpload = ["antes", "durante", "depois"] as const;

type Foto = {
  id: string;
  url: string;
  tipo: string;
  descricao: string | null;
  fase_id: string;
  created_at: string;
  obra_fases?: { nome?: string } | null;
};

type Fase = {
  id: string;
  nome: string;
};

type FormState = {
  fase_id: string;
  tipo: string;
  descricao: string;
  file: File | null;
};

const initialForm: FormState = {
  fase_id: "",
  tipo: "antes",
  descricao: "",
  file: null,
};

const getStoragePathFromUrl = (url: string) => {
  const marker = "/storage/v1/object/public/obras/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
};

const getFotoFaseNome = (foto: Foto) => foto.obra_fases?.nome ?? "Sem fase";

const Galeria = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { obraAtivaId } = useObraAtiva();
  const obraId = routeId ?? (obraAtivaId && obraAtivaId !== "all" ? obraAtivaId : null);

  const [filtro, setFiltro] = useState<string>("todos");
  const [lightbox, setLightbox] = useState<Foto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingFoto, setEditingFoto] = useState<Foto | null>(null);

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome").eq("id", obraId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fases } = useQuery({
    queryKey: ["galeria-fases", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("id, nome")
        .eq("obra_id", obraId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Fase[];
    },
  });

  const { data: fotos, isLoading } = useQuery({
    queryKey: ["galeria", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("id, url, tipo, descricao, fase_id, created_at, obra_fases(nome)")
        .eq("obra_id", obraId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Foto[];
    },
  });

  const filtered = useMemo(
    () => (filtro === "todos" ? fotos : fotos?.filter((f) => f.tipo === filtro)),
    [filtro, fotos]
  );

  const resetForm = () => setForm({ ...initialForm, fase_id: fases?.[0]?.id ?? "" });

  const refreshGaleria = () => {
    queryClient.invalidateQueries({ queryKey: ["galeria", obraId] });
    queryClient.invalidateQueries({ queryKey: ["obra-carousel-fotos", obraId] });
    queryClient.invalidateQueries({ queryKey: ["fase-fotos-thumbs", obraId] });
    queryClient.invalidateQueries({ queryKey: ["obras-list-thumbs"] });
  };

  const createFoto = useMutation({
    mutationFn: async () => {
      if (!obraId || !user) throw new Error("Usuário não autenticado.");
      if (!form.file) throw new Error("Selecione uma imagem.");
      if (!form.fase_id) throw new Error("Selecione uma fase.");

      const ext = form.file.name.split(".").pop() || "jpg";
      const path = `fase-fotos/${obraId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("obras").upload(path, form.file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("obras").getPublicUrl(path);

      const { error: insertError } = await supabase.from("fase_fotos").insert({
        obra_id: obraId,
        fase_id: form.fase_id,
        user_id: user.id,
        tipo: form.tipo,
        descricao: form.descricao.trim() || null,
        url: publicUrlData.publicUrl,
      } as never);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      refreshGaleria();
      toast.success("Foto adicionada!");
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateFoto = useMutation({
    mutationFn: async () => {
      if (!editingFoto) throw new Error("Foto não encontrada.");
      if (!form.fase_id) throw new Error("Selecione uma fase.");

      const { error } = await supabase
        .from("fase_fotos")
        .update({
          fase_id: form.fase_id,
          tipo: form.tipo,
          descricao: form.descricao.trim() || null,
        } as never)
        .eq("id", editingFoto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshGaleria();
      toast.success("Foto atualizada!");
      setEditOpen(false);
      setEditingFoto(null);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteFoto = useMutation({
    mutationFn: async (foto: Foto) => {
      const storagePath = getStoragePathFromUrl(foto.url);
      if (storagePath) {
        await supabase.storage.from("obras").remove([storagePath]);
      }

      const { error } = await supabase.from("fase_fotos").delete().eq("id", foto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshGaleria();
      setLightbox(null);
      toast.success("Foto excluída!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditingFoto(null);
    setForm({ ...initialForm, fase_id: fases?.[0]?.id ?? "" });
    setCreateOpen(true);
  };

  const openEdit = (foto: Foto) => {
    setEditingFoto(foto);
    setForm({
      fase_id: foto.fase_id,
      tipo: foto.tipo,
      descricao: foto.descricao ?? "",
      file: null,
    });
    setEditOpen(true);
  };

  if (!obraId) {
    return (
      <RequireObra pageName="Galeria">
        <></>
      </RequireObra>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Galeria</h1>
            <p className="text-sm text-muted-foreground">{obra?.nome}</p>
          </div>
        </div>
        <Button className="gap-2 rounded-xl" onClick={openCreate} disabled={!fases?.length}>
          <Plus className="h-4 w-4" /> Adicionar foto
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
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
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : !fases?.length ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>Crie ao menos uma etapa para cadastrar fotos na galeria.</p>
          </CardContent>
        </Card>
      ) : !filtered?.length ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <ImageIcon className="h-12 w-12 mx-auto opacity-40" />
            <p>Nenhuma foto encontrada</p>
            <Button variant="outline" className="rounded-xl" onClick={openCreate}>
              Cadastrar primeira foto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((foto) => (
            <Card key={foto.id} className="overflow-hidden rounded-2xl">
              <button
                className="relative aspect-square w-full overflow-hidden text-left"
                onClick={() => setLightbox(foto)}
              >
                <img
                  src={foto.url}
                  alt={foto.descricao ?? `Foto ${foto.tipo}`}
                  className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize">{foto.tipo}</Badge>
                    <span className="text-xs text-foreground/80 truncate">{getFotoFaseNome(foto)}</span>
                  </div>
                </div>
              </button>
              <CardContent className="p-3 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-10">
                  {foto.descricao || "Sem observação."}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl" onClick={() => openEdit(foto)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={() => deleteFoto.mutate(foto)}
                    disabled={deleteFoto.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <select
                value={form.fase_id}
                onChange={(e) => setForm((prev) => ({ ...prev, fase_id: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione uma etapa</option>
                {(fases ?? []).map((fase) => (
                  <option key={fase.id} value={fase.id}>{fase.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {tiposUpload.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Imagem</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex: parede antes da pintura"
              />
            </div>
            <Button className="w-full rounded-xl" onClick={() => createFoto.mutate()} disabled={createFoto.isPending}>
              {createFoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar foto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <select
                value={form.fase_id}
                onChange={(e) => setForm((prev) => ({ ...prev, fase_id: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione uma etapa</option>
                {(fases ?? []).map((fase) => (
                  <option key={fase.id} value={fase.id}>{fase.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {tiposUpload.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex: parede antes da pintura"
              />
            </div>
            <Button className="w-full rounded-xl" onClick={() => updateFoto.mutate()} disabled={updateFoto.isPending}>
              {updateFoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          {lightbox && (
            <div className="space-y-0">
              <img src={lightbox.url} alt={lightbox.descricao ?? "Foto ampliada"} className="w-full max-h-[70vh] object-contain bg-muted" />
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">{lightbox.tipo}</Badge>
                  <span className="text-sm font-medium">{getFotoFaseNome(lightbox)}</span>
                </div>
                {lightbox.descricao && <p className="text-sm text-muted-foreground">{lightbox.descricao}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="rounded-xl gap-2" onClick={() => openEdit(lightbox)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={() => deleteFoto.mutate(lightbox)}
                    disabled={deleteFoto.isPending}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Galeria;
