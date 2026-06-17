# Bot para Telegram e WhatsApp

## Telegram

O projeto inclui o endpoint serverless `api/telegram.js`. Ele recebe texto, link ou imagem enviada ao bot e responde com um laudo curto de risco.

### Variaveis de ambiente

Configure na Vercel, em Production, Preview e Development:

```bash
TELEGRAM_BOT_TOKEN=token_do_bot
TELEGRAM_WEBHOOK_SECRET=um_segredo_longo
```

O token deve ser criado no BotFather. O segredo pode ser qualquer texto longo e dificil de adivinhar.

### Ativar webhook

Depois do deploy, rode no navegador ou terminal, trocando os valores:

```bash
https://api.telegram.org/botSEU_TOKEN/setWebhook?url=https://confere-agora.vercel.app/api/telegram&secret_token=SEU_SEGREDO
```

Para conferir:

```bash
https://api.telegram.org/botSEU_TOKEN/getWebhookInfo
```

### Como testar

1. Abra o bot no Telegram.
2. Envie `/start`.
3. Envie um texto suspeito.
4. Envie um link publico.
5. Envie uma imagem ou print com texto visível.

O bot deve responder com risco, motivo principal, resumo, sinais encontrados e próximos passos.

## WhatsApp

O WhatsApp exige uma conta Meta for Developers, WhatsApp Cloud API, numero de telefone configurado e token permanente. A integracao pode seguir o mesmo desenho:

1. Criar um webhook `api/whatsapp.js`.
2. Validar o desafio `hub.challenge` no `GET`.
3. Receber mensagens no `POST`.
4. Baixar midias pela Graph API quando houver imagem.
5. Reusar a funcao de analise em nuvem.
6. Responder pela API `/{phone-number-id}/messages`.

Variaveis esperadas para a proxima etapa:

```bash
WHATSAPP_VERIFY_TOKEN=segredo_do_webhook
WHATSAPP_ACCESS_TOKEN=token_da_meta
WHATSAPP_PHONE_NUMBER_ID=id_do_numero
```

Telegram foi priorizado porque permite entregar um bot funcional com menos burocracia. WhatsApp fica como evolução natural do portfólio.
