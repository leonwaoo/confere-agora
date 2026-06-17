# Arquitetura

## Visão Geral

O projeto usa uma aplicação Vite/React no frontend e funções serverless em `api/` para executar a verificação complementar em nuvem sem expor a chave secreta no navegador.

```mermaid
sequenceDiagram
  participant U as Usuário
  participant F as Frontend React
  participant R as Pré-checagem interna
  participant A as API serverless
  participant C as Verificação em nuvem

  U->>F: Envia texto, link ou foto
  F->>R: Organiza sinais iniciais
  R-->>F: Retorna contexto técnico
  F->>A: Envia conteúdo e contexto interno
  A->>A: Lê metadados do link quando houver
  A->>C: Solicita análise complementar
  C-->>A: Retorna JSON estruturado
  A-->>F: Retorna análise normalizada
  F-->>U: Mostra laudo confirmado, selos, referências, histórico e relatório
```

## Frontend

- `src/App.jsx`: interface, sinais iniciais, preparo de imagem, laudo, histórico e relatório.
- `src/productHelpers.js`: referências por categoria, confiabilidade da fonte e dicas educativas.
- `src/styles.css`: fonte, base visual e animação da barra de risco.
- `public/logo-confere-agora.png`: logo do projeto.

## Backend

- `api/analyze.js`: endpoint principal da análise complementar.
- `api/ai-status.js`: checagem pública de disponibilidade.
- `api/_gemini.js`: leitura segura de links, normalização do JSON e chamada da API em nuvem.

## Segurança

- A chave da API fica apenas nas variáveis de ambiente da Vercel.
- Links locais, privados ou de metadados de nuvem são bloqueados antes da leitura.
- O navegador nunca recebe a chave secreta.
- A função de análise usa limite anti-abuso leve por IP.
- O histórico fica em `localStorage` e não é enviado para banco de dados.

## Falha da Verificação

Quando a verificação complementar falha, o app não gera laudo final. A interface informa que a verificação não foi concluída para evitar duas respostas conflitantes.

## Recursos de Produto

- Histórico local para recuperar análises recentes.
- Compartilhamento por API nativa do navegador quando disponível.
- Download de relatório em texto e imagem.
- Página `Como funciona` para explicar limites, privacidade e fluxo de análise.
