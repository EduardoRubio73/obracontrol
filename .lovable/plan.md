

# Plano: Melhorias Críticas no Módulo de Cotações

## Resumo
Adicionar número de orçamento, envio individualizado de e-mails com link personalizado por fornecedor, seção de fornecedores convidados com badges de status, reenvio individual, e visualização de resposta.

---

## 1. Número do Orçamento (#ID curto)

- No card da cotação e no modal de detalhes, exibir `#{cotacao.id.slice(0,8)}` como referência
- Incluir no espelho do orçamento impresso

## 2. Envio Individualizado com Link Personalizado

**Mudança no `handleSendToFornecedores`:**
- Em vez de abrir um único `mailto` com CC, abrir múltiplos `mailto` individuais (um por fornecedor)
- Cada e-mail terá link personalizado: `/cotacao/[token]?fornecedor=[fornecedor_id]`

**Mudança no `PortalFornecedor.tsx`:**
- Ler `?fornecedor=` da URL
- Se presente, buscar nome do fornecedor via RPC e preencher o campo "Nome da Empresa" como `disabled`
- Criar nova RPC `get_public_fornecedor_nome(p_id uuid)` (SECURITY DEFINER) para buscar o nome

## 3. Botão "Link Avulso" no Card

- Renomear o botão "Link" para "Link Avulso" no card da cotação

## 4. Modal de Detalhes — Ajustes

**Botão Espelho Azul:**
- Trocar `variant="outline"` para classe azul: `bg-blue-100 text-blue-700 hover:bg-blue-200`

**Seção "Fornecedores Convidados":**
- Mover a seção de tracking existente para ABAIXO da lista de itens (printItens)
- Renomear título para "Fornecedores Convidados"
- Adicionar busca de itens (printItens) no modal de detalhes para exibir antes dos fornecedores

## 5. Badges de Status com Cores Vivas

Substituir a lógica de status por:
- 🟢 **Respondido** (`bg-green-100 text-green-700`): `data_resposta` preenchida
- 🟡 **Pendente** (`bg-yellow-100 text-yellow-700`): sem resposta, envio ≤ 2 dias
- 🔴 **Atrasado** (`bg-red-100 text-red-700`): sem resposta, envio > 2 dias

Colunas na tabela: Fornecedor | Data Envio | Data Resposta | Status | Ações

## 6. Botão Reenviar

- Cada linha de fornecedor convidado terá botão 🔄 **Reenviar**
- Se status = "Respondido", botão fica oculto
- Ao clicar: abre mini-dialog para editar e-mail, depois:
  1. Atualiza `data_envio` e `email` na `cotacao_fornecedores`
  2. Abre `mailto` individual com link personalizado `/cotacao/[token]?fornecedor=[id]`

## 7. Visualização de Resposta

- Se fornecedor respondeu, clicar na linha abre um dialog mostrando:
  - Dados da proposta (valor total, prazo, itens com valores unitários)
  - Query: buscar `propostas` + `proposta_itens` pelo `fornecedor_id` e `cotacao_id`

## 8. Mobile-First na Lista de Convidados

- No mobile, transformar a tabela em mini-cards empilhados com:
  - Nome + Badge de status
  - Datas empilhadas
  - Botão Reenviar ocupando largura total

## Migração SQL

Nova RPC para buscar nome do fornecedor anonimamente:

```sql
CREATE FUNCTION get_public_fornecedor_nome(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nome FROM fornecedores WHERE id = p_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_public_fornecedor_nome(uuid) TO anon;
```

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Cotacoes.tsx` | Número do orçamento, link avulso, espelho azul, fornecedores convidados com badges/reenvio/visualização, envio individual |
| `src/pages/PortalFornecedor.tsx` | Ler `?fornecedor=`, travar campo nome |
| Migration SQL | RPC `get_public_fornecedor_nome` |

