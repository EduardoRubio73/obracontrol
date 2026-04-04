export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string | null
          created_at: string | null
          dados_antigos: Json | null
          dados_novos: Json | null
          id: string
          id_registro: string | null
          tabela: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          acao?: string | null
          created_at?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          id_registro?: string | null
          tabela?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          acao?: string | null
          created_at?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          id_registro?: string | null
          tabela?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_fornecedores: {
        Row: {
          cotacao_id: string
          created_at: string | null
          data_envio: string | null
          data_resposta: string | null
          data_visualizacao: string | null
          email: string | null
          fornecedor_id: string
          id: string
          prazo_limite: string | null
          status: string | null
        }
        Insert: {
          cotacao_id: string
          created_at?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          data_visualizacao?: string | null
          email?: string | null
          fornecedor_id: string
          id?: string
          prazo_limite?: string | null
          status?: string | null
        }
        Update: {
          cotacao_id?: string
          created_at?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          data_visualizacao?: string | null
          email?: string | null
          fornecedor_id?: string
          id?: string
          prazo_limite?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_fornecedores_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_fornecedores_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "vw_propostas_comparativo"
            referencedColumns: ["cotacao_id"]
          },
          {
            foreignKeyName: "cotacao_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          created_at: string | null
          data_criacao: string | null
          data_envio: string | null
          data_expiracao: string | null
          descricao: string
          id: string
          obra_id: string
          proposta_aceita_id: string | null
          status: Database["public"]["Enums"]["status_cotacao"] | null
          tenant_id: string | null
          token_publico: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_criacao?: string | null
          data_envio?: string | null
          data_expiracao?: string | null
          descricao: string
          id?: string
          obra_id: string
          proposta_aceita_id?: string | null
          status?: Database["public"]["Enums"]["status_cotacao"] | null
          tenant_id?: string | null
          token_publico?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_criacao?: string | null
          data_envio?: string | null
          data_expiracao?: string | null
          descricao?: string
          id?: string
          obra_id?: string
          proposta_aceita_id?: string | null
          status?: Database["public"]["Enums"]["status_cotacao"] | null
          tenant_id?: string | null
          token_publico?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          obra_id: string
          tamanho_bytes: number | null
          tipo: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          obra_id: string
          tamanho_bytes?: number | null
          tipo?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          obra_id?: string
          tamanho_bytes?: number | null
          tipo?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro: {
        Row: {
          anexo_url: string | null
          comprovante_url: string | null
          created_at: string | null
          data_transacao: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          obra_id: string
          proposta_id: string | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["tipo_financeiro"] | null
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          anexo_url?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          data_transacao?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id: string
          proposta_id?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_financeiro"] | null
          updated_at?: string | null
          user_id?: string
          valor: number
        }
        Update: {
          anexo_url?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          data_transacao?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id?: string
          proposta_id?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_financeiro"] | null
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_metricas: {
        Row: {
          fornecedor_id: string
          score: number | null
          tempo_medio_resposta: number | null
          total_convites: number | null
          total_respostas: number | null
          total_vitorias: number | null
          updated_at: string | null
        }
        Insert: {
          fornecedor_id: string
          score?: number | null
          tempo_medio_resposta?: number | null
          total_convites?: number | null
          total_respostas?: number | null
          total_vitorias?: number | null
          updated_at?: string | null
        }
        Update: {
          fornecedor_id?: string
          score?: number | null
          tempo_medio_resposta?: number | null
          total_convites?: number | null
          total_respostas?: number | null
          total_vitorias?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_metricas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          score: number | null
          status: string | null
          telefone: string | null
          tenant_id: string | null
          tipo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          score?: number | null
          status?: string | null
          telefone?: string | null
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          score?: number | null
          status?: string | null
          telefone?: string | null
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_cotacao: {
        Row: {
          cotacao_id: string
          created_at: string | null
          data_envio: string | null
          fornecedor_id: string
          id: string
        }
        Insert: {
          cotacao_id: string
          created_at?: string | null
          data_envio?: string | null
          fornecedor_id: string
          id?: string
        }
        Update: {
          cotacao_id?: string
          created_at?: string | null
          data_envio?: string | null
          fornecedor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_cotacao_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedores_cotacao_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "vw_propostas_comparativo"
            referencedColumns: ["cotacao_id"]
          },
          {
            foreignKeyName: "fornecedores_cotacao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_cotacao: {
        Row: {
          cotacao_id: string
          created_at: string | null
          id: string
          nome: string
          quantidade: number
          unidade: string | null
        }
        Insert: {
          cotacao_id: string
          created_at?: string | null
          id?: string
          nome: string
          quantidade?: number
          unidade?: string | null
        }
        Update: {
          cotacao_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          quantidade?: number
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_cotacao_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_cotacao_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "vw_propostas_comparativo"
            referencedColumns: ["cotacao_id"]
          },
        ]
      }
      obras: {
        Row: {
          created_at: string | null
          data_inicio: string | null
          data_prevista_conclusao: string | null
          descricao: string | null
          id: string
          localizacao: string | null
          nome: string
          status: Database["public"]["Enums"]["status_obra"] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          valor_disponivel: number | null
          valor_previsto: number | null
        }
        Insert: {
          created_at?: string | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          descricao?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          status?: Database["public"]["Enums"]["status_obra"] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          valor_disponivel?: number | null
          valor_previsto?: number | null
        }
        Update: {
          created_at?: string | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          descricao?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["status_obra"] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          valor_disponivel?: number | null
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposta_itens: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          proposta_id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          proposta_id: string
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          proposta_id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          arquivo_url: string | null
          cotacao_id: string
          created_at: string | null
          data_validade: string | null
          fornecedor_id: string
          id: string
          observacoes: string | null
          prazo_dias: number | null
          status: Database["public"]["Enums"]["status_proposta"] | null
          tenant_id: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          cotacao_id: string
          created_at?: string | null
          data_validade?: string | null
          fornecedor_id: string
          id?: string
          observacoes?: string | null
          prazo_dias?: number | null
          status?: Database["public"]["Enums"]["status_proposta"] | null
          tenant_id?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          arquivo_url?: string | null
          cotacao_id?: string
          created_at?: string | null
          data_validade?: string | null
          fornecedor_id?: string
          id?: string
          observacoes?: string | null
          prazo_dias?: number | null
          status?: Database["public"]["Enums"]["status_proposta"] | null
          tenant_id?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "vw_propostas_comparativo"
            referencedColumns: ["cotacao_id"]
          },
          {
            foreignKeyName: "propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          nome: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_propostas_comparativo: {
        Row: {
          cotacao_id: string | null
          fornecedor: string | null
          ranking: number | null
          valor: number | null
        }
        Relationships: []
      }
      vw_proximos_prazos: {
        Row: {
          data: string | null
          dias_restantes: number | null
          id: string | null
          obra: string | null
          tipo: string | null
        }
        Relationships: []
      }
      vw_resumo_financeiro: {
        Row: {
          id: string | null
          nome: string | null
          saldo: number | null
          total_gasto: number | null
          valor_previsto: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      atualizar_ranking_fornecedor: {
        Args: { f_id: string }
        Returns: undefined
      }
      avaliar_fornecedor: { Args: { f_id: string }; Returns: undefined }
      current_tenant_id: { Args: never; Returns: string }
      expirar_cotacoes: { Args: never; Returns: undefined }
    }
    Enums: {
      status_cotacao:
        | "rascunho"
        | "enviada"
        | "recebendo_propostas"
        | "comparando"
        | "finalizada"
        | "cancelada"
      status_obra:
        | "planejamento"
        | "execução"
        | "concluído"
        | "pausado"
        | "cancelado"
      status_proposta: "enviada" | "recebida" | "aceita" | "rejeitada"
      tipo_financeiro: "despesa" | "receita" | "adiantamento" | "reembolso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_cotacao: [
        "rascunho",
        "enviada",
        "recebendo_propostas",
        "comparando",
        "finalizada",
        "cancelada",
      ],
      status_obra: [
        "planejamento",
        "execução",
        "concluído",
        "pausado",
        "cancelado",
      ],
      status_proposta: ["enviada", "recebida", "aceita", "rejeitada"],
      tipo_financeiro: ["despesa", "receita", "adiantamento", "reembolso"],
    },
  },
} as const
