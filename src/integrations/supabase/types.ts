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
      alertas_sistema: {
        Row: {
          created_at: string | null
          entidade: string | null
          entidade_id: string | null
          id: string
          mensagem: string | null
          resolvido: boolean | null
          tenant_id: string | null
          tipo: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          mensagem?: string | null
          resolvido?: boolean | null
          tenant_id?: string | null
          tipo?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          mensagem?: string | null
          resolvido?: boolean | null
          tenant_id?: string | null
          tipo?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      Atualização_Automatica_n8n: {
        Row: {
          created_at: string
          id: number
          update_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          update_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          update_at?: string | null
        }
        Relationships: []
      }
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
      categorias_produtos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          created_at: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          obra_id: string
          observacao: string | null
          produto_id: string | null
          quantidade: number | null
          status: string | null
          tenant_id: string | null
          user_id: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id: string
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id?: string
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "cotacao_fornecedores_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "cotacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
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
          tenant_id: string | null
          tipo: string | null
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          obra_id: string
          tamanho_bytes?: number | null
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          obra_id?: string
          tamanho_bytes?: number | null
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string | null
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
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_padrao: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      fase_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          fase_id: string
          id: string
          obra_id: string
          tipo: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          fase_id: string
          id?: string
          obra_id: string
          tipo: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          fase_id?: string
          id?: string
          obra_id?: string
          tipo?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fase_fotos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "obra_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_fotos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["fase_id"]
          },
          {
            foreignKeyName: "fase_fotos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_fase_eficiencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_fotos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_fases_previsao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "fase_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "fase_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      fase_itens: {
        Row: {
          created_at: string | null
          fase_id: string
          id: string
          nome: string
          status: string | null
          tenant_id: string | null
          valor_previsto: number | null
          valor_real: number | null
        }
        Insert: {
          created_at?: string | null
          fase_id: string
          id?: string
          nome: string
          status?: string | null
          tenant_id?: string | null
          valor_previsto?: number | null
          valor_real?: number | null
        }
        Update: {
          created_at?: string | null
          fase_id?: string
          id?: string
          nome?: string
          status?: string | null
          tenant_id?: string | null
          valor_previsto?: number | null
          valor_real?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fase_itens_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "obra_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_itens_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["fase_id"]
          },
          {
            foreignKeyName: "fase_itens_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_fase_eficiencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_itens_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_fases_previsao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fase_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          fase_id: string | null
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
          fase_id?: string | null
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
          fase_id?: string | null
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
            foreignKeyName: "financeiro_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "obra_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["fase_id"]
          },
          {
            foreignKeyName: "financeiro_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_fase_eficiencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "vw_fases_previsao"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "financeiro_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
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
          tenant_id: string | null
          total_convites: number | null
          total_respostas: number | null
          total_vitorias: number | null
          updated_at: string | null
        }
        Insert: {
          fornecedor_id: string
          score?: number | null
          tempo_medio_resposta?: number | null
          tenant_id?: string | null
          total_convites?: number | null
          total_respostas?: number | null
          total_vitorias?: number | null
          updated_at?: string | null
        }
        Update: {
          fornecedor_id?: string
          score?: number | null
          tempo_medio_resposta?: number | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "fornecedor_metricas_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          categoria: string | null
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
          categoria?: string | null
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
          categoria?: string | null
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
          tenant_id: string | null
        }
        Insert: {
          cotacao_id: string
          created_at?: string | null
          data_envio?: string | null
          fornecedor_id: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          cotacao_id?: string
          created_at?: string | null
          data_envio?: string | null
          fornecedor_id?: string
          id?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "fornecedores_cotacao_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          unidade: string | null
        }
        Insert: {
          cotacao_id: string
          created_at?: string | null
          id?: string
          nome: string
          quantidade?: number
          tenant_id?: string | null
          unidade?: string | null
        }
        Update: {
          cotacao_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          quantidade?: number
          tenant_id?: string | null
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
          {
            foreignKeyName: "itens_cotacao_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_alteracoes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          justificativa: string | null
          obra_id: string
          tipo: string
          user_id: string
          valor_impacto: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          justificativa?: string | null
          obra_id: string
          tipo: string
          user_id: string
          valor_impacto?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          justificativa?: string | null
          obra_id?: string
          tipo?: string
          user_id?: string
          valor_impacto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_alteracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_alteracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_alteracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_alteracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_dossie: {
        Row: {
          created_at: string | null
          dados: Json | null
          descricao: string | null
          id: string
          obra_id: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dados?: Json | null
          descricao?: string | null
          id?: string
          obra_id: string
          tipo: string
          titulo: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          dados?: Json | null
          descricao?: string | null
          id?: string
          obra_id?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_dossie_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_dossie_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_dossie_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_dossie_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_fases: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
          obra_id: string
          ordem: number | null
          progresso: number | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
          obra_id: string
          ordem?: number | null
          progresso?: number | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
          obra_id?: string
          ordem?: number | null
          progresso?: number | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_fases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          classificacao: string | null
          created_at: string | null
          data_inicio: string | null
          data_prevista_conclusao: string | null
          descricao: string | null
          escopo_ia: string | null
          id: string
          localizacao: string | null
          nome: string
          profissional_recomendado: string | null
          status: Database["public"]["Enums"]["status_obra"] | null
          tenant_id: string | null
          tipo_obra: string | null
          updated_at: string | null
          user_id: string
          valor_disponivel: number | null
          valor_previsto: number | null
        }
        Insert: {
          classificacao?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          descricao?: string | null
          escopo_ia?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          profissional_recomendado?: string | null
          status?: Database["public"]["Enums"]["status_obra"] | null
          tenant_id?: string | null
          tipo_obra?: string | null
          updated_at?: string | null
          user_id: string
          valor_disponivel?: number | null
          valor_previsto?: number | null
        }
        Update: {
          classificacao?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          descricao?: string | null
          escopo_ia?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          profissional_recomendado?: string | null
          status?: Database["public"]["Enums"]["status_obra"] | null
          tenant_id?: string | null
          tipo_obra?: string | null
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
      produtos: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          id: string
          nome: string
          unidade: string | null
          user_id: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          unidade?: string | null
          user_id?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          unidade?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
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
          tenant_id: string | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          proposta_id: string
          quantidade?: number
          tenant_id?: string | null
          valor_unitario?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          proposta_id?: string
          quantidade?: number
          tenant_id?: string | null
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
          {
            foreignKeyName: "proposta_itens_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      tipos_obra: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      unidades_medida: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      voz_comandos_log: {
        Row: {
          comando: string | null
          created_at: string | null
          id: string
          interpretacao: string | null
          tenant_id: string
        }
        Insert: {
          comando?: string | null
          created_at?: string | null
          id?: string
          interpretacao?: string | null
          tenant_id: string
        }
        Update: {
          comando?: string | null
          created_at?: string | null
          id?: string
          interpretacao?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_alertas_inteligentes: {
        Row: {
          data_fim: string | null
          fase: string | null
          fase_id: string | null
          obra: string | null
          obra_id: string | null
          progresso: number | null
          status_ia: string | null
        }
        Relationships: []
      }
      vw_fase_eficiencia: {
        Row: {
          eficiencia_percentual: number | null
          id: string | null
          nome: string | null
          previsto: number | null
          real: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_fases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fases_previsao: {
        Row: {
          atrasado: boolean | null
          data_fim: string | null
          data_inicio: string | null
          dias_decorridos: number | null
          dias_planejados: number | null
          diferenca_progresso: number | null
          id: string | null
          nome: string | null
          obra_id: string | null
          progresso: number | null
          progresso_esperado: number | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          atrasado?: never
          data_fim?: string | null
          data_inicio?: string | null
          dias_decorridos?: never
          dias_planejados?: never
          diferenca_progresso?: never
          id?: string | null
          nome?: string | null
          obra_id?: string | null
          progresso?: number | null
          progresso_esperado?: never
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          atrasado?: never
          data_fim?: string | null
          data_inicio?: string | null
          dias_decorridos?: never
          dias_planejados?: never
          diferenca_progresso?: never
          id?: string | null
          nome?: string | null
          obra_id?: string | null
          progresso?: number | null
          progresso_esperado?: never
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_fases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_progresso_obra: {
        Row: {
          obra_id: string | null
          progresso_geral: number | null
          tenant_id: string | null
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
      vw_sugestao_compra: {
        Row: {
          acao: string | null
          diferenca: number | null
          fase: string | null
          id: string | null
          item: string | null
          obra_id: string | null
          valor_previsto: number | null
          valor_real: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_inteligentes"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_progresso_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_fases_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      atualizar_progresso_fase: { Args: { f_id: string }; Returns: undefined }
      atualizar_ranking_fornecedor: {
        Args: { f_id: string }
        Returns: undefined
      }
      avaliar_fornecedor: { Args: { f_id: string }; Returns: undefined }
      current_tenant_id: { Args: never; Returns: string }
      expirar_cotacoes: { Args: never; Returns: undefined }
      fn_criar_cotacao_automatica: {
        Args: { p_complexidade: string; p_descricao: string; p_obra_id: string }
        Returns: string
      }
      fn_criar_cotacao_com_fornecedores: {
        Args: {
          p_descricao: string
          p_fornecedores_ids: string[]
          p_obra_id: string
        }
        Returns: string
      }
      fn_criar_obra_inteligente: {
        Args: {
          p_classificacao?: string
          p_descricao?: string
          p_nome: string
          p_tipo?: string
        }
        Returns: string
      }
      fn_sugerir_fornecedores: {
        Args: { p_complexidade: string }
        Returns: {
          categoria: string
          id: string
          nome: string
        }[]
      }
      fn_sugerir_top3_fornecedores: {
        Args: { p_complexidade: string }
        Returns: {
          categoria: string
          id: string
          nome: string
        }[]
      }
      gerar_alertas_fase:
        | {
            Args: never
            Returns: {
              fase_id: string
              mensagem: string
              nome: string
              tipo: string
            }[]
          }
        | {
            Args: { p_obra_id: string }
            Returns: {
              fase_id: string
              mensagem: string
              nome: string
              tipo: string
            }[]
          }
      gerar_alertas_sistema: { Args: { p_user_id: string }; Returns: undefined }
      interpretar_comando_voz: { Args: { p_texto: string }; Returns: string }
      is_admin_global: { Args: never; Returns: boolean }
      mensagem_dia: { Args: { p_obra: string }; Returns: string }
      processar_alertas: { Args: never; Returns: undefined }
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
