# Confere Agora

**Confere Agora** e um analisador de risco de desinformacao para textos, links, manchetes, posts, mensagens e imagens compartilhadas online.

O objetivo do projeto e ajudar pessoas a perceber sinais de alerta antes de compartilhar uma informacao, sem substituir agencias de checagem, fontes oficiais ou trabalho jornalistico.

## Proposta

Conteudos falsos ou enganosos costumam circular com linguagem alarmista, dados sem fonte, acusacoes sem evidencia, prints fora de contexto e pedidos urgentes de compartilhamento. O Confere Agora transforma esses sinais em uma analise simples, educativa e facil de entender.

## Funcionalidades

- Analise de texto.
- Analise de imagem.
- Analise de link com leitura segura de pagina publica.
- Regras locais explicaveis.
- Verificacao complementar no servidor.
- Fallback por regras caso a verificacao complementar esteja indisponivel.
- Resultado com nivel de risco, sinais encontrados e proximas checagens.

## Tecnologias

- React
- Vite
- Tailwind CSS
- Lucide React
- Vercel Functions
- API de verificacao em nuvem

## Como Rodar Localmente

Requisitos:

- Node.js instalado
- pnpm instalado
- chave de verificacao em nuvem para ativar a analise complementar

Crie um arquivo `.env` com base em `.env.example`:

```bash
CLOUD_AI_API_KEY=sua_chave
```

Comandos:

```bash
pnpm install
pnpm dev
```

Depois, acesse:

```bash
http://127.0.0.1:5173
```

## Deploy

O projeto esta preparado para deploy na Vercel.

Veja o guia:

- [Deploy e verificacao na nuvem](docs/deploy-e-ia-na-nuvem.md)

## Principios do Produto

- A ferramenta nao declara sozinha que algo e verdadeiro ou falso.
- A analise deve ser explicavel para o usuario.
- O foco e reduzir compartilhamentos impulsivos.
- Conteudos sobre pessoas, instituicoes ou temas publicos devem receber cuidado extra.
- Toda decisao importante do projeto deve ser documentada.

## Status

MVP com frontend, verificacao de texto, foto, link, regras locais e verificacao complementar no servidor.

## Documentacao

- [Ideia do projeto](docs/ideia-do-projeto.md)
- [Escopo](docs/escopo.md)
- [Roadmap](docs/roadmap.md)
- [Decisoes](docs/decisoes.md)
- [Deploy e verificacao na nuvem](docs/deploy-e-ia-na-nuvem.md)
