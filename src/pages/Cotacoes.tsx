import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-obracontrol.png";
import { useAuth } from "@/hooks/useAuth";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportarProdutosDialog } from "@/components/produtos/ImportarProdutosDialog";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import {
  ChevronRight, Check, BarChart3, Plus, Trash2, Link2, Copy,
  PackagePlus, Brain, Mail, Send, Eye, Clock, CheckCircle2, AlertTriangle,
  Search, Pencil, Printer, RefreshCw, Upload, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-primary/10 text-primary",
  recebendo_propostas: "bg-warning/10 text-warning",
  comparando: "bg-accent text-accent-foreground",
  finalizada: "bg-success/10 text-success",
  cancelada: "bg-destructive/10 text-destructive",
};

// Helper to compute badge status from tracking row
const getInviteStatus = (t: any): { label: string; color: string } => {
  if (t.data_resposta) return { label: "Respondido", color: "bg-green-100 text-green-700" };
  if (t.data_envio) {
    const diffMs = Date.now() - new Date(t.data_envio).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 2) return { label: "Atrasado", color: "bg-red-100 text-red-700" };
    return { label: "Pendente", color: "bg-yellow-100 text-yellow-700" };
  }
  return { label: "Pendente", color: "bg-yellow-100 text-yellow-700" };
};

