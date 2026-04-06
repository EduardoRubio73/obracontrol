

# Plano: Limpar Markdown antes do TTS

## Problema
A função `speak()` no `useVoiceLoop.ts` recebe texto com markdown (`**`, `*`, `#`, `` ` ``) e o `SpeechSynthesisUtterance` lê literalmente "asterisco asterisco".

## Solução
Adicionar função `limparTextoParaVoz` no `useVoiceLoop.ts` e aplicá-la ao texto antes de passar ao `SpeechSynthesisUtterance`.

```ts
function limparTextoParaVoz(texto: string): string {
  return texto
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, ' ')
    .replace(/`/g, '')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → só texto
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
```

Aplicar na linha 35: `new SpeechSynthesisUtterance(limparTextoParaVoz(text))`

## Arquivo

| Arquivo | Ação |
|---|---|
| `src/hooks/useVoiceLoop.ts` | Editar — adicionar função + aplicar no `speak()` |

