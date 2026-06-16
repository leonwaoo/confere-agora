# Decisoes do Projeto

Este arquivo registra decisoes importantes tomadas durante o desenvolvimento do Confere Agora.

## 2026-06-16 - Nome do projeto

Decisao: usar o nome **Confere Agora**.

Motivo: o nome e direto, facil de lembrar e comunica bem a acao principal do produto: conferir antes de compartilhar.

## 2026-06-16 - Posicionamento

Decisao: o produto sera um analisador de risco de desinformacao, nao um verificador definitivo de verdade.

Motivo: essa abordagem e mais responsavel porque evita declarar algo como falso ou verdadeiro sem investigacao completa.

## 2026-06-16 - Stack do frontend

Decisao: usar React, Vite, Tailwind CSS e Lucide React.

Motivo: essa stack permite criar uma interface moderna, responsiva e demonstravel em portfolio, mantendo o desenvolvimento rapido.

## 2026-06-16 - Verificacao de foto

Decisao: incluir uma opcao de verificar foto no MVP.

Motivo: muitos conteudos de desinformacao circulam como prints, cards e imagens em redes sociais. A primeira versao deve analisar sinais de risco visiveis e orientar verificacao, sem prometer detectar montagem, deepfake ou adulteracao com certeza.

## 2026-06-16 - Acusacoes curtas

Decisao: elevar o risco de textos curtos que fazem acusacoes graves sem fonte.

Motivo: mensagens curtas com acusacoes de crime, fraude ou violencia podem ser altamente danosas mesmo sem linguagem alarmista ou muitos detalhes.

## 2026-06-16 - Verificacao na nuvem

Decisao: usar uma API de verificacao em nuvem por meio de funcao serverless.

Motivo: para que o site funcione para qualquer pessoa na internet, a analise complementar nao pode depender do computador do desenvolvedor. A chave fica no ambiente do deploy, e o navegador nunca recebe o segredo.

## 2026-06-16 - Verificacao de link

Decisao: incluir uma opcao para verificar links publicos no MVP.

Motivo: muitos conteudos enganosos circulam por URLs, manchetes e paginas fora de contexto. A leitura do link deve ser limitada, bloquear enderecos locais ou privados e funcionar como apoio, sem armazenar o conteudo lido.

## 2026-06-16 - Deploy publico

Decisao: preparar o projeto para deploy na Vercel.

Motivo: Vercel oferece hospedagem simples para Vite e suporta funcoes serverless em `api/`, o que atende bem ao MVP.

## Decisoes Pendentes

- URL final do deploy.
- Se sera usado dominio proprio.
- Se havera limite de uso por usuario.
- Se a proxima versao tera historico de analises.
