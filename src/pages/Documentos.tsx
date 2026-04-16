import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Trash2, Eye, ExternalLink } from "lucide-react";

const Documentos = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { obraAtivaId } = useObraAtiva();
  const obraId = routeId ?? (obraAtivaId && obraAtivaId !== "all" ? obraAtivaId : null);

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const { data } = await supabase.from("obras").select("nome").eq("id", obraId!).single();
      return data;
    },
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documentos", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("obra_id", obraId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !obraId) return;

    setUploading(true);
    try {
      const path = `${user.id}/${obraId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);

      const { error } = await supabase.from("documentos").insert({
        obra_id: obraId,
        nome: file.name,
        tipo: file.type,
        url: urlData.publicUrl,
        tamanho_bytes: file.size,
        user_id: user.id,
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["documentos", obraId] });
      toast.success("Documento enviado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteMut = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("documentos").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos", obraId] });
      toast.success("Documento removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!obraId) {
    return (
      <RequireObra pageName="Documentos">
        <></>
      </RequireObra>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Documentos</h1>
          <p className="text-sm text-muted-foreground truncate">{obra?.nome}</p>
        </div>
      </div>

      {/* Upload */}
      <label className="block">
        <Input
          type="file"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <Button variant="outline" className="w-full" disabled={uploading} asChild>
          <span className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Enviar Documento"}
          </span>
        </Button>
      </label>

      {/* Empty state */}
      {!docs?.length && !isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum documento</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{doc.tipo}</TableCell>
                      <TableCell className="text-sm">{fmtSize(doc.tamanho_bytes)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => deleteMut.mutate(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {docs?.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">{doc.tipo ?? "—"} · {fmtSize(doc.tamanho_bytes)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteMut.mutate(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Documentos;
