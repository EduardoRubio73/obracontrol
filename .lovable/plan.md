

# Plano: 4 Correções

## 1. Chat mostrando `<button>` como texto
A IA está retornando `<button>` tags no markdown. A solução é ajustar o system prompt da edge function para instruir a IA a retornar botões como `acoes[]` JSON, nunca como HTML. Também adicionar `rehypeRaw` no ReactMarkdown para caso a IA ainda envie HTML, e/ou sanitizar removendo tags `<button>` do conteúdo.

**Arquivo:** `supabase/functions/chat-assistente/index.ts` — adicionar ao SYSTEM_PROMPT: "Nunca use tags HTML como `<button>`. Para ações clicáveis, use a ferramenta responder_texto com botões no campo acoes."

Também adicionar uma tool `responder_texto` que aceita `resposta` e `botoes[]` para a IA poder retornar ações formatadas corretamente.

## 2. Perfil — Avatar clicável para trocar foto
A tabela `profiles` já tem campo `avatar_url`. Adicionar:
- Input file oculto para selecionar imagem
- Click no Avatar abre file picker
- Upload para bucket `documentos` (path `avatars/{user_id}`)
- Atualiza `avatar_url` no profile
- Exibir a imagem no Avatar via `AvatarImage`

**Arquivo:** `src/pages/Perfil.tsx`

## 3. Configurações — CRUD completo nas guias
Atualmente "Tipos de Obra" e "Unidades" são listas estáticas hardcoded. Converter para CRUD dinâmico com tabelas no Supabase.

Criar 2 novas tabelas via migration:
- `tipos_obra` (id, nome, user_id, created_at)
- `unidades_medida` (id, nome, user_id, created_at)

Refatorar `Configuracoes.tsx` para:
- Cada aba ter input + botão adicionar + lista com delete (igual "Categorias")
- Query/mutation para cada tabela

**Arquivos:** migration SQL + `src/pages/Configuracoes.tsx`

## 4. Fornecedores — Mensagem "Nenhum fornecedor encontrado"
O código já tem a mensagem na linha 228-238. O problema pode ser que a query não retorna dados (RLS). Verificar se a query filtra por `user_id`. Atualmente não filtra — a query faz `select("*").order("nome")` sem `.eq("user_id", ...)`. Se o RLS exige `user_id = auth.uid()`, deveria funcionar. Mas a mensagem "Nenhum fornecedor encontrado" já está no código.

Verificar se o card "Nenhum fornecedor" está aparecendo corretamente. O componente parece correto — talvez o `isLoading` nunca termina ou há um erro silencioso. Adicionar estado de erro e skeleton de loading.

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `supabase/functions/chat-assistente/index.ts` | Editar — system prompt + tool responder_texto |
| `src/pages/Perfil.tsx` | Editar — avatar clicável com upload |
| `src/pages/Configuracoes.tsx` | Reescrever — CRUD em todas as abas |
| `src/pages/Fornecedores.tsx` | Editar — melhorar estado vazio/loading/erro |
| Migration SQL | Criar — tabelas `tipos_obra` e `unidades_medida` |

## Detalhes técnicos

**Chat buttons fix:** Adicionar ao system prompt: `"NUNCA retorne HTML. Para botões de ação, retorne no campo acoes: [{label, route}]. Use apenas markdown para formatação."` E fazer post-processing no frontend para strip HTML tags do conteúdo.

**Avatar upload:** Usar bucket `documentos` com path `avatars/{user_id}.jpg`. Após upload, pegar public URL e fazer update no profile.

**Configurações CRUD:** Pattern idêntico ao já usado na aba "Categorias" — replicar para tipos_obra e unidades_medida com suas respectivas tabelas.

