import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Obra {
  id: string;
  nome: string;
  valor_previsto: number | null;
  status: string | null;
}

interface ObraAtivaContextType {
  obraAtivaId: string | null;
  setObraAtivaId: (id: string | null) => void;
  obraAtiva: Obra | null;
  obras: Obra[];
  isLoading: boolean;
}

const ObraAtivaContext = createContext<ObraAtivaContextType>({
  obraAtivaId: null,
  setObraAtivaId: () => {},
  obraAtiva: null,
  obras: [],
  isLoading: true,
});

export function ObraAtivaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [obraAtivaId, setObraAtivaIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("obra_ativa_id");
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
        .select("id, nome, valor_previsto, status")
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
    // Clear selection if stored id doesn't exist in user's obras
    if (!isLoading && obras.length > 0 && obraAtivaId && !obras.find((o) => o.id === obraAtivaId)) {
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

  const obraAtiva = obras.find((o) => o.id === obraAtivaId) ?? null;

  return (
    <ObraAtivaContext.Provider value={{ obraAtivaId, setObraAtivaId, obraAtiva, obras, isLoading }}>
      {children}
    </ObraAtivaContext.Provider>
  );
}

export function useObraAtiva() {
  return useContext(ObraAtivaContext);
}
