import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";

interface Doc {
  id: string;
  nome: string;
  tipo: string | null;
  created_at: string | null;
  url: string;
}

export const DashboardDocumentos = ({ documentos }: { documentos: Doc[] }) => (
  <Card className="rounded-2xl">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2">
        <FileText className="h-4 w-4" /> Documentos
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum documento.</p>
      ) : (
        documentos.slice(0, 8).map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{d.nome}</p>
              <p className="text-xs text-muted-foreground">{d.tipo ?? "—"} · {d.created_at?.substring(0, 10)}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
              <a href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          </div>
        ))
      )}
    </CardContent>
  </Card>
);
