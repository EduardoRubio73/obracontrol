

# Plano: Melhorias no Formulário Financeiro

## 1. Combobox Inteligente para Descrição

Criar um componente `DescricaoCombobox` que:
- Consulta descrições únicas já cadastradas na tabela `financeiro` (filtradas por `obra_id`)
- Usa Popover + Command (cmdk) para dropdown com busca
- Se o texto digitado não existir na lista, mostra opção "Adicionar: [texto]"
- `autocomplete="off"` no input
- Valor controlado via state, integrado ao form via hidden input `name="descricao"`

## 2. Upload Estilizado com Preview

Substituir o `<Input type="file">` por:
- Botão estilizado com ícone 📎 e texto "Anexar comprovante"
- Ao selecionar arquivo de imagem: exibe miniatura (thumbnail) via `URL.createObjectURL`
- Ao selecionar PDF: exibe ícone de PDF com nome do arquivo
- Após upload concluído (no submit): ícone ✅ verde
- Input file oculto, acionado pelo botão customizado
- 100% largura no mobile

## 3. Responsividade

- Combobox e upload ocupam `w-full` em todos os breakpoints
- Manter grid 2 colunas para Valor/Tipo no desktop, empilhar no mobile (`grid-cols-1 sm:grid-cols-2`)

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Financeiro.tsx` | Substituir campo descrição pelo Combobox, substituir input file pelo upload estilizado com preview, ajustar grid responsivo |

Nenhuma mudança no banco de dados — apenas consulta SELECT DISTINCT para sugestões.

