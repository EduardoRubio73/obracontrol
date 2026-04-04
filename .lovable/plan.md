

# Plano: Modo Voz Contínua (Tipo Alexa)

## Resumo
Adicionar modo de conversa contínua por voz no Chat: o usuário ativa uma vez, fala, a IA responde com TTS (Web Speech API), e o sistema volta a ouvir automaticamente — loop infinito até desativar.

## Solução

### 1. Criar hook `useVoiceLoop`

Novo arquivo `src/hooks/useVoiceLoop.ts`:

- Estados: `idle` | `listening` | `processing` | `speaking`
- Usa `webkitSpeechRecognition` (pt-BR, continuous=false)
- Usa `SpeechSynthesisUtterance` para TTS (pt-BR)
- Loop: ouvir → callback com texto → aguardar TTS terminar → ouvir novamente
- `start()` / `stop()` controlam o loop
- Auto-stop após 3 erros consecutivos ou silêncio prolongado
- Vibração leve ao iniciar/parar (navigator.vibrate)

### 2. Integrar no Chat.tsx

- Adicionar botão "Conversar" (grande, visível) na área de chat
- Quando ativo: cada resultado de voz chama `sendMessage(texto)`
- Após receber resposta da IA (`data.resposta`), chamar TTS para falar a resposta
- Quando TTS termina (`utterance.onend`), o hook volta a ouvir
- Mensagens de voz aparecem normalmente no histórico do chat
- Indicadores visuais:
  - 🔴 pulsando = "Fale agora..."
  - 🔊 = "Respondendo..."
  - Estado exibido acima do input

### 3. Modificação no `sendMessage`

- Extrair a lógica para retornar a resposta da IA (atualmente só seta state)
- Permitir que o voice loop receba o texto da resposta para falar via TTS

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/hooks/useVoiceLoop.ts` | Criar — hook com STT + TTS + loop contínuo |
| `src/pages/Chat.tsx` | Editar — integrar voice loop, botão conversar, indicadores visuais |

## Notas técnicas
- Usa Web Speech API nativa (sem dependência externa) — funciona em Chrome/Edge/Safari
- TTS com `speechSynthesis` nativo (pt-BR)
- Não usa ElevenLabs (seria upgrade futuro)
- `sendMessage` será refatorado para retornar `string` da resposta, permitindo o TTS encadear

