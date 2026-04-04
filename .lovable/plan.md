

# Plano: Fase 1 — Assistente de Início de Obra

## Visao Geral

Criar um fluxo guiado (wizard) para iniciar uma obra, desde a descrição pelo usuario ate a escolha do profissional vencedor. O sistema usa IA para estruturar o escopo e apoiar a decisao de comparacao de orcamentos.

Boa parte da infraestrutura ja existe (cotacoes, propostas, portal do fornecedor, comparacao). O trabalho principal e criar o **wizard de inicio**, a **classificacao automatica**, a **geracao de escopo por IA**, e o **dossie/timeline**.

---

## Etapas de Implementacao

### 1. Migration: Novas tabelas e campos

**Tabela `obra_dossie`** — linha do tempo de eventos da obra:
- `id`, `obra_id`, `user_id`, `tipo` (text: solicitacao_enviada, retorno_profissional, escopo_aprovado, profissional_escolhido...), `titulo`, `descricao`, `dados` (jsonb), `created_at`
- RLS: user_id = auth.uid()

**Campo `classificacao` em `obras`** (text): simples, media, complexa

**Campo `escopo_ia` em `obras`** (text): descricao estruturada gerada pela IA

**Campo `profissional_recomendado` em `obras`** (text): tipo de profissional sugerido

### 2. Edge Function: `gerar-escopo`

- Recebe: descricao livre do usuario, tipo_obra, classificacao
- Usa Lovable AI (gemini-3-flash-preview) para gerar:
  - Descricao estruturada
  - Lista de necessidades/materiais
  - Sugestao de profissional (empreiteiro/tecnico/engenheiro)
  - Alertas de seguranca
- Retorna JSON estruturado (via tool calling)
- Salva escopo_ia e profissional_recomendado na obra

### 3. Edge Function: `apoio-decisao`

- Recebe: array de propostas (valor, prazo, escopo)
- Usa IA para sugerir melhor custo-beneficio
- Retorna recomendacao com justificativa

### 4. Pagina: Wizard "Nova Obra" (`/nova-obra`)

Fluxo em steps (tudo dentro de uma pagina com estado local):

**Step 1 — Nome e Tipo**
- Input: nome da obra (texto ou voz)
- Select: tipo (casa, reforma, apartamento, comercial)

**Step 2 — Classificacao**
- Opcoes visuais: Simples / Media / Complexa
- Ao selecionar, exibir automaticamente o tipo de profissional recomendado
- Regra de seguranca: se complexa, alerta que engenheiro e obrigatorio

**Step 3 — Descricao**
- Textarea grande para descrever a obra
- Botao de voz para ditar
- Ao avancar: chama edge function `gerar-escopo`

**Step 4 — Escopo IA (revisao)**
- Mostra descricao estruturada gerada
- Lista de necessidades
- Profissional sugerido
- Usuario pode editar/aprovar

**Step 5 — Envio para profissionais**
- Selecionar fornecedores existentes ou adicionar novos
- Envia para 3+ profissionais (cria cotacao + cotacao_fornecedores)
- Gera link publico do portal

**Step 6 — Confirmacao**
- Resumo do que foi enviado
- Obra criada, dossie iniciado

Visual: cards grandes, botoes grandes, cores suaves, animacoes de entrada (mesmo padrao do menu premium).

### 5. Tela de Dossie/Timeline (`/obras/:id/dossie`)

- Lista vertical de eventos (obra_dossie)
- Icones e cores por tipo de evento
- Exibe historico completo: criacao, envios, respostas, decisao

### 6. IA na Comparacao (melhorar pagina existente)

- Adicionar botao "Sugestao IA" na pagina `/comparacao/:id`
- Chama edge function `apoio-decisao`
- Exibe card com recomendacao e justificativa
- Ao aceitar proposta: registrar no dossie

### 7. Extracoes pos-escolha

- Quando usuario aceita uma proposta vencedora:
  - Extrair materiais → criar itens de compra
  - Extrair etapas → criar obra_fases
  - Registrar no dossie

### 8. Routing e Navegacao

- Adicionar rota `/nova-obra` no App.tsx
- Adicionar card "Nova Obra" no menu principal (botao de destaque)
- Adicionar rota `/obras/:id/dossie`
- Link para dossie a partir do detalhe da obra

---

## Detalhes Tecnicos

- **IA**: Lovable AI via edge functions, modelo `google/gemini-3-flash-preview`, structured output via tool calling
- **Animacoes**: mesmos keyframes `menu-slide-up` com stagger
- **Voice**: reutilizar `useVoiceCommand` existente para input por voz no wizard
- **DB**: 1 migration (nova tabela + novos campos em obras)
- **Edge Functions**: 2 novas (`gerar-escopo`, `apoio-decisao`)
- **Paginas**: 2 novas (`NovaObra` wizard, `Dossie` timeline)
- **Modificacoes**: `Index.tsx` (card nova obra), `Comparacao.tsx` (botao IA), logica de aceitar proposta

---

## Ordem de Execucao

1. Migration (tabela + campos)
2. Edge function `gerar-escopo`
3. Edge function `apoio-decisao`
4. Pagina wizard `/nova-obra` (steps 1-6)
5. Pagina dossie `/obras/:id/dossie`
6. Integrar IA na comparacao
7. Logica de extracao pos-escolha
8. Navegacao e menu

