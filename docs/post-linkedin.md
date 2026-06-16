# Post para LinkedIn

Criei o **Confere Agora**, um projeto web para analisar risco de desinformação antes do compartilhamento.

A ideia nasceu de um problema simples: muita gente recebe prints, links, manchetes e mensagens em redes sociais e acaba repassando sem verificar fonte, data, autoria ou contexto.

O projeto permite analisar:

- texto;
- link;
- foto ou print.

Ele combina regras locais explicáveis com verificação complementar em nuvem. O resultado não tenta dar um "veredito absoluto"; ele mostra um laudo curto com nível de risco, motivo principal, sinais encontrados, categorias e próximos passos de checagem.

Alguns recursos que implementei:

- leitura segura de metadados de links;
- análise de imagens com texto detectado pela verificação complementar;
- categorias como saúde, política, golpe financeiro, corrente emocional e notícia sem fonte;
- relatório copiável ou baixável;
- fallback por regras locais caso a verificação complementar esteja indisponível;
- deploy público na Vercel.

Tecnologias usadas:

- React;
- Vite;
- Tailwind CSS;
- Vercel Functions;
- integração com IA em nuvem.

Esse projeto foi uma boa oportunidade para praticar produto, frontend, segurança em funções serverless, documentação e integração com IA de forma responsável.

Site: https://confere-agora.vercel.app/

Repositório: https://github.com/leonwaoo/confere-agora
