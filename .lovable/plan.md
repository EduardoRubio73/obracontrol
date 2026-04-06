

# Plano: Refatoracao Completa do Sistema

## Resumo
Corrigir CRUD quebrado, criar tabela de compras, expandir Configuracoes, adicionar upload no Financeiro, melhorar UX de Cotacoes/Etapas, e aplicar regra global de obra obrigatoria.

---

## 1. Criar tabela `compras` no banco (Migration SQL)

Nao existe tabela `compras` -- a pagina atual le de uma view `vw_sugestao_compra` que e somente leitura.

```sql
CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id),
  produto_id uuid REFERENCES produtos(id),
  descricao text,
  quantidade numeric DEFAULT 1,
  valor_unitario numeric,
  valor_total numeric,
  status text DEFAULT 'pendente',
  observacao text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY compras_select ON compras FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY compras_insert ON compras FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY compras_update ON compras FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY compras_delete ON compras FOR DELETE TO authenticated USING (user_id = auth.uid());
```

## 2. Criar tabela `etapas_padrao` (Migration SQL)

```sql
CREATE TABLE public.etapas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.etapas_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY etapas_padrao_user ON etapas_padrao FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

## 3. Refazer `src/pages/Compras.tsx`

**Antes**: Pagina read-only lendo de view inexistente.
**Depois**: CRUD completo com:
- Botao "+ Nova Compra" abrindo modal
- Modal com: fornecedor (select), produto (select), quantidade, observacao
- `obra_id` automatico via `useObraAtiva()`
- Lista de compras com status (pendente, comprado, cancelado)
- Envolvido por `<RequireObra>` (ja esta)
- Botoes editar/excluir em cada item

## 4. Expandir `src/pages/Configuracoes.tsx`

**Antes**: 3 tabs (Categorias, Tipos de Obra, Unidades).
**Depois**: 5 tabs:
- Categorias (`categorias_produtos`)
- Tipos de Obra (`tipos_obra`)
- Unidades (`unidades_medida`)
- Tipos de Fornecedor (usar campo `tipo` em `fornecedores` -- criar tab com valores comuns editaveis, ou uma nova tabela simples)
- Etapas Padrao (`etapas_padrao` -- nova tabela)

Manter o mesmo `CrudTabContent` reutilizavel. Ajustar grid de tabs para 5 colunas (ou scroll horizontal em mobile).

## 5. Financeiro -- Upload de comprovante/NF

**O campo `comprovante_url` ja existe na tabela `financeiro`.**

Adicionar no modal de criacao:
- Botao "Anexar comprovante" que faz upload para bucket `documentos`
- Preview do arquivo anexado
- Salvar URL no campo `comprovante_url`
- Exibir icone de anexo na lista de transacoes

## 6. Cotacoes -- Dropdown de descricao

Substituir o `<Input>` de descricao no modal "Nova Cotacao" por um combo (datalist ou combobox) com sugestoes:
- Reforma geral
- Reforma piscina
- Construcao
- Manutencao
- Permitir digitar valor custom

## 7. Etapas -- Select de etapas padrao

No modal "Nova Etapa":
- Adicionar select com etapas padrao da tabela `etapas_padrao`
- Manter campo de texto para etapa customizada
- Ao selecionar padrao, preenche o nome automaticamente

## 8. Remover Auditoria do menu

**Arquivo**: `src/components/AppSidebar.tsx`
- Remover `{ title: "Auditoria", url: "/auditoria", icon: Shield }` de `adminItems`
- Manter a rota no App.tsx (acessivel por URL direto)

## 9. Chat/Assistente -- Limitar altura

**Arquivo**: `src/pages/Chat.tsx`
- Adicionar `max-h-[70vh]` ao container de mensagens
- Garantir `overflow-y-auto` no container

## 10. Regra global obra obrigatoria

Ja existe `<RequireObra>` envolvendo Compras, Financeiro, Etapas, Cotacoes. Verificar e adicionar em todas as paginas que dependem de `obra_id`:
- Dashboard
- Relatorios
- Documentos
- Galeria
- Materiais

---

## Arquivos a editar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabelas `compras` e `etapas_padrao` com RLS |
| `src/pages/Compras.tsx` | Reescrever com CRUD completo |
| `src/pages/Configuracoes.tsx` | Adicionar 2 tabs (Tipos Fornecedor, Etapas Padrao) |
| `src/pages/Financeiro.tsx` | Adicionar upload de comprovante no modal |
| `src/pages/Cotacoes.tsx` | Dropdown com sugestoes na descricao |
| `src/pages/Etapas.tsx` | Select de etapas padrao no modal |
| `src/components/AppSidebar.tsx` | Remover Auditoria do menu |
| `src/pages/Chat.tsx` | Limitar altura do container |

