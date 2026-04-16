import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Obra {
  id: string;
  nome: string;
  valor_previsto: number | null;
  status: string | null;
  main_image: string | null;
}

interface ObraAtivaContextType {
  /** The selected obra id, or "all" for all obras, or null if loading */
  obraAtivaId: string | null;
  setObraAtivaId: (id: string | null) => void;
  obraAtiva: Obra | null;
  obras: Obra[];
  isLoading: boolean;
  /** Convenience: true when viewing all obras (obraAtivaId === "all") */
  isAll: boolean;
  /** The effective filter id: null when "all", otherwise the obra id */
  filtroObraId: string | null;
}

const ObraAtivaContext = createContext<ObraAtivaContextType>({
  obraAtivaId: null,
  setObraAtivaId: () => {},
  obraAtiva: null,
  obras: [],
  isLoading: true,
  isAll: false,
  filtroObraId: null,
});

export function ObraAtivaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [obraAtivaId, setObraAtivaIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("obra_ativa_id") || null;
    } catch {
      return null;
    }
  });

  const { data: obras = [], isLoading } = useQuery({
    queryKey: ["obras-lista", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, valor_previsto, status, main_image")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Obra[];
    },
  });

  // Auto-select first obra if none selected
  useEffect(() => {
    if (!isLoading && obras.length > 0 && !obraAtivaId) {
      setObraAtivaId(obras[0].id);
    }
    // Clear selection if stored id doesn't exist in user's obras (but allow "all")
    if (
      !isLoading &&
      obras.length > 0 &&
      obraAtivaId &&
      obraAtivaId !== "all" &&
      !obras.find((o) => o.id === obraAtivaId)
    ) {
      setObraAtivaId(obras[0].id);
    }
  }, [obras, isLoading, obraAtivaId]);

  const setObraAtivaId = (id: string | null) => {
    setObraAtivaIdState(id);
    try {
      if (id) localStorage.setItem("obra_ativa_id", id);
      else localStorage.removeItem("obra_ativa_id");
    } catch {}
  };

  const isAll = obraAtivaId === "all";
  const obraAtiva = isAll ? null : (obras.find((o) => o.id === obraAtivaId) ?? null);
  const filtroObraId = isAll ? null : obraAtivaId;

  return (
    <ObraAtivaContext.Provider value={{ obraAtivaId, setObraAtivaId, obraAtiva, obras, isLoading, isAll, filtroObraId }}>
      {children}
    </ObraAtivaContext.Provider>
  );
}

export function useObraAtiva() {
  return useContext(ObraAtivaContext);
}
