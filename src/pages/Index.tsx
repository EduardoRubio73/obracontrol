import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Home,
  Layers,
  ShoppingCart,
  DollarSign,
  Users,
  LayoutDashboard,
  Bot,
  Building2,
} from "lucide-react";

/* ── gradient menu items ── */
const menuItems = [
  { key: "inicio", label: "Início", icon: Home, gradient: "from-[#FF8A00] to-[#FFB347]", shadow: "shadow-[0_8px_24px_-4px_rgba(255,138,0,0.35)]", url: "/hoje" },
  { key: "etapas", label: "Etapas", icon: Layers, gradient: "from-[#4FACFE] to-[#00F2FE]", shadow: "shadow-[0_8px_24px_-4px_rgba(79,172,254,0.35)]", url: "/etapas" },
  { key: "compras", label: "Compras", icon: ShoppingCart, gradient: "from-[#43E97B] to-[#38F9D7]", shadow: "shadow-[0_8px_24px_-4px_rgba(67,233,123,0.35)]", url: "/compras" },
  { key: "financeiro", label: "Financeiro", icon: DollarSign, gradient: "from-[#667EEA] to-[#764BA2]", shadow: "shadow-[0_8px_24px_-4px_rgba(102,126,234,0.35)]", url: "/financeiro" },
  { key: "fornecedores", label: "Contatos", icon: Users, gradient: "from-[#BDC3C7] to-[#2C3E50]", shadow: "shadow-[0_8px_24px_-4px_rgba(44,62,80,0.25)]", url: "/fornecedores" },
];

/* ── animation style helper ── */
const stagger = (step: number) => ({
  opacity: 0,
  animation: `menu-slide-up 0.45s ease-out ${step * 0.07}s forwards`,
});

const MenuPrincipal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { obraAtiva, obraAtivaId, setObraAtivaId, obras } = useObraAtiva();

  /* ── data ── */
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  const { data: alertas } = useQuery({
    queryKey: ["alertas-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema")
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: tarefas } = useQuery({
    queryKey: ["tarefas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_itens")
        .select("id, nome, status, fase_id, obra_fases(nome)")
        .neq("status", "concluido")
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: comprasCount } = useQuery({
    queryKey: ["compras-count"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("vw_sugestao_compra" as any)
        .select("id")
        .neq("acao", "ok")) as any;
      if (error) throw error;
      return (data as any[])?.length ?? 0;
    },
  });

  const { data: etapasEmAndamento } = useQuery({
    queryKey: ["etapas-andamento-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("id")
        .eq("status", "em_andamento");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const { data: fornecedoresCount } = useQuery({
    queryKey: ["fornecedores-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const toggleTask = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("fase_itens")
        .update({ status: "concluido" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["progresso-geral"] });
      toast.success("Tarefa concluída! ✅");
    },
  });

  /* ── derived ── */
  const hasAlerts = (alertas?.length ?? 0) > 0;

  const orderedMenu = menuItems;

  const badgeCounts: Record<string, number | undefined> = {
    inicio: tarefas?.length,
    etapas: etapasEmAndamento ?? undefined,
    compras: comprasCount ?? undefined,
    fornecedores: fornecedoresCount ?? undefined,
  };

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-32 px-3">
      {/* ── CSS keyframes for staggered entry ── */}
      <style>{`
        @keyframes menu-slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── BLOCO 1: Header ── */}
      <div className="pt-6 pb-1" style={stagger(0)}>
        <p className="text-lg font-semibold text-foreground">
          Gestão da sua obra
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe e controle tudo em um só lugar
        </p>
      </div>

      {/* ── BLOCO 2: Obra selector ── */}
      {obras.length > 0 && (
        <div className="mt-4" style={stagger(1)}>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <Select value={obraAtivaId ?? ""} onValueChange={(v) => setObraAtivaId(v)}>
              <SelectTrigger className="w-full h-12 rounded-xl text-base font-medium">
                <SelectValue placeholder="Selecionar obra" />
              </SelectTrigger>
              <SelectContent>
                {obras.map((o) => {
                  const statusLabel = o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1) : "Planejamento";
                  return (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="flex items-center gap-2">
                        {o.nome}
                        <span className="text-xs text-muted-foreground">• {statusLabel}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── BLOCO 3: Alerta (só se houver) ── */}
      {hasAlerts && (
        <div className="mt-5" style={stagger(2)}>
          <div className="rounded-3xl bg-destructive/10 border border-destructive/30 p-6">
            <p className="text-base text-foreground font-semibold">
              {alertas![0]?.mensagem}
            </p>
            <Button
              className="mt-4 h-12 rounded-2xl font-bold text-base px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => navigate("/hoje")}
            >
              Resolver agora
            </Button>
          </div>
        </div>
      )}

      {/* ── BLOCO 4: Menu grid premium ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mt-8">
        {orderedMenu.map((item, i) => {
          const Icon = item.icon;
          const isFull =
            orderedMenu.length % 2 !== 0 && i === orderedMenu.length - 1;
          const count = badgeCounts[item.key];
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.url)}
              style={stagger(i + 3)}
              className={`
                group relative overflow-hidden rounded-[20px]
                bg-gradient-to-br ${item.gradient} ${item.shadow}
                flex flex-col items-center justify-center gap-3
                h-[140px] text-white font-bold text-lg
                transition-all duration-200 ease-out
                active:scale-[0.97]
                hover:shadow-2xl hover:-translate-y-0.5
                ${isFull ? "col-span-2 md:col-span-1" : ""}
              `}
            >
              {count != null && count > 0 && (
                <span className="absolute top-3 right-3 z-20 min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-full bg-white/25 backdrop-blur-sm text-white text-xs font-bold">
                  {count}
                </span>
              )}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <Icon
                className="h-9 w-9 drop-shadow-md relative z-10"
                strokeWidth={2.2}
              />
              <span className="relative z-10 drop-shadow-sm text-[17px] tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── BLOCO 5: Abrir painel completo ── */}
      <div className="mt-6" style={stagger(9)}>
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full h-12 rounded-2xl border-2 border-border bg-card text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] hover:bg-muted"
        >
          <LayoutDashboard className="h-5 w-5" />
          Abrir painel completo
        </button>
      </div>

      {/* ── Botão flutuante: Assistente ── */}
      <div className="fixed bottom-24 right-5 z-50 md:bottom-8 md:right-8">
        <Button
          onClick={() => navigate("/chat")}
          className="h-16 w-16 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform duration-100 active:scale-[0.93]"
        >
          <Bot className="h-7 w-7 text-primary-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default MenuPrincipal;
