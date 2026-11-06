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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blog_artigos: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          capa_url: string | null
          categoria_id: string | null
          conteudo: Json | null
          conteudo_html: string | null
          created_at: string
          destaque: boolean
          empresa_id: string
          id: string
          publicado_em: string | null
          receita: Json | null
          resumo: string | null
          slug: string
          status: string
          subtitulo: string | null
          tempo_leitura_min: number | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          capa_url?: string | null
          categoria_id?: string | null
          conteudo?: Json | null
          conteudo_html?: string | null
          created_at?: string
          destaque?: boolean
          empresa_id: string
          id?: string
          publicado_em?: string | null
          receita?: Json | null
          resumo?: string | null
          slug: string
          status?: string
          subtitulo?: string | null
          tempo_leitura_min?: number | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          capa_url?: string | null
          categoria_id?: string | null
          conteudo?: Json | null
          conteudo_html?: string | null
          created_at?: string
          destaque?: boolean
          empresa_id?: string
          id?: string
          publicado_em?: string | null
          receita?: Json | null
          resumo?: string | null
          slug?: string
          status?: string
          subtitulo?: string | null
          tempo_leitura_min?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_artigos_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "blog_categorias"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "blog_artigos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_artigos_produtos: {
        Row: {
          artigo_id: string
          created_at: string
          empresa_id: string
          produto_id: string
          updated_at: string
        }
        Insert: {
          artigo_id: string
          created_at?: string
          empresa_id: string
          produto_id: string
          updated_at?: string
        }
        Update: {
          artigo_id?: string
          created_at?: string
          empresa_id?: string
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_artigos_produtos_empresa_id_artigo_id_fkey"
            columns: ["empresa_id", "artigo_id"]
            isOneToOne: false
            referencedRelation: "blog_artigos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "blog_artigos_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_artigos_produtos_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      blog_artigos_tags: {
        Row: {
          artigo_id: string
          created_at: string
          empresa_id: string
          tag_id: string
          updated_at: string
        }
        Insert: {
          artigo_id: string
          created_at?: string
          empresa_id: string
          tag_id: string
          updated_at?: string
        }
        Update: {
          artigo_id?: string
          created_at?: string
          empresa_id?: string
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_artigos_tags_empresa_id_artigo_id_fkey"
            columns: ["empresa_id", "artigo_id"]
            isOneToOne: false
            referencedRelation: "blog_artigos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "blog_artigos_tags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_artigos_tags_empresa_id_tag_id_fkey"
            columns: ["empresa_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      blog_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_imagens: {
        Row: {
          artigo_id: string
          created_at: string
          empresa_id: string
          id: string
          legenda: string | null
          ordem: number
          updated_at: string
          url: string
        }
        Insert: {
          artigo_id: string
          created_at?: string
          empresa_id: string
          id?: string
          legenda?: string | null
          ordem?: number
          updated_at?: string
          url: string
        }
        Update: {
          artigo_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          legenda?: string | null
          ordem?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_imagens_empresa_id_artigo_id_fkey"
            columns: ["empresa_id", "artigo_id"]
            isOneToOne: false
            referencedRelation: "blog_artigos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "blog_imagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_receita_ingredientes: {
        Row: {
          artigo_id: string
          created_at: string
          descricao: string
          empresa_id: string
          grupo: string | null
          id: string
          insumo_id: string | null
          ordem: number
          quantidade: number | null
          unidade_codigo: string | null
          updated_at: string
        }
        Insert: {
          artigo_id: string
          created_at?: string
          descricao: string
          empresa_id: string
          grupo?: string | null
          id?: string
          insumo_id?: string | null
          ordem?: number
          quantidade?: number | null
          unidade_codigo?: string | null
          updated_at?: string
        }
        Update: {
          artigo_id?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          grupo?: string | null
          id?: string
          insumo_id?: string | null
          ordem?: number
          quantidade?: number | null
          unidade_codigo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_receita_ingredientes_empresa_id_artigo_id_fkey"
            columns: ["empresa_id", "artigo_id"]
            isOneToOne: false
            referencedRelation: "blog_artigos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "blog_receita_ingredientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_receita_ingredientes_empresa_id_insumo_id_fkey"
            columns: ["empresa_id", "insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "blog_receita_ingredientes_unidade_codigo_fkey"
            columns: ["unidade_codigo"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_tags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          grupo: string | null
          id: string
          nome: string
          ordem: number
          sistema: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          grupo?: string | null
          id?: string
          nome: string
          ordem?: number
          sistema?: boolean
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          grupo?: string | null
          id?: string
          nome?: string
          ordem?: number
          sistema?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_insumos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          endereco: Json
          id: string
          indicado_por: string | null
          nome: string
          observacoes: string | null
          origem: string | null
          preferencias: string[]
          restricoes: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          endereco?: Json
          id?: string
          indicado_por?: string | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          preferencias?: string[]
          restricoes?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: Json
          id?: string
          indicado_por?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          preferencias?: string[]
          restricoes?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_empresa_id_indicado_por_fkey"
            columns: ["empresa_id", "indicado_por"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      compra_itens: {
        Row: {
          codigo_lote: string | null
          compra_id: string
          created_at: string
          custo_unitario: number
          data_validade: string | null
          empresa_id: string
          id: string
          insumo_id: string
          quantidade: number
          unidade_codigo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          codigo_lote?: string | null
          compra_id: string
          created_at?: string
          custo_unitario: number
          data_validade?: string | null
          empresa_id: string
          id?: string
          insumo_id: string
          quantidade: number
          unidade_codigo: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          codigo_lote?: string | null
          compra_id?: string
          created_at?: string
          custo_unitario?: number
          data_validade?: string | null
          empresa_id?: string
          id?: string
          insumo_id?: string
          quantidade?: number
          unidade_codigo?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compra_itens_empresa_id_compra_id_fkey"
            columns: ["empresa_id", "compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "compra_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_itens_empresa_id_insumo_id_fkey"
            columns: ["empresa_id", "insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "compra_itens_unidade_codigo_fkey"
            columns: ["unidade_codigo"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      compras: {
        Row: {
          confirmada_em: string | null
          created_at: string
          created_by: string | null
          data_compra: string
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero: number | null
          numero_documento: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor_frete: number
          valor_total: number
        }
        Insert: {
          confirmada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_frete?: number
          valor_total?: number
        }
        Update: {
          confirmada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_frete?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_empresa_id_fornecedor_id_fkey"
            columns: ["empresa_id", "fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          antecedencia_minima_horas: number
          baixa_estoque_no_status: string
          custo_hora_mao_obra: number
          dias_alerta_validade: number
          empresa_id: string
          fuso_horario: string
          margem_lucro_padrao: number
          permitir_estoque_negativo: boolean
          taxa_entrega_padrao: number
          updated_at: string
          validade_orcamento_dias: number
        }
        Insert: {
          antecedencia_minima_horas?: number
          baixa_estoque_no_status?: string
          custo_hora_mao_obra?: number
          dias_alerta_validade?: number
          empresa_id: string
          fuso_horario?: string
          margem_lucro_padrao?: number
          permitir_estoque_negativo?: boolean
          taxa_entrega_padrao?: number
          updated_at?: string
          validade_orcamento_dias?: number
        }
        Update: {
          antecedencia_minima_horas?: number
          baixa_estoque_no_status?: string
          custo_hora_mao_obra?: number
          dias_alerta_validade?: number
          empresa_id?: string
          fuso_horario?: string
          margem_lucro_padrao?: number
          permitir_estoque_negativo?: boolean
          taxa_entrega_padrao?: number
          updated_at?: string
          validade_orcamento_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria_id: string
          competencia: string
          compra_id: string | null
          created_at: string
          created_by: string | null
          descricao: string
          despesa_recorrente_id: string | null
          documento: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
          valor_pago: number
          vencimento: string
        }
        Insert: {
          categoria_id: string
          competencia?: string
          compra_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          despesa_recorrente_id?: string | null
          documento?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor: number
          valor_pago?: number
          vencimento: string
        }
        Update: {
          categoria_id?: string
          competencia?: string
          compra_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          despesa_recorrente_id?: string | null
          documento?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_compra_id_fkey"
            columns: ["empresa_id", "compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_despesa_recorrente_id_fkey"
            columns: ["empresa_id", "despesa_recorrente_id"]
            isOneToOne: false
            referencedRelation: "despesas_recorrentes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_fornecedor_id_fkey"
            columns: ["empresa_id", "fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          competencia: string
          created_at: string
          created_by: string | null
          descricao: string
          empresa_id: string
          id: string
          observacoes: string | null
          pedido_id: string | null
          status: string
          updated_at: string
          valor: number
          valor_recebido: number
          vencimento: string
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          competencia?: string
          created_at?: string
          created_by?: string | null
          descricao: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          status?: string
          updated_at?: string
          valor: number
          valor_recebido?: number
          vencimento: string
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          competencia?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
          valor_recebido?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_cliente_id_fkey"
            columns: ["empresa_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      depoimentos_clientes: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          created_at: string
          empresa_id: string
          foto_url: string | null
          id: string
          nome_exibicao: string
          nota: number | null
          ordem: number
          texto: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          empresa_id: string
          foto_url?: string | null
          id?: string
          nome_exibicao: string
          nota?: number | null
          ordem?: number
          texto: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          empresa_id?: string
          foto_url?: string | null
          id?: string
          nome_exibicao?: string
          nota?: number | null
          ordem?: number
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depoimentos_clientes_empresa_id_cliente_id_fkey"
            columns: ["empresa_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "depoimentos_clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_recorrentes: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          empresa_id: string
          fornecedor_id: string | null
          frequencia: string
          id: string
          ultima_geracao: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao: string
          dia_vencimento: number
          empresa_id: string
          fornecedor_id?: string | null
          frequencia?: string
          id?: string
          ultima_geracao?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          empresa_id?: string
          fornecedor_id?: string | null
          frequencia?: string
          id?: string
          ultima_geracao?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_recorrentes_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "despesas_recorrentes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_recorrentes_empresa_id_fornecedor_id_fkey"
            columns: ["empresa_id", "fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      empresa_membros: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_membros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          endereco: Json
          id: string
          instagram: string | null
          logo_url: string | null
          nome: string
          nome_fantasia: string | null
          slug: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: Json
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nome: string
          nome_fantasia?: string | null
          slug: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: Json
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nome?: string
          nome_fantasia?: string | null
          slug?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      ficha_tecnica_itens: {
        Row: {
          created_at: string
          empresa_id: string
          ficha_id: string
          id: string
          insumo_id: string | null
          observacao: string | null
          ordem: number
          perda_pct: number
          quantidade: number
          subficha_id: string | null
          unidade_codigo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          ficha_id: string
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          ordem?: number
          perda_pct?: number
          quantidade: number
          subficha_id?: string | null
          unidade_codigo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          ficha_id?: string
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          ordem?: number
          perda_pct?: number
          quantidade?: number
          subficha_id?: string | null
          unidade_codigo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_tecnica_itens_empresa_id_ficha_id_fkey"
            columns: ["empresa_id", "ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "ficha_tecnica_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_tecnica_itens_empresa_id_insumo_id_fkey"
            columns: ["empresa_id", "insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "ficha_tecnica_itens_empresa_id_subficha_id_fkey"
            columns: ["empresa_id", "subficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "ficha_tecnica_itens_unidade_codigo_fkey"
            columns: ["unidade_codigo"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      fichas_custos_historico: {
        Row: {
          created_at: string
          custo_ingredientes: number
          custo_total: number
          custo_unitario: number
          empresa_id: string
          ficha_id: string
          id: number
          motivo: string | null
        }
        Insert: {
          created_at?: string
          custo_ingredientes: number
          custo_total: number
          custo_unitario: number
          empresa_id: string
          ficha_id: string
          id?: never
          motivo?: string | null
        }
        Update: {
          created_at?: string
          custo_ingredientes?: number
          custo_total?: number
          custo_unitario?: number
          empresa_id?: string
          ficha_id?: string
          id?: never
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_custos_historico_empresa_id_ficha_id_fkey"
            columns: ["empresa_id", "ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "fichas_custos_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          custo_calculado_em: string | null
          custo_embalagem: number
          custo_ingredientes: number
          custo_mao_obra: number
          custo_total: number
          custo_unitario: number
          descricao: string | null
          empresa_id: string
          id: string
          margem_desejada_pct: number | null
          modo_preparo: string | null
          nome: string
          observacoes: string | null
          outros_custos: number
          peso_unitario_g: number | null
          preco_venda: number | null
          rendimento: number
          tempo_preparo_min: number | null
          tipo: string
          unidade_rendimento: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          custo_calculado_em?: string | null
          custo_embalagem?: number
          custo_ingredientes?: number
          custo_mao_obra?: number
          custo_total?: number
          custo_unitario?: number
          descricao?: string | null
          empresa_id: string
          id?: string
          margem_desejada_pct?: number | null
          modo_preparo?: string | null
          nome: string
          observacoes?: string | null
          outros_custos?: number
          peso_unitario_g?: number | null
          preco_venda?: number | null
          rendimento?: number
          tempo_preparo_min?: number | null
          tipo?: string
          unidade_rendimento?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          custo_calculado_em?: string | null
          custo_embalagem?: number
          custo_ingredientes?: number
          custo_mao_obra?: number
          custo_total?: number
          custo_unitario?: number
          descricao?: string | null
          empresa_id?: string
          id?: string
          margem_desejada_pct?: number | null
          modo_preparo?: string | null
          nome?: string
          observacoes?: string | null
          outros_custos?: number
          peso_unitario_g?: number | null
          preco_venda?: number | null
          rendimento?: number
          tempo_preparo_min?: number | null
          tipo?: string
          unidade_rendimento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_unidade_rendimento_fkey"
            columns: ["unidade_rendimento"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      fidelidade_movimentacoes: {
        Row: {
          chave_idempotencia: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          estorno_de: string | null
          id: string
          motivo: string | null
          participante_id: string
          pedido_id: string | null
          pontos: number
          resgate_id: string | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
        }
        Insert: {
          chave_idempotencia?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          estorno_de?: string | null
          id?: string
          motivo?: string | null
          participante_id: string
          pedido_id?: string | null
          pontos: number
          resgate_id?: string | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
        }
        Update: {
          chave_idempotencia?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          estorno_de?: string | null
          id?: string
          motivo?: string | null
          participante_id?: string
          pedido_id?: string | null
          pontos?: number
          resgate_id?: string | null
          saldo_anterior?: number
          saldo_posterior?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fidelidade_movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fidelidade_movimentacoes_empresa_id_participante_id_fkey"
            columns: ["empresa_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "fidelidade_participantes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "fidelidade_movimentacoes_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "fidelidade_movimentacoes_empresa_id_resgate_id_fkey"
            columns: ["empresa_id", "resgate_id"]
            isOneToOne: false
            referencedRelation: "resgates"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "fidelidade_movimentacoes_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "fidelidade_movimentacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fidelidade_participantes: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          data_adesao: string
          empresa_id: string
          id: string
          indicado_por_cliente_id: string | null
          nivel: string | null
          pontos_acumulados: number
          programa_id: string
          saldo_pontos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          data_adesao?: string
          empresa_id: string
          id?: string
          indicado_por_cliente_id?: string | null
          nivel?: string | null
          pontos_acumulados?: number
          programa_id: string
          saldo_pontos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          data_adesao?: string
          empresa_id?: string
          id?: string
          indicado_por_cliente_id?: string | null
          nivel?: string | null
          pontos_acumulados?: number
          programa_id?: string
          saldo_pontos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fidelidade_participantes_empresa_id_cliente_id_fkey"
            columns: ["empresa_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "fidelidade_participantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fidelidade_participantes_empresa_id_indicado_por_cliente_i_fkey"
            columns: ["empresa_id", "indicado_por_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "fidelidade_participantes_empresa_id_programa_id_fkey"
            columns: ["empresa_id", "programa_id"]
            isOneToOne: false
            referencedRelation: "programas_fidelidade"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean
          created_at: string
          dias_recebimento: number
          empresa_id: string
          id: string
          nome: string
          ordem: number
          taxa_percentual: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_recebimento?: number
          empresa_id: string
          id?: string
          nome: string
          ordem?: number
          taxa_percentual?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_recebimento?: number
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          taxa_percentual?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          contato: string | null
          created_at: string
          documento: string | null
          email: string | null
          empresa_id: string
          endereco: Json
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          empresa_id: string
          endereco?: Json
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: Json
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      galeria_trabalhos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          data_trabalho: string | null
          descricao: string | null
          destaque: boolean
          empresa_id: string
          id: string
          imagem_url: string
          ordem: number
          produto_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          data_trabalho?: string | null
          descricao?: string | null
          destaque?: boolean
          empresa_id: string
          id?: string
          imagem_url: string
          ordem?: number
          produto_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          data_trabalho?: string | null
          descricao?: string | null
          destaque?: boolean
          empresa_id?: string
          id?: string
          imagem_url?: string
          ordem?: number
          produto_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "galeria_trabalhos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galeria_trabalhos_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo: string | null
          controla_validade: boolean
          created_at: string
          custo_medio: number
          custo_unitario: number
          densidade_g_ml: number | null
          e_embalagem: boolean
          empresa_id: string
          estoque_minimo: number
          fornecedor_padrao_id: string | null
          id: string
          local_armazenamento: string | null
          nome: string
          observacoes: string | null
          peso_unitario_g: number | null
          quantidade_atual: number
          unidade_codigo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          controla_validade?: boolean
          created_at?: string
          custo_medio?: number
          custo_unitario?: number
          densidade_g_ml?: number | null
          e_embalagem?: boolean
          empresa_id: string
          estoque_minimo?: number
          fornecedor_padrao_id?: string | null
          id?: string
          local_armazenamento?: string | null
          nome: string
          observacoes?: string | null
          peso_unitario_g?: number | null
          quantidade_atual?: number
          unidade_codigo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          controla_validade?: boolean
          created_at?: string
          custo_medio?: number
          custo_unitario?: number
          densidade_g_ml?: number | null
          e_embalagem?: boolean
          empresa_id?: string
          estoque_minimo?: number
          fornecedor_padrao_id?: string | null
          id?: string
          local_armazenamento?: string | null
          nome?: string
          observacoes?: string | null
          peso_unitario_g?: number | null
          quantidade_atual?: number
          unidade_codigo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_insumos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_empresa_id_fornecedor_padrao_id_fkey"
            columns: ["empresa_id", "fornecedor_padrao_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "insumos_unidade_codigo_fkey"
            columns: ["unidade_codigo"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      insumos_custos_historico: {
        Row: {
          created_at: string
          created_by: string | null
          custo_anterior: number | null
          custo_novo: number
          empresa_id: string
          id: number
          insumo_id: string
          origem: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_anterior?: number | null
          custo_novo: number
          empresa_id: string
          id?: never
          insumo_id: string
          origem?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_anterior?: number | null
          custo_novo?: number
          empresa_id?: string
          id?: never
          insumo_id?: string
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_custos_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_custos_historico_empresa_id_insumo_id_fkey"
            columns: ["empresa_id", "insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          categoria_id: string | null
          chave_idempotencia: string | null
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          created_by: string | null
          data_lancamento: string
          descricao: string
          empresa_id: string
          estorno_de: string | null
          forma_pagamento_id: string | null
          id: string
          pagamento_id: string | null
          pedido_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          chave_idempotencia?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          descricao: string
          empresa_id: string
          estorno_de?: string | null
          forma_pagamento_id?: string | null
          id?: string
          pagamento_id?: string | null
          pedido_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          chave_idempotencia?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          descricao?: string
          empresa_id?: string
          estorno_de?: string | null
          forma_pagamento_id?: string | null
          id?: string
          pagamento_id?: string | null
          pedido_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_conta_pagar_id_fkey"
            columns: ["empresa_id", "conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_conta_receber_id_fkey"
            columns: ["empresa_id", "conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_forma_pagamento_id_fkey"
            columns: ["empresa_id", "forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_pagamento_id_fkey"
            columns: ["empresa_id", "pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "lancamentos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_operacoes: {
        Row: {
          acao: string
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          empresa_id: string | null
          id: number
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          empresa_id?: string | null
          id?: never
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          empresa_id?: string | null
          id?: never
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_operacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_insumos: {
        Row: {
          codigo_lote: string | null
          created_at: string
          custo_unitario: number
          data_fabricacao: string | null
          data_validade: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          insumo_id: string
          quantidade_atual: number
          quantidade_inicial: number
          updated_at: string
        }
        Insert: {
          codigo_lote?: string | null
          created_at?: string
          custo_unitario?: number
          data_fabricacao?: string | null
          data_validade?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          insumo_id: string
          quantidade_atual: number
          quantidade_inicial: number
          updated_at?: string
        }
        Update: {
          codigo_lote?: string | null
          created_at?: string
          custo_unitario?: number
          data_fabricacao?: string | null
          data_validade?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string
          quantidade_atual?: number
          quantidade_inicial?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_insumos_empresa_id_fornecedor_id_fkey"
            columns: ["empresa_id", "fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "lotes_insumos_empresa_id_insumo_id_fkey"
            columns: ["empresa_id", "insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          chave_idempotencia: string | null
          created_at: string
          created_by: string | null
          custo_unitario: number
          empresa_id: string
          estorno_de: string | null
          id: string
          insumo_id: string
          lote_id: string | null
          lotes_consumidos: Json
          motivo: string | null
          origem_id: string | null
          origem_tipo: string
          quantidade: number
          quantidade_informada: number | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
          unidade_informada: string | null
          valor_total: number
        }
        Insert: {
          chave_idempotencia?: string | null
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          empresa_id: string
          estorno_de?: string | null
          id?: string
          insumo_id: string
          lote_id?: string | null
          lotes_consumidos?: Json
          motivo?: string | null
          origem_id?: string | null
          origem_tipo?: string
          quantidade: number
          quantidade_informada?: number | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
          unidade_informada?: string | null
          valor_total?: number
        }
        Update: {
          chave_idempotencia?: string | null
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          empresa_id?: string
          estorno_de?: string | null
          id?: string
          insumo_id?: string
          lote_id?: string | null
          lotes_consumidos?: Json
          motivo?: string | null
          origem_id?: string | null
          origem_tipo?: string
          quantidade?: number
          quantidade_informada?: number | null
          saldo_anterior?: number
          saldo_posterior?: number
          tipo?: string
          unidade_informada?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_insumo_id_fkey"
            columns: ["empresa_id", "insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_lote_id_fkey"
            columns: ["empresa_id", "lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_insumos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "movimentacoes_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_unidade_informada_fkey"
            columns: ["unidade_informada"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      opcoes_personalizacao: {
        Row: {
          acrescimo: number
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          faixa: string | null
          ficha_tecnica_id: string | null
          grupo: string
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          acrescimo?: number
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          faixa?: string | null
          ficha_tecnica_id?: string | null
          grupo: string
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          acrescimo?: number
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          faixa?: string | null
          ficha_tecnica_id?: string | null
          grupo?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opcoes_personalizacao_empresa_id_ficha_tecnica_id_fkey"
            columns: ["empresa_id", "ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "opcoes_personalizacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          chave_idempotencia: string | null
          conta_receber_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string
          empresa_id: string
          estorno_de: string | null
          forma_pagamento_id: string | null
          id: string
          observacoes: string | null
          pedido_id: string
          tipo: string
          valor: number
        }
        Insert: {
          chave_idempotencia?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          empresa_id: string
          estorno_de?: string | null
          forma_pagamento_id?: string | null
          id?: string
          observacoes?: string | null
          pedido_id: string
          tipo: string
          valor: number
        }
        Update: {
          chave_idempotencia?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          empresa_id?: string
          estorno_de?: string | null
          forma_pagamento_id?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_empresa_id_conta_receber_id_fkey"
            columns: ["empresa_id", "conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pagamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_empresa_id_forma_pagamento_id_fkey"
            columns: ["empresa_id", "forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pagamentos_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pagamentos_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          acrescimos: number
          created_at: string
          custo_unitario: number
          desconto: number
          descricao: string
          empresa_id: string
          ficha_snapshot: Json | null
          ficha_tecnica_id: string | null
          id: string
          observacoes: string | null
          ordem: number
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          total: number | null
          updated_at: string
          variacao_id: string | null
        }
        Insert: {
          acrescimos?: number
          created_at?: string
          custo_unitario?: number
          desconto?: number
          descricao: string
          empresa_id: string
          ficha_snapshot?: Json | null
          ficha_tecnica_id?: string | null
          id?: string
          observacoes?: string | null
          ordem?: number
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          total?: number | null
          updated_at?: string
          variacao_id?: string | null
        }
        Update: {
          acrescimos?: number
          created_at?: string
          custo_unitario?: number
          desconto?: number
          descricao?: string
          empresa_id?: string
          ficha_snapshot?: Json | null
          ficha_tecnica_id?: string | null
          id?: string
          observacoes?: string | null
          ordem?: number
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          total?: number | null
          updated_at?: string
          variacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_empresa_id_ficha_tecnica_id_fkey"
            columns: ["empresa_id", "ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedido_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedido_itens_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedido_itens_empresa_id_variacao_id_fkey"
            columns: ["empresa_id", "variacao_id"]
            isOneToOne: false
            referencedRelation: "variacoes_produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      pedido_personalizacoes: {
        Row: {
          acrescimo: number
          created_at: string
          descricao: string
          empresa_id: string
          ficha_tecnica_id: string | null
          grupo: string
          id: string
          opcao_id: string | null
          pedido_item_id: string
          updated_at: string
        }
        Insert: {
          acrescimo?: number
          created_at?: string
          descricao: string
          empresa_id: string
          ficha_tecnica_id?: string | null
          grupo: string
          id?: string
          opcao_id?: string | null
          pedido_item_id: string
          updated_at?: string
        }
        Update: {
          acrescimo?: number
          created_at?: string
          descricao?: string
          empresa_id?: string
          ficha_tecnica_id?: string | null
          grupo?: string
          id?: string
          opcao_id?: string | null
          pedido_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_personalizacoes_empresa_id_ficha_tecnica_id_fkey"
            columns: ["empresa_id", "ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedido_personalizacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_personalizacoes_empresa_id_opcao_id_fkey"
            columns: ["empresa_id", "opcao_id"]
            isOneToOne: false
            referencedRelation: "opcoes_personalizacao"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedido_personalizacoes_empresa_id_pedido_item_id_fkey"
            columns: ["empresa_id", "pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      pedido_status_historico: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          id: number
          observacao: string | null
          pedido_id: string
          status_anterior: Database["public"]["Enums"]["status_pedido"] | null
          status_novo: Database["public"]["Enums"]["status_pedido"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: never
          observacao?: string | null
          pedido_id: string
          status_anterior?: Database["public"]["Enums"]["status_pedido"] | null
          status_novo: Database["public"]["Enums"]["status_pedido"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: never
          observacao?: string | null
          pedido_id?: string
          status_anterior?: Database["public"]["Enums"]["status_pedido"] | null
          status_novo?: Database["public"]["Enums"]["status_pedido"]
        }
        Relationships: [
          {
            foreignKeyName: "pedido_status_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_status_historico_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cancelado_em: string | null
          cliente_id: string | null
          concluido_em: string | null
          confirmado_em: string | null
          created_at: string
          created_by: string | null
          data_entrega: string | null
          data_pedido: string
          desconto: number
          empresa_id: string
          endereco_entrega: Json
          entregue_em: string | null
          estoque_baixado_em: string | null
          forma_pagamento_id: string | null
          horario_entrega: string | null
          id: string
          motivo_cancelamento: string | null
          numero: number
          observacoes: string | null
          observacoes_internas: string | null
          origem: string
          producao_iniciada_em: string | null
          referencia_imagem_url: string | null
          saldo: number | null
          solicitacao_id: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          subtotal: number
          taxa_entrega: number
          tipo_entrega: string
          total: number | null
          updated_at: string
          validade_orcamento: string | null
          valor_pago: number
        }
        Insert: {
          cancelado_em?: string | null
          cliente_id?: string | null
          concluido_em?: string | null
          confirmado_em?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_pedido?: string
          desconto?: number
          empresa_id: string
          endereco_entrega?: Json
          entregue_em?: string | null
          estoque_baixado_em?: string | null
          forma_pagamento_id?: string | null
          horario_entrega?: string | null
          id?: string
          motivo_cancelamento?: string | null
          numero: number
          observacoes?: string | null
          observacoes_internas?: string | null
          origem?: string
          producao_iniciada_em?: string | null
          referencia_imagem_url?: string | null
          saldo?: number | null
          solicitacao_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          subtotal?: number
          taxa_entrega?: number
          tipo_entrega?: string
          total?: number | null
          updated_at?: string
          validade_orcamento?: string | null
          valor_pago?: number
        }
        Update: {
          cancelado_em?: string | null
          cliente_id?: string | null
          concluido_em?: string | null
          confirmado_em?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_pedido?: string
          desconto?: number
          empresa_id?: string
          endereco_entrega?: Json
          entregue_em?: string | null
          estoque_baixado_em?: string | null
          forma_pagamento_id?: string | null
          horario_entrega?: string | null
          id?: string
          motivo_cancelamento?: string | null
          numero?: number
          observacoes?: string | null
          observacoes_internas?: string | null
          origem?: string
          producao_iniciada_em?: string | null
          referencia_imagem_url?: string | null
          saldo?: number | null
          solicitacao_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          subtotal?: number
          taxa_entrega?: number
          tipo_entrega?: string
          total?: number | null
          updated_at?: string
          validade_orcamento?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_empresa_id_cliente_id_fkey"
            columns: ["empresa_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_empresa_id_forma_pagamento_id_fkey"
            columns: ["empresa_id", "forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "pedidos_solicitacao_fk"
            columns: ["empresa_id", "solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_orcamento"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          descricao: string | null
          disponivel_encomenda: boolean
          empresa_id: string
          ficha_tecnica_id: string | null
          foto_url: string | null
          id: string
          nome: string
          personalizavel: boolean
          preco_sob_consulta: boolean
          preco_sugerido: number | null
          quantidade_minima: number | null
          slug: string
          tempo_producao_min: number | null
          tipo: string
          unidade_venda: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          disponivel_encomenda?: boolean
          empresa_id: string
          ficha_tecnica_id?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          personalizavel?: boolean
          preco_sob_consulta?: boolean
          preco_sugerido?: number | null
          quantidade_minima?: number | null
          slug: string
          tempo_producao_min?: number | null
          tipo?: string
          unidade_venda?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          disponivel_encomenda?: boolean
          empresa_id?: string
          ficha_tecnica_id?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          personalizavel?: boolean
          preco_sob_consulta?: boolean
          preco_sugerido?: number | null
          quantidade_minima?: number | null
          slug?: string
          tempo_producao_min?: number | null
          tipo?: string
          unidade_venda?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_categoria_id_fkey"
            columns: ["empresa_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "produtos_empresa_id_ficha_tecnica_id_fkey"
            columns: ["empresa_id", "ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_unidade_venda_fkey"
            columns: ["unidade_venda"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["codigo"]
          },
        ]
      }
      produtos_imagens: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          legenda: string | null
          ordem: number
          principal: boolean
          produto_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          legenda?: string | null
          ordem?: number
          principal?: boolean
          produto_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          legenda?: string | null
          ordem?: number
          principal?: boolean
          produto_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_imagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_imagens_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      produtos_opcoes: {
        Row: {
          created_at: string
          empresa_id: string
          opcao_id: string
          produto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          opcao_id: string
          produto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          opcao_id?: string
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_opcoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_opcoes_empresa_id_opcao_id_fkey"
            columns: ["empresa_id", "opcao_id"]
            isOneToOne: false
            referencedRelation: "opcoes_personalizacao"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "produtos_opcoes_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      produtos_publicacoes: {
        Row: {
          caracteristicas: string[]
          created_at: string
          descricao_curta: string | null
          destaque: boolean
          empresa_id: string
          exibir_preco: boolean
          id: string
          ordem: number
          produto_id: string
          publicar_em: string | null
          status: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          caracteristicas?: string[]
          created_at?: string
          descricao_curta?: string | null
          destaque?: boolean
          empresa_id: string
          exibir_preco?: boolean
          id?: string
          ordem?: number
          produto_id: string
          publicar_em?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          caracteristicas?: string[]
          created_at?: string
          descricao_curta?: string | null
          destaque?: boolean
          empresa_id?: string
          exibir_preco?: boolean
          id?: string
          ordem?: number
          produto_id?: string
          publicar_em?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_publicacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_publicacoes_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          empresa_atual_id: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          empresa_atual_id?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          empresa_atual_id?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_atual_id_fkey"
            columns: ["empresa_atual_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      programas_fidelidade: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          criterio_participacao: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          empresa_id: string
          id: string
          limite_resgates_mes: number | null
          nome: string
          pontos_por_indicacao: number
          pontos_validade_dias: number | null
          regras: string | null
          tipo: string
          updated_at: string
          valor_por_ponto: number | null
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          criterio_participacao?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          limite_resgates_mes?: number | null
          nome: string
          pontos_por_indicacao?: number
          pontos_validade_dias?: number | null
          regras?: string | null
          tipo?: string
          updated_at?: string
          valor_por_ponto?: number | null
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          criterio_participacao?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          limite_resgates_mes?: number | null
          nome?: string
          pontos_por_indicacao?: number
          pontos_validade_dias?: number | null
          regras?: string | null
          tipo?: string
          updated_at?: string
          valor_por_ponto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programas_fidelidade_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      recompensas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          imagem_url: string | null
          nome: string
          pontos_necessarios: number
          produto_id: string | null
          programa_id: string
          quantidade_disponivel: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          imagem_url?: string | null
          nome: string
          pontos_necessarios: number
          produto_id?: string | null
          programa_id: string
          quantidade_disponivel?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          pontos_necessarios?: number
          produto_id?: string | null
          programa_id?: string
          quantidade_disponivel?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recompensas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recompensas_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "recompensas_empresa_id_programa_id_fkey"
            columns: ["empresa_id", "programa_id"]
            isOneToOne: false
            referencedRelation: "programas_fidelidade"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      resgates: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          observacoes: string | null
          participante_id: string
          pedido_id: string | null
          pontos: number
          recompensa_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          participante_id: string
          pedido_id?: string | null
          pontos: number
          recompensa_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          participante_id?: string
          pedido_id?: string | null
          pontos?: number
          recompensa_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resgates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_empresa_id_participante_id_fkey"
            columns: ["empresa_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "fidelidade_participantes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "resgates_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "resgates_empresa_id_recompensa_id_fkey"
            columns: ["empresa_id", "recompensa_id"]
            isOneToOne: false
            referencedRelation: "recompensas"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      seo_configuracoes: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          entidade_id: string | null
          entidade_tipo: string
          id: string
          imagem_og_url: string | null
          noindex: boolean
          palavras_chave: string[]
          rota: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          entidade_id?: string | null
          entidade_tipo: string
          id?: string
          imagem_og_url?: string | null
          noindex?: boolean
          palavras_chave?: string[]
          rota?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          entidade_id?: string | null
          entidade_tipo?: string
          id?: string
          imagem_og_url?: string | null
          noindex?: boolean
          palavras_chave?: string[]
          rota?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencias: {
        Row: {
          empresa_id: string
          nome: string
          valor: number
        }
        Insert: {
          empresa_id: string
          nome: string
          valor?: number
        }
        Update: {
          empresa_id?: string
          nome?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "sequencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      site_banners: {
        Row: {
          ativo: boolean
          botao_texto: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          empresa_id: string
          id: string
          imagem_mobile_url: string | null
          imagem_url: string
          link: string | null
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          botao_texto?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          imagem_mobile_url?: string | null
          imagem_url: string
          link?: string | null
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          botao_texto?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          imagem_mobile_url?: string | null
          imagem_url?: string
          link?: string | null
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_banners_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      site_configuracoes: {
        Row: {
          dominio: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          facebook: string | null
          horario_funcionamento: string | null
          imagem_historia_url: string | null
          instagram: string | null
          mapa_url: string | null
          mensagem_whatsapp: string | null
          nossa_historia: string | null
          publicado: boolean
          slogan: string | null
          telefone: string | null
          tiktok: string | null
          titulo: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          dominio?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          facebook?: string | null
          horario_funcionamento?: string | null
          imagem_historia_url?: string | null
          instagram?: string | null
          mapa_url?: string | null
          mensagem_whatsapp?: string | null
          nossa_historia?: string | null
          publicado?: boolean
          slogan?: string | null
          telefone?: string | null
          tiktok?: string | null
          titulo?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          dominio?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          facebook?: string | null
          horario_funcionamento?: string | null
          imagem_historia_url?: string | null
          instagram?: string | null
          mapa_url?: string | null
          mensagem_whatsapp?: string | null
          nossa_historia?: string | null
          publicado?: boolean
          slogan?: string | null
          telefone?: string | null
          tiktok?: string | null
          titulo?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_orcamento: {
        Row: {
          atendido_por: string | null
          cliente_id: string | null
          created_at: string
          data_evento: string | null
          email: string | null
          empresa_id: string
          id: string
          mensagem: string | null
          nome: string
          observacoes_internas: string | null
          origem: string
          pedido_id: string | null
          protocolo: number
          quantidade_pessoas: number | null
          referencia_url: string | null
          status: Database["public"]["Enums"]["status_solicitacao"]
          telefone: string
          tipo_evento: string | null
          updated_at: string
        }
        Insert: {
          atendido_por?: string | null
          cliente_id?: string | null
          created_at?: string
          data_evento?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          mensagem?: string | null
          nome: string
          observacoes_internas?: string | null
          origem?: string
          pedido_id?: string | null
          protocolo: number
          quantidade_pessoas?: number | null
          referencia_url?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          telefone: string
          tipo_evento?: string | null
          updated_at?: string
        }
        Update: {
          atendido_por?: string | null
          cliente_id?: string | null
          created_at?: string
          data_evento?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          mensagem?: string | null
          nome?: string
          observacoes_internas?: string | null
          origem?: string
          pedido_id?: string | null
          protocolo?: number
          quantidade_pessoas?: number | null
          referencia_url?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          telefone?: string
          tipo_evento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_orcamento_empresa_id_cliente_id_fkey"
            columns: ["empresa_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "solicitacoes_orcamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_orcamento_empresa_id_pedido_id_fkey"
            columns: ["empresa_id", "pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      solicitacoes_orcamento_itens: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          observacoes: string | null
          produto_id: string | null
          quantidade: number
          solicitacao_id: string
          updated_at: string
          variacao_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          produto_id?: string | null
          quantidade?: number
          solicitacao_id: string
          updated_at?: string
          variacao_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          produto_id?: string | null
          quantidade?: number
          solicitacao_id?: string
          updated_at?: string
          variacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_orcamento_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_orcamento_itens_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "solicitacoes_orcamento_itens_empresa_id_solicitacao_id_fkey"
            columns: ["empresa_id", "solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_orcamento"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "solicitacoes_orcamento_itens_empresa_id_variacao_id_fkey"
            columns: ["empresa_id", "variacao_id"]
            isOneToOne: false
            referencedRelation: "variacoes_produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
      unidades_medida: {
        Row: {
          codigo: string
          fator_base: number
          grandeza: string
          nome: string
        }
        Insert: {
          codigo: string
          fator_base: number
          grandeza: string
          nome: string
        }
        Update: {
          codigo?: string
          fator_base?: number
          grandeza?: string
          nome?: string
        }
        Relationships: []
      }
      variacoes_produtos: {
        Row: {
          ativo: boolean
          camadas: number | null
          created_at: string
          empresa_id: string
          faixa: string | null
          ficha_tecnica_id: string | null
          id: string
          nome: string
          ordem: number
          peso_g: number | null
          preco: number
          produto_id: string
          rendimento_fatias: number | null
          tamanho: string | null
          tipo_forma: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          camadas?: number | null
          created_at?: string
          empresa_id: string
          faixa?: string | null
          ficha_tecnica_id?: string | null
          id?: string
          nome: string
          ordem?: number
          peso_g?: number | null
          preco: number
          produto_id: string
          rendimento_fatias?: number | null
          tamanho?: string | null
          tipo_forma?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          camadas?: number | null
          created_at?: string
          empresa_id?: string
          faixa?: string | null
          ficha_tecnica_id?: string | null
          id?: string
          nome?: string
          ordem?: number
          peso_g?: number | null
          preco?: number
          produto_id?: string
          rendimento_fatias?: number | null
          tamanho?: string | null
          tipo_forma?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variacoes_produtos_empresa_id_ficha_tecnica_id_fkey"
            columns: ["empresa_id", "ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["empresa_id", "id"]
          },
          {
            foreignKeyName: "variacoes_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variacoes_produtos_empresa_id_produto_id_fkey"
            columns: ["empresa_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["empresa_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // ---- 0011 · equipe ----
      adicionar_membro: { Args: { p_empresa: string; p_email: string; p_papel: Database['public']['Enums']['papel_usuario'] }; Returns: string }
      alterar_membro: { Args: { p_membro: string; p_papel?: Database['public']['Enums']['papel_usuario']; p_ativo?: boolean }; Returns: undefined }
      // ---- 0010 · fluxos operacionais ----
      confirmar_compra: {
        Args: { p_compra: string; p_gerar_conta?: boolean; p_vencimento?: string; p_pago?: boolean; p_forma_pagamento?: string }
        Returns: string
      }
      cancelar_compra: { Args: { p_compra: string; p_motivo: string }; Returns: undefined }
      baixar_conta_pagar: {
        Args: { p_conta: string; p_valor: number; p_data?: string; p_forma?: string; p_observacao?: string; p_chave?: string }
        Returns: string
      }
      baixar_conta_receber: {
        Args: { p_conta: string; p_valor: number; p_data?: string; p_forma?: string; p_observacao?: string; p_chave?: string }
        Returns: string
      }
      cancelar_conta: { Args: { p_tipo: string; p_conta: string; p_motivo: string }; Returns: undefined }
      lancamento_avulso: {
        Args: { p_empresa: string; p_tipo: string; p_valor: number; p_descricao: string; p_categoria?: string; p_data?: string; p_forma?: string; p_chave?: string }
        Returns: string
      }
      estornar_lancamento: { Args: { p_lancamento: string; p_motivo: string }; Returns: string }
      gerar_despesas_recorrentes: { Args: { p_empresa: string; p_ate?: string }; Returns: number }
      pedido_alterar_status: {
        Args: { p_pedido: string; p_status: Database['public']['Enums']['status_pedido']; p_observacao?: string }
        Returns: Database['public']['Tables']['pedidos']['Row']
      }
      pedido_registrar_pagamento: {
        Args: { p_pedido: string; p_valor: number; p_forma?: string; p_data?: string; p_observacao?: string; p_chave?: string }
        Returns: string
      }
      pedido_estornar_pagamento: { Args: { p_pagamento: string; p_motivo: string }; Returns: string }
      fidelidade_inscrever: { Args: { p_programa: string; p_cliente: string; p_indicado_por?: string }; Returns: string }
      resgatar_recompensa: { Args: { p_participante: string; p_recompensa: string; p_observacoes?: string }; Returns: string }
      cancelar_resgate: { Args: { p_resgate: string; p_motivo: string }; Returns: undefined }
      relatorio_gerencial: { Args: { p_empresa: string; p_inicio: string; p_fim: string }; Returns: Json }
      busca_global: {
        Args: { p_empresa: string; p_termo: string }
        Returns: {
          id: string
          subtitulo: string
          tipo: string
          titulo: string
        }[]
      }
      converter_unidade: {
        Args: {
          p_de: string
          p_densidade_g_ml?: number
          p_para: string
          p_peso_unitario_g?: number
          p_qtd: number
        }
        Returns: number
      }
      criar_empresa: {
        Args: {
          p_instagram?: string
          p_nome: string
          p_slug?: string
          p_whatsapp?: string
        }
        Returns: string
      }
      dashboard_resumo: {
        Args: { p_empresa: string; p_fim: string; p_inicio: string }
        Returns: Json
      }
      estornar_movimentacao: {
        Args: { p_chave?: string; p_motivo: string; p_movimentacao_id: string }
        Returns: string
      }
      estornar_pontos: {
        Args: { p_motivo: string; p_movimentacao_id: string }
        Returns: string
      }
      excluir_empresa: {
        Args: { p_confirmacao: string; p_empresa: string }
        Returns: undefined
      }
      movimentar_estoque: {
        Args: {
          p_chave?: string
          p_custo_unitario?: number
          p_insumo_id: string
          p_lote_id?: string
          p_motivo?: string
          p_novo_lote?: Json
          p_origem_id?: string
          p_origem_tipo?: string
          p_quantidade: number
          p_tipo: string
          p_unidade?: string
        }
        Returns: string
      }
      movimentar_pontos: {
        Args: {
          p_chave?: string
          p_motivo?: string
          p_participante_id: string
          p_pedido_id?: string
          p_pontos: number
          p_resgate_id?: string
          p_tipo: string
        }
        Returns: string
      }
      notificacoes: { Args: { p_empresa: string }; Returns: Json }
      recalcular_custo_ficha: {
        Args: { p_ficha: string; p_motivo?: string }
        Returns: {
          ativo: boolean
          categoria: string | null
          created_at: string
          custo_calculado_em: string | null
          custo_embalagem: number
          custo_ingredientes: number
          custo_mao_obra: number
          custo_total: number
          custo_unitario: number
          descricao: string | null
          empresa_id: string
          id: string
          margem_desejada_pct: number | null
          modo_preparo: string | null
          nome: string
          observacoes: string | null
          outros_custos: number
          peso_unitario_g: number | null
          preco_venda: number | null
          rendimento: number
          tempo_preparo_min: number | null
          tipo: string
          unidade_rendimento: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "fichas_tecnicas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      site_solicitar_orcamento: {
        Args: { p_dados: Json; p_empresa_slug: string }
        Returns: Json
      }
    }
    Enums: {
      papel_usuario:
        | "proprietario"
        | "administrador"
        | "gerente"
        | "atendente"
        | "producao"
      status_pedido:
        | "orcamento"
        | "aguardando_confirmacao"
        | "confirmado"
        | "aguardando_producao"
        | "em_producao"
        | "pronto"
        | "saiu_entrega"
        | "entregue"
        | "cancelado"
      status_solicitacao:
        | "nova"
        | "em_atendimento"
        | "orcamento_enviado"
        | "convertida"
        | "nao_convertida"
        | "cancelada"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      papel_usuario: [
        "proprietario",
        "administrador",
        "gerente",
        "atendente",
        "producao",
      ],
      status_pedido: [
        "orcamento",
        "aguardando_confirmacao",
        "confirmado",
        "aguardando_producao",
        "em_producao",
        "pronto",
        "saiu_entrega",
        "entregue",
        "cancelado",
      ],
      status_solicitacao: [
        "nova",
        "em_atendimento",
        "orcamento_enviado",
        "convertida",
        "nao_convertida",
        "cancelada",
      ],
    },
  },
} as const