// Helper: generate espelho HTML (shareable between print and PDF generation)
async function generateEspelhoHtml(
  cotacao: any,
  nomeObra: string,
  printItens: any[],
  user: any,
  profileData?: any
): Promise<string> {
  let logoBase64 = "";
  try {
    const resp = await fetch(logoImg);
    const blob = await resp.blob();
    logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { /* fallback */ }

  let sigBase64 = "";
  if (profileData?.assinatura_url) {
    try {
      const resp = await fetch(profileData.assinatura_url);
      const blob = await resp.blob();
      sigBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* fallback */ }
  }

  const profileName = profileData?.nome || user?.email || "";
  const profileEmail = profileData?.email || user?.email || "";
  const profilePhone = profileData?.telefone || "";
  const numOrc = `#${cotacao.id.slice(0, 8)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Espelho do Orçamento ${numOrc}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a1a; background: #fff; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 16px; }
        .header img { height: 60px; margin-bottom: 12px; }
        .header h2 { font-size: 22px; color: #2563eb; margin: 0; font-weight: 700; letter-spacing: 0.5px; }
        .header .num-orc { font-size: 14px; color: #666; margin-top: 4px; }
        .info { margin-bottom: 20px; }
        .info p { margin: 4px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; font-size: 14px; }
        th { background: #e0e7ff; font-weight: 600; color: #1e3a5f; }
        tr:nth-child(even) td { background: #f3f4f6; }
        tr:nth-child(odd) td { background: #fff; }
        .price-col { width: 150px; border-bottom: 1px dotted #999; }
        .footer { margin-top: 50px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
        .footer .signature-line { display: flex; justify-content: space-between; margin-top: 40px; }
        .footer .signature-line .sig-block { width: 45%; text-align: center; }
        .footer .signature-line .sig-block .sig-img { height: 60px; object-fit: contain; margin-bottom: -4px; }
        .footer .signature-line .sig-block .sig-label { border-top: 1px solid #333; padding-top: 8px; font-size: 12px; color: #666; }
        @media print {
          body { margin: 20px; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button, .no-print { display: none !important; }
          * { box-shadow: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ""}
        <h2>Espelho do Orçamento</h2>
        <p class="num-orc">Orçamento ${numOrc}</p>
      </div>
      <div class="info">
        <p><strong>Cotação:</strong> ${cotacao.descricao}</p>
        <p><strong>Obra:</strong> ${nomeObra}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
        ${cotacao.data_expiracao ? `<p><strong>Prazo:</strong> ${new Date(cotacao.data_expiracao).toLocaleDateString("pt-BR")}</p>` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Quantidade</th>
            <th>Unidade</th>
            <th>Valor Unitário</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${printItens.map((item: any, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.nome}</td>
              <td>${item.quantidade}</td>
              <td>${item.unidade || "un"}</td>
              <td class="price-col"></td>
              <td class="price-col"></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right;">
        <p><strong>Total: ________________</strong></p>
      </div>
      <div class="footer">
        ${profileName ? `<p style="font-size:13px;color:#444;"><strong>Responsável:</strong> ${profileName}${profilePhone ? ` | ${profilePhone}` : ""}${profileEmail ? ` | ${profileEmail}` : ""}</p>` : ""}
        <div class="signature-line">
          <div class="sig-block">
            ${sigBase64 ? `<img src="${sigBase64}" class="sig-img" alt="Assinatura" />` : `<div style="height:60px"></div>`}
            <div class="sig-label">Assinatura do Responsável</div>
          </div>
          <div class="sig-block">
            <div style="height:60px"></div>
            <div class="sig-label">Assinatura do Fornecedor</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

const CotacoesContent = ({ obraId }: { obraId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));
  const [newCotacao, setNewCotacao] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageDialog, setManageDialog] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQtd, setNewItemQtd] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("un");
  const [prodSearch, setProdSearch] = useState("");
  const [selectedProds, setSelectedProds] = useState<Record<string, { nome: string; unidade: string; qtd: string }>>({});
  const [prazoDias, setPrazoDias] = useState("7");
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([]);
  const [editDialog, setEditDialog] = useState<{ id: string; descricao: string; data_expiracao: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resendDialog, setResendDialog] = useState<{ trackingId: string; fornecedorId: string; fornecedorNome: string; email: string } | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [viewPropostaDialog, setViewPropostaDialog] = useState<{ fornecedorId: string; fornecedorNome: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.rpc("expirar_cotacoes").then(({ error }) => {
      if (error) console.error("expirar_cotacoes:", error.message);
    });
  }, []);

  const { data: fornecedoresDb } = useQuery({
    queryKey: ["fornecedores-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("id, nome, email");
      if (error) throw error;
      return data;
    },
  });

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome").eq("id", obraId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ["cotacoes", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*, obras(nome)")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cotacaoIds = useMemo(() => cotacoes?.map((c) => c.id) ?? [], [cotacoes]);
  const { data: allItensCount } = useQuery({
    queryKey: ["itens-cotacao-count", cotacaoIds],
    enabled: cotacaoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cotacao")
        .select("cotacao_id")
        .in("cotacao_id", cotacaoIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((d: any) => {
        counts[d.cotacao_id] = (counts[d.cotacao_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: propostas } = useQuery({
    queryKey: ["propostas", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*, fornecedores(nome)")
        .eq("cotacao_id", selectedId!)
        .order("valor", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: tracking } = useQuery({
    queryKey: ["cotacao-tracking", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacao_fornecedores")
        .select("*, fornecedores(nome, email)")
        .eq("cotacao_id", selectedId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["itens-cotacao", manageDialog],
    enabled: !!manageDialog,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cotacao")
        .select("*")
        .eq("cotacao_id", manageDialog!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: printItens } = useQuery({
    queryKey: ["itens-cotacao-print", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cotacao")
        .select("*")
        .eq("cotacao_id", selectedId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Fetch proposta + itens for viewing a specific fornecedor's response
  const { data: viewPropostaData } = useQuery({
    queryKey: ["view-proposta", selectedId, viewPropostaDialog?.fornecedorId],
    enabled: !!selectedId && !!viewPropostaDialog?.fornecedorId,
    queryFn: async () => {
      const { data: prop, error } = await supabase
        .from("propostas")
        .select("*, proposta_itens(*)")
        .eq("cotacao_id", selectedId!)
        .eq("fornecedor_id", viewPropostaDialog!.fornecedorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return prop;
    },
  });

  const { data: produtosCatalog } = useQuery({
    queryKey: ["produtos-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias_produtos(nome)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: linkedFornecedores } = useQuery({
    queryKey: ["cotacao-fornecedores-linked", manageDialog],
    enabled: !!manageDialog,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacao_fornecedores")
        .select("fornecedor_id")
        .eq("cotacao_id", manageDialog!);
      if (error) throw error;
      return data.map((d: any) => d.fornecedor_id as string);
    },
  });

  useEffect(() => {
    if (linkedFornecedores) {
      setSelectedFornecedores(linkedFornecedores);
    }
  }, [linkedFornecedores]);

  const filteredProducts = useMemo(() => {
    if (!produtosCatalog) return [];
    if (!prodSearch) return produtosCatalog;
    const s = prodSearch.toLowerCase();
    return produtosCatalog.filter(
      (p: any) =>
        p.nome.toLowerCase().includes(s) ||
        p.categorias_produtos?.nome?.toLowerCase().includes(s)
    );
  }, [produtosCatalog, prodSearch]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProducts.forEach((p: any) => {
      const cat = p.categorias_produtos?.nome || "Sem categoria";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const createCotacao = useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase.from("cotacoes").insert(values).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      toast.success("Cotação criada! Adicione os itens.");
      setNewCotacao(false);
      setManageDialog(data.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCotacao = useMutation({
    mutationFn: async ({ id, descricao, data_expiracao }: { id: string; descricao: string; data_expiracao: string | null }) => {
      const { error } = await supabase.from("cotacoes").update({ descricao, data_expiracao }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      toast.success("Cotação atualizada!");
      setEditDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCotacao = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("itens_cotacao").delete().eq("cotacao_id", id);
      await supabase.from("cotacao_fornecedores").delete().eq("cotacao_id", id);
      await supabase.from("propostas").delete().eq("cotacao_id", id);
      const { error } = await supabase.from("cotacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      toast.success("Cotação excluída!");
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async (values: { cotacao_id: string; nome: string; quantidade: number; unidade: string }) => {
      const { error } = await supabase.from("itens_cotacao").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens-cotacao", manageDialog] });
      queryClient.invalidateQueries({ queryKey: ["itens-cotacao-count"] });
      setNewItemName("");
      setNewItemQtd("1");
      toast.success("Item adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itens_cotacao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens-cotacao", manageDialog] });
      queryClient.invalidateQueries({ queryKey: ["itens-cotacao-count"] });
    },
  });

  const aceitar = useMutation({
    mutationFn: async (propostaId: string) => {
      const { error } = await supabase
        .from("propostas")
        .update({ status: "aceita" })
        .eq("id", propostaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas", selectedId] });
      toast.success("Proposta aceita!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const enviarCotacao = useMutation({
    mutationFn: async ({ cotacaoId, fornecedorIds, prazoDias: dias }: { cotacaoId: string; fornecedorIds: string[]; prazoDias: number }) => {
      const prazoLimite = new Date();
      prazoLimite.setDate(prazoLimite.getDate() + dias);

      const registros = fornecedorIds.map((fId) => {
        const forn = fornecedoresDb?.find((f) => f.id === fId);
        return {
          cotacao_id: cotacaoId,
          fornecedor_id: fId,
          email: forn?.email || null,
          status: "enviado",
          data_envio: new Date().toISOString(),
          prazo_limite: prazoLimite.toISOString(),
        };
      });

      const { error } = await supabase
        .from("cotacao_fornecedores")
        .upsert(registros, { onConflict: "cotacao_id,fornecedor_id" });
      if (error) throw error;

      await supabase
        .from("cotacoes")
        .update({ status: "enviada" })
        .eq("id", cotacaoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["cotacao-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["cotacao-fornecedores-linked", manageDialog] });
      toast.success("Cotação enviada para fornecedores!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const fmtDateShort = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const selected = cotacoes?.find((c) => c.id === selectedId);

  const ensureToken = async (cotacaoId: string, currentToken: string | null): Promise<string | null> => {
    if (currentToken) return currentToken;
    const newToken = crypto.randomUUID();
    const { error } = await supabase.from("cotacoes").update({ token_publico: newToken }).eq("id", cotacaoId);
    if (error) {
      toast.error("⚠️ Gerando link de acesso... tente novamente em instantes");
      return null;
    }
    queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
    return newToken;
  };

  const copyLink = async (cotacaoId: string, currentToken: string | null) => {
    const token = await ensureToken(cotacaoId, currentToken);
    if (!token) return;
    const url = `${window.location.origin}/cotacao/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link avulso copiado!");
  };

  const handleNewCotacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const token = crypto.randomUUID();
    createCotacao.mutate({
      obra_id: obraId,
      descricao: fd.get("descricao"),
      data_expiracao: fd.get("data_expiracao") || null,
      token_publico: token,
    });
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !manageDialog) return;
    addItem.mutate({
      cotacao_id: manageDialog,
      nome: newItemName.trim(),
      quantidade: Number(newItemQtd) || 1,
      unidade: newItemUnit || "un",
    });
  };

  const toggleProd = (p: any) => {
    setSelectedProds((prev) => {
      const next = { ...prev };
      if (next[p.id]) {
        delete next[p.id];
      } else {
        next[p.id] = { nome: p.nome, unidade: p.unidade || "un", qtd: "1" };
      }
      return next;
    });
  };

  const updateProdQtd = (id: string, qtd: string) => {
    setSelectedProds((prev) => ({
      ...prev,
      [id]: { ...prev[id], qtd },
    }));
  };

  const handleAddSelectedProducts = async () => {
    if (!manageDialog) return;
    const entries = Object.values(selectedProds);
    if (!entries.length) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    const items = entries.map((e) => ({
      cotacao_id: manageDialog,
      nome: e.nome,
      quantidade: Number(e.qtd) || 1,
      unidade: e.unidade,
    }));
    const { error } = await supabase.from("itens_cotacao").insert(items);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["itens-cotacao", manageDialog] });
    queryClient.invalidateQueries({ queryKey: ["itens-cotacao-count"] });
    setSelectedProds({});
    setProdSearch("");
    toast.success(`${items.length} item(ns) adicionado(s)!`);
  };

  const toggleFornecedor = (id: string) => {
    setSelectedFornecedores((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Individualized email sending
  const handleSendToFornecedores = async () => {
    if (!manageDialog || !selectedFornecedores.length) {
      toast.error("Selecione pelo menos um fornecedor");
      return;
    }
    enviarCotacao.mutate({
      cotacaoId: manageDialog,
      fornecedorIds: selectedFornecedores,
      prazoDias: Number(prazoDias) || 7,
    });

    const cotacao = cotacoes?.find((c) => c.id === manageDialog);
    if (cotacao) {
      const token = await ensureToken(cotacao.id, cotacao.token_publico);
      if (!token) return;
      const nomeObra = (cotacao.obras as any)?.nome ?? "Obra";

      // Open individual mailto for each fornecedor
      for (const fId of selectedFornecedores) {
        const forn = fornecedoresDb?.find((f) => f.id === fId);
        if (!forn?.email) continue;
        const link = `${window.location.origin}/cotacao/${token}?fornecedor=${fId}`;
        const subject = `Solicitação de Orçamento #${cotacao.id.slice(0, 8)} - ${nomeObra}`;
        const body = `Prezado(a) ${forn.nome},\n\nEstamos realizando uma cotação referente à obra:\n\n${nomeObra}\n\nSolicitamos o envio da proposta através do link abaixo:\n\n${link}\n\nPrazo para envio: ${prazoDias} dias\n\nIMPORTANTE:\nO envio deve ser feito exclusivamente pelo formulário.\n\nAtenciosamente,\nObraControl`;
        window.open(`mailto:${encodeURIComponent(forn.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
      }
    }
  };

  // Resend to a single fornecedor with PDF espelho
  const handleResend = async () => {
    if (!resendDialog || !selectedId) return;
    const cotacao = selected;
    if (!cotacao) return;

    setResendLoading(true);
    try {
      // Generate PDF espelho
      let profileData: any = {};
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) profileData = data;
      }

      const nomeObra = (cotacao.obras as any)?.nome ?? "Obra";
      const pdfBlob = await generateEspelhoPdf(cotacao, nomeObra, profileData);

      // Update data_envio and email in cotacao_fornecedores
      const { error } = await supabase
        .from("cotacao_fornecedores")
        .update({ data_envio: new Date().toISOString(), email: resendEmail || null })
        .eq("id", resendDialog.trackingId);
      if (error) {
        toast.error(error.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["cotacao-tracking", selectedId] });

      // Try to send via Edge Function with PDF
      if (pdfBlob) {
        try {
          const numOrc = `#${cotacao.id.slice(0, 8)}`;
          const pdfBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(pdfBlob);
          });

          const token = await ensureToken(cotacao.id, cotacao.token_publico);
          if (!token) throw new Error("Falha ao gerar token");

          const link = `${window.location.origin}/cotacao/${token}?fornecedor=${resendDialog.fornecedorId}`;
          const result = await supabase.functions.invoke("enviar-cotacao-espelho", {
            body: {
              email: resendEmail,
              fornecedor_nome: resendDialog.fornecedorNome,
              obra_nome: nomeObra,
              cotacao_numero: numOrc,
              cotacao_link: link,
              espelho_pdf_base64: pdfBase64,
            },
          });

          if (result.error) {
            // Fallback: download PDF and open mailto
            downloadPdfAndOpenMailto();
          } else {
            toast.success("Convite reenviado com espelho anexado!");
          }
        } catch (e) {
          // Fallback: download PDF and open mailto
          downloadPdfAndOpenMailto();
        }
      } else {
        downloadPdfAndOpenMailto();
      }

      function downloadPdfAndOpenMailto() {
        // Download PDF
        if (pdfBlob) {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement("a");
          const numOrc = `#${cotacao.id.slice(0, 8)}`;
          a.href = url;
          a.download = `Espelho_Orcamento_${numOrc.replace("#", "")}_${new Date().toISOString().split("T")[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        // Open mailto with instructions
        const token = ensureToken(cotacao.id, cotacao.token_publico);
        if (token) {
          token.then((t) => {
            const link = `${window.location.origin}/cotacao/${t}?fornecedor=${resendDialog.fornecedorId}`;
            const subject = `Solicitação de Orçamento #${cotacao.id.slice(0, 8)} - ${nomeObra}`;
            const body = `Prezado(a) ${resendDialog.fornecedorNome},\n\nReenviamos a cotação referente à obra:\n\n${nomeObra}\n\nEnvie sua proposta pelo link:\n\n${link}\n\nSegue em anexo o espelho do orçamento.\n\nAtenciosamente,\nObraControl`;
            window.open(`mailto:${encodeURIComponent(resendEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
          });
        }
        toast.success("PDF baixado! Anexe-o ao e-mail que foi aberto.");
      }
    } finally {
      setResendLoading(false);
      setResendDialog(null);
    }
  };

  const handlePrintEspelho = async () => {
    const cotacao = selected;
    if (!cotacao || !printItens?.length) {
      toast.error("Adicione itens antes de gerar o espelho");
      return;
    }
    const nomeObra = (cotacao.obras as any)?.nome ?? "Obra";

    let profileData: any = {};
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) profileData = data;
    }

    const html = await generateEspelhoHtml(cotacao, nomeObra, printItens, user, profileData);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const generateEspelhoPdf = async (cotacao: any, nomeObra: string, profileData?: any): Promise<Blob | null> => {
    try {
      const html = await generateEspelhoHtml(cotacao, nomeObra, printItens, user, profileData);
      const element = document.createElement("div");
      element.innerHTML = html;

      const numOrc = `#${cotacao.id.slice(0, 8)}`;
      const filename = `Espelho_Orcamento_${numOrc.replace("#", "")}_${new Date().toISOString().split("T")[0]}.pdf`;

      return new Promise((resolve) => {
        html2pdf().set({
          margin: 10,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, logging: false },
          jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
        }).from(html).outputPdf((pdf: Blob) => {
          resolve(pdf);
        });
      });
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("Erro ao gerar PDF");
      return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto pb-28 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold truncate">
          Cotações {obra ? <>— <span className="text-blue-600 dark:text-blue-400">{obra.nome}</span></> : ""}
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <Button variant="outline" className="w-full sm:w-auto shrink-0" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />Importar Lista
        </Button>
        <Dialog open={newCotacao} onOpenChange={setNewCotacao}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto shrink-0"><Plus className="mr-2 h-4 w-4" />Nova Cotação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Cotação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNewCotacao} className="space-y-4">
              <div className="space-y-2">
                <Label>Obra</Label>
                <p className="text-sm font-medium text-foreground bg-muted rounded-md px-3 py-2">
                  {obra?.nome ?? "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Título da Cotação</Label>
                <Input
                  name="descricao"
                  required
                  autoComplete="off"
                  placeholder="Ex: Material Hidráulico Fase 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Input name="data_expiracao" type="date" />
              </div>
              <Button type="submit" className="w-full" disabled={createCotacao.isPending}>
                {createCotacao.isPending ? "Criando..." : "Criar e Adicionar Itens"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <ImportarProdutosDialog open={importOpen} onOpenChange={setImportOpen} obraId={obraId} obraNome={obra?.nome} />

      {/* Cotações List */}
      <div className="space-y-3">
        {cotacoes?.map((cotacao) => {
          const itemCount = allItensCount?.[cotacao.id] ?? 0;
          const numOrc = `#${cotacao.id.slice(0, 8)}`;
          return (
            <Card key={cotacao.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3 sm:p-4 space-y-2">
                {/* Row 1: title + status */}
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => setSelectedId(cotacao.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{numOrc}</span>
                      <p className="font-medium text-sm sm:text-base leading-snug">{cotacao.descricao}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs sm:text-sm text-muted-foreground truncate">
                        {(cotacao.obras as any)?.nome ?? "—"}
                      </span>
                      {itemCount > 0 ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">📦 {itemCount} ite{itemCount === 1 ? "m" : "ns"}</span>
                      ) : (
                        <span className="text-xs text-destructive font-medium whitespace-nowrap">⚠️ Sem itens</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn("shrink-0 text-xs", statusColors[cotacao.status ?? ""] ?? "")}>
                    {cotacao.status?.replace("_", " ")}
                  </Badge>
                </div>
                {/* Row 2: action buttons */}
                <div className="flex items-center gap-1 border-t pt-2 overflow-x-auto">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 shrink-0" onClick={() => { setManageDialog(cotacao.id); setSelectedProds({}); setProdSearch(""); }}>
                    <PackagePlus className="h-3.5 w-3.5" /> Itens
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 shrink-0" onClick={() => setEditDialog({ id: cotacao.id, descricao: cotacao.descricao, data_expiracao: cotacao.data_expiracao ?? "" })}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 shrink-0 text-destructive" onClick={() => setDeleteConfirm(cotacao.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 shrink-0 ml-auto" onClick={() => copyLink(cotacao.id, cotacao.token_publico)}>
                    <Copy className="h-3.5 w-3.5" /> Link Avulso
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedId(cotacao.id)}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && !cotacoes?.length && (
          <p className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(v) => !v && setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cotação</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCotacao.mutate({
                  id: editDialog.id,
                  descricao: editDialog.descricao,
                  data_expiracao: editDialog.data_expiracao || null,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Título da Cotação</Label>
                <Input
                  value={editDialog.descricao}
                  onChange={(e) => setEditDialog({ ...editDialog, descricao: e.target.value })}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Input
                  type="date"
                  value={editDialog.data_expiracao}
                  onChange={(e) => setEditDialog({ ...editDialog, data_expiracao: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateCotacao.isPending}>
                {updateCotacao.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cotação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta cotação e todos os seus itens, fornecedores e propostas vinculados?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteCotacao.mutate(deleteConfirm)} disabled={deleteCotacao.isPending}>
              {deleteCotacao.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedId}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedId(null);
            if (searchParams.has("open")) {
              searchParams.delete("open");
              setSearchParams(searchParams, { replace: true });
            }
          }
        }}
      >
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{selected ? `#${selected.id.slice(0, 8)}` : ""}</span>
              {selected?.descricao}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 min-w-0">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <code className="flex-1 text-xs truncate min-w-0 block overflow-hidden">
                {selected.token_publico ? `${window.location.origin}/cotacao/${selected.token_publico}` : "Clique para gerar link"}
              </code>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyLink(selected.id, selected.token_publico)}>
                <Copy className="mr-1 h-3 w-3" /> Link Avulso
              </Button>
            </div>
          )}

          {/* Print Button - Blue */}
          <Button size="sm" onClick={handlePrintEspelho} className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
            <Printer className="h-4 w-4" /> Gerar Espelho do Orçamento
          </Button>

          {/* Items list */}
          {printItens && printItens.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold flex items-center gap-2">
                📦 Itens da Cotação
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Unidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printItens.map((item: any, i: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{item.unidade || "un"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Fornecedores Convidados */}
          {tracking && tracking.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold flex items-center gap-2">
                👥 Fornecedores Convidados
              </h3>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead>Data Resposta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracking.map((t: any) => {
                      const status = getInviteStatus(t);
                      const responded = !!t.data_resposta;
                      return (
                        <TableRow
                          key={t.id}
                          className={responded ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => {
                            if (responded) {
                              setViewPropostaDialog({
                                fornecedorId: t.fornecedor_id,
                                fornecedorNome: t.fornecedores?.nome ?? t.email ?? "—",
                              });
                            }
                          }}
                        >
                          <TableCell className="font-medium">{t.fornecedores?.nome ?? t.email ?? "—"}</TableCell>
                          <TableCell className="text-xs">{fmtDateShort(t.data_envio)}</TableCell>
                          <TableCell className="text-xs">{fmtDateShort(t.data_resposta)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-xs", status.color)}>
                              {status.label === "Respondido" && "🟢 "}
                              {status.label === "Pendente" && "🟡 "}
                              {status.label === "Atrasado" && "🔴 "}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!responded && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResendEmail(t.fornecedores?.email ?? t.email ?? "");
                                  setResendDialog({
                                    trackingId: t.id,
                                    fornecedorId: t.fornecedor_id,
                                    fornecedorNome: t.fornecedores?.nome ?? "—",
                                    email: t.fornecedores?.email ?? t.email ?? "",
                                  });
                                }}
                              >
                                <RefreshCw className="h-3 w-3" /> Reenviar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {tracking.map((t: any) => {
                  const status = getInviteStatus(t);
                  const responded = !!t.data_resposta;
                  return (
                    <div
                      key={t.id}
                      className={cn("rounded-lg border p-3 space-y-2", responded && "cursor-pointer")}
                      onClick={() => {
                        if (responded) {
                          setViewPropostaDialog({
                            fornecedorId: t.fornecedor_id,
                            fornecedorNome: t.fornecedores?.nome ?? t.email ?? "—",
                          });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{t.fornecedores?.nome ?? t.email ?? "—"}</span>
                        <Badge variant="secondary" className={cn("gap-1 text-xs", status.color)}>
                          {status.label === "Respondido" && "🟢 "}
                          {status.label === "Pendente" && "🟡 "}
                          {status.label === "Atrasado" && "🔴 "}
                          {status.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span>Envio: {fmtDateShort(t.data_envio)}</span>
                        <span>Resposta: {fmtDateShort(t.data_resposta)}</span>
                      </div>
                      {!responded && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResendEmail(t.fornecedores?.email ?? t.email ?? "");
                            setResendDialog({
                              trackingId: t.id,
                              fornecedorId: t.fornecedor_id,
                              fornecedorNome: t.fornecedores?.nome ?? "—",
                              email: t.fornecedores?.email ?? t.email ?? "",
                            });
                          }}
                        >
                          <RefreshCw className="h-3 w-3" /> Reenviar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Propostas */}
          <div>
            <h3 className="mb-3 font-semibold">Propostas</h3>
            {propostas?.length ? (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Prazo (dias)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propostas.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{(p.fornecedores as any)?.nome ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmt(p.valor)}</TableCell>
                          <TableCell>{p.prazo_dias ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {p.status !== "aceita" && (
                              <Button variant="ghost" size="icon" onClick={() => aceitar.mutate(p.id)} title="Aceitar proposta">
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-2 md:hidden">
                  {propostas.map((p) => (
                    <div key={p.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{(p.fornecedores as any)?.nome ?? "—"}</span>
                        <Badge variant="secondary">{p.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-primary font-semibold">{fmt(p.valor)}</span>
                        <span className="text-muted-foreground">{p.prazo_dias ? `${p.prazo_dias} dias` : "—"}</span>
                      </div>
                      {p.status !== "aceita" && (
                        <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => aceitar.mutate(p.id)}>
                          <Check className="mr-1 h-3 w-3" /> Aceitar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma proposta recebida</p>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {propostas && propostas.length >= 2 && (
                <>
                  <Button className="flex-1" onClick={() => { const cotId = selectedId; setSelectedId(null); navigate(`/obras/${obraId}/cotacoes/${cotId}/comparar`); }}>
                    <BarChart3 className="mr-2 h-4 w-4" /> Comparar
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { const cotId = selectedId; setSelectedId(null); navigate(`/obras/${obraId}/cotacoes/${cotId}/analise`); }}>
                    <Brain className="mr-2 h-4 w-4" /> Análise IA
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resend Dialog */}
      <Dialog open={!!resendDialog} onOpenChange={(v) => !v && !resendLoading && setResendDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reenviar Convite</DialogTitle>
          </DialogHeader>
          {resendDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reenviar convite para <strong>{resendDialog.fornecedorNome}</strong>
                <br />
                <span className="text-xs text-green-600 mt-1 block">📎 O espelho do orçamento será anexado</span>
              </p>
              <div className="space-y-2">
                <Label>E-mail do Fornecedor</Label>
                <Input
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="email@fornecedor.com"
                  type="email"
                  disabled={resendLoading}
                />
              </div>
              <Button className="w-full" onClick={handleResend} disabled={resendLoading || !resendEmail}>
                {resendLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Reenviar com Espelho
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Proposta Dialog */}
      <Dialog open={!!viewPropostaDialog} onOpenChange={(v) => !v && setViewPropostaDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Proposta — {viewPropostaDialog?.fornecedorNome}</DialogTitle>
          </DialogHeader>
          {viewPropostaData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold text-primary">{fmt(viewPropostaData.valor)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="text-lg font-bold">{viewPropostaData.prazo_dias ? `${viewPropostaData.prazo_dias} dias` : "—"}</p>
                </div>
              </div>
              {(viewPropostaData as any).proposta_itens?.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewPropostaData as any).proposta_itens.map((pi: any) => (
                      <TableRow key={pi.id}>
                        <TableCell>{pi.nome}</TableCell>
                        <TableCell>{pi.quantidade}</TableCell>
                        <TableCell>{fmt(pi.valor_unitario)}</TableCell>
                        <TableCell>{fmt(pi.quantidade * pi.valor_unitario)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Dialog with Tabs: Items + Fornecedores */}
      <Dialog open={!!manageDialog} onOpenChange={(v) => { if (!v) { setManageDialog(null); setSelectedProds({}); setProdSearch(""); setSelectedFornecedores([]); } }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Gerenciar Cotação</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="itens" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="itens">📦 Itens do Orçamento</TabsTrigger>
              <TabsTrigger value="fornecedores">👥 Fornecedores</TabsTrigger>
            </TabsList>

            {/* Tab 1: Itens */}
            <TabsContent value="itens" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Selecionar do catálogo</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto ou categoria..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border p-2 space-y-2">
                  {Object.keys(groupedProducts).length ? (
                    Object.entries(groupedProducts).map(([cat, prods]) => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">{cat}</p>
                        {prods.map((p: any) => (
                          <label
                            key={p.id}
                            className={cn(
                              "flex items-center gap-3 rounded-md p-2 cursor-pointer transition-colors",
                              selectedProds[p.id] ? "bg-primary/10" : "hover:bg-muted"
                            )}
                          >
                            <Checkbox
                              checked={!!selectedProds[p.id]}
                              onCheckedChange={() => toggleProd(p)}
                            />
                            <span className="flex-1 text-sm">{p.nome}</span>
                            <span className="text-xs text-muted-foreground">{p.unidade}</span>
                            {selectedProds[p.id] && (
                              <Input
                                type="number"
                                min="1"
                                value={selectedProds[p.id].qtd}
                                onChange={(e) => { e.stopPropagation(); updateProdQtd(p.id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 h-7 text-xs"
                                placeholder="Qtd"
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      {produtosCatalog?.length ? "Nenhum produto encontrado" : "Cadastre produtos na página Produtos"}
                    </p>
                  )}
                </div>
                {Object.keys(selectedProds).length > 0 && (
                  <Button onClick={handleAddSelectedProducts} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar {Object.keys(selectedProds).length} produto(s)
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ou adicionar manualmente</Label>
                <div className="flex gap-2">
                  <Input placeholder="Nome do item" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-1" autoComplete="off" />
                  <Input placeholder="Qtd" type="number" value={newItemQtd} onChange={(e) => setNewItemQtd(e.target.value)} className="w-20" />
                  <Input placeholder="Un" value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="w-16" />
                  <Button size="icon" onClick={handleAddItem} disabled={addItem.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {itens?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Un</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item definido. Adicione itens para os fornecedores preencherem.
                </p>
              )}
            </TabsContent>

            {/* Tab 2: Fornecedores */}
            <TabsContent value="fornecedores" className="space-y-4">
              <div className="space-y-2">
                <Label>Prazo para resposta (dias)</Label>
                <Input type="number" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} min="1" className="w-32" />
              </div>

              <div className="space-y-2">
                <Label>Selecione os fornecedores</Label>
                <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border p-2">
                  {fornecedoresDb?.length ? fornecedoresDb.map((f) => (
                    <label
                      key={f.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2 cursor-pointer transition-colors",
                        selectedFornecedores.includes(f.id) ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={selectedFornecedores.includes(f.id)}
                        onCheckedChange={() => toggleFornecedor(f.id)}
                      />
                      <div>
                        <p className="text-sm font-medium">{f.nome}</p>
                        {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                      </div>
                    </label>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum fornecedor cadastrado
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSendToFornecedores}
                disabled={!selectedFornecedores.length || enviarCotacao.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {enviarCotacao.isPending ? "Enviando..." : `📧 Enviar para ${selectedFornecedores.length} fornecedor(es)`}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function Cotacoes() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Cotações">
      {id && <CotacoesContent obraId={id} />}
    </RequireObra>
  );
}
