import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Trash2, Download } from "lucide-react";

const Documentos = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: obra } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data } = await supabase.from("obras").select("nome").eq("id", id!).single();
      return data;
    },
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documentos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const path = `${user.id}/${id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);

      const { error } = await supabase.from("documentos").insert({
        obra_id: id!,
        nome: file.name,
        tipo: file.type,
        url: urlData.publicUrl,
        tamanho_bytes: file.size,
        user_id: user.id,
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["documentos", id] });
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
      queryClient.invalidateQueries({ queryKey: ["documentos", id] });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">{obra?.nome}</p>
        </div>
      </div>

      {/* Upload */}
      <div className="flex gap-3">
        <label className="flex-1">
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
      </div>

      {/* List */}
      {!docs?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum documento</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{doc.tipo}</TableCell>
                  <TableCell className="text-sm">{fmtSize(doc.tamanho_bytes)}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMut.mutate(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default Documentos;
