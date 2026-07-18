export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      catalogo_tipos_obra: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      catalogo_ambientes: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      catalogo_servicos: {
        Row: {
          id: string
          nome: string
          nome_normalizado: string
          descricao: string | null
          prioridade: number | null
          tempo_medio_dias: number | null
          observacoes: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          nome_normalizado: string
          descricao?: string | null
          prioridade?: number | null
          tempo_medio_dias?: number | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          nome_normalizado?: string
          descricao?: string | null
          prioridade?: number | null
          tempo_medio_dias?: number | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      catalogo_templates: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      catalogo_template_tipos_obra: {
        Row: {
          template_id: string
          tipo_obra_id: string
        }
        Insert: {
          template_id: string
          tipo_obra_id: string
        }
        Update: {
          template_id?: string
          tipo_obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_template_tipos_obra_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "catalogo_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_template_tipos_obra_tipo_obra_id_fkey"
            columns: ["tipo_obra_id"]
            isOneToOne: false
            referencedRelation: "catalogo_tipos_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_template_ambientes: {
        Row: {
          template_id: string
          ambiente_id: string
          obrigatorio: boolean
        }
        Insert: {
          template_id: string
          ambiente_id: string
          obrigatorio?: boolean
        }
        Update: {
          template_id?: string
          ambiente_id?: string
          obrigatorio?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_template_ambientes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "catalogo_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_template_ambientes_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "catalogo_ambientes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_template_servicos: {
        Row: {
          template_id: string
          servico_id: string
          ambiente_id: string | null
          ordem: number | null
          obrigatorio: boolean
        }
        Insert: {
          template_id: string
          servico_id: string
          ambiente_id?: string | null
          ordem?: number | null
          obrigatorio?: boolean
        }
        Update: {
          template_id?: string
          servico_id?: string
          ambiente_id?: string | null
          ordem?: number | null
          obrigatorio?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_template_servicos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "catalogo_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_template_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_template_servicos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "catalogo_ambientes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_servico_etapas: {
        Row: {
          id: string
          servico_id: string
          nome: string
          ordem: number
          tempo_medio_dias: number | null
          created_at: string
        }
        Insert: {
          id?: string
          servico_id: string
          nome: string
          ordem?: number
          tempo_medio_dias?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          servico_id?: string
          nome?: string
          ordem?: number
          tempo_medio_dias?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_servico_etapas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_etapa_tarefas: {
        Row: {
          id: string
          etapa_id: string
          nome: string
          descricao: string | null
          ordem: number
          criterios_qualidade: string | null
          created_at: string
        }
        Insert: {
          id?: string
          etapa_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          criterios_qualidade?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          etapa_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          criterios_qualidade?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_etapa_tarefas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servico_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_servico_insumos_padrao: {
        Row: {
          id: string
          servico_id: string
          nome_insumo: string
          unidade: string
          quantidade_sugerida: number
          perda_percentual: number
          created_at: string
        }
        Insert: {
          id?: string
          servico_id: string
          nome_insumo: string
          unidade: string
          quantidade_sugerida: number
          perda_percentual?: number
          created_at?: string
        }
        Update: {
          id?: string
          servico_id?: string
          nome_insumo?: string
          unidade?: string
          quantidade_sugerida?: number
          perda_percentual?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_servico_insumos_padrao_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_servicos: {
        Row: {
          id: string
          obra_id: string
          catalogo_servico_id: string | null
          ambiente_id: string | null
          nome: string
          ordem: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          obra_id: string
          catalogo_servico_id?: string | null
          ambiente_id?: string | null
          nome: string
          ordem?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          obra_id?: string
          catalogo_servico_id?: string | null
          ambiente_id?: string | null
          nome?: string
          ordem?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_servicos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_servicos_catalogo_servico_id_fkey"
            columns: ["catalogo_servico_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_servicos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "catalogo_ambientes"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_servico_insumos: {
        Row: {
          id: string
          obra_servico_id: string
          produto_id: string | null
          nome_insumo: string
          unidade: string
          quantidade_sugerida: number
          perda_percentual: number
          quantidade_final: number
          compra_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          obra_servico_id: string
          produto_id?: string | null
          nome_insumo: string
          unidade: string
          quantidade_sugerida: number
          perda_percentual?: number
          quantidade_final?: number
          compra_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          obra_servico_id?: string
          produto_id?: string | null
          nome_insumo?: string
          unidade?: string
          quantidade_sugerida?: number
          perda_percentual?: number
          quantidade_final?: number
          compra_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_servico_insumos_obra_servico_id_fkey"
            columns: ["obra_servico_id"]
            isOneToOne: false
            referencedRelation: "obra_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_servico_insumos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_servico_insumos_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {}
    Functions: {
      fn_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
