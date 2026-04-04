import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mic } from "lucide-react";

interface AuditoriaRow {
  id: string;
  tabela: string | null;
  acao: string | null;
  created_at: string | null;
}

interface VozLog {
  id: string;
  comando: string | null;
  interpretacao: string | null;
  created_at: string | null;
}

interface Props {
  auditoria: AuditoriaRow[];
  vozLogs: VozLog[];
}

export const DashboardAdminSection = ({ auditoria, vozLogs }: Props) => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
      <Shield className="h-5 w-5 text-primary" /> Área Admin
    </h2>
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Auditoria (últimos 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {auditoria.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem registros.</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {auditoria.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/40">
                  <span className="font-medium">{a.tabela}</span>
                  <span className="text-muted-foreground">{a.acao}</span>
                  <span className="text-muted-foreground">{a.created_at?.substring(0, 16).replace("T", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4" /> Logs de Voz
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vozLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem registros.</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {vozLogs.map((v) => (
                <div key={v.id} className="text-xs p-1.5 rounded bg-muted/40">
                  <p className="font-medium">"{v.comando}"</p>
                  <p className="text-muted-foreground">→ {v.interpretacao} · {v.created_at?.substring(0, 16).replace("T", " ")}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);
