# Deploy e Verificacao na Nuvem

## Objetivo

O Confere Agora deve funcionar para qualquer pessoa na internet, sem depender do computador do desenvolvedor.

Para isso, a verificacao complementar roda em uma funcao serverless e chama uma API em nuvem.

## Arquitetura

- Frontend: React + Vite
- Deploy recomendado: Vercel
- Backend leve: Vercel Functions em `api/`
- Verificacao complementar: API em nuvem
- Falha segura: se a nuvem nao confirmar, o app nao gera laudo final

## Variaveis de Ambiente

No ambiente de deploy, configurar:

```bash
CLOUD_AI_API_KEY=sua_chave
```

`CLOUD_AI_API_KEY` deve ficar somente no servidor ou no painel do provedor de deploy. Ela nao deve ser exposta no frontend.

## Como Publicar na Vercel

1. Subir o projeto para um repositorio no GitHub.
2. Criar uma conta ou entrar na Vercel.
3. Importar o repositorio.
4. Confirmar as configuracoes:

```bash
Framework: Vite
Build command: pnpm build
Output directory: dist
```

5. Adicionar as variaveis de ambiente:

```bash
CLOUD_AI_API_KEY
```

6. Fazer o deploy.

## Como a Checagem Funciona

1. O usuario envia texto, imagem ou link.
2. O navegador organiza sinais iniciais como contexto tecnico.
3. O frontend chama `/api/analyze`.
4. A funcao serverless chama a API de verificacao em nuvem.
5. O resultado final so aparece quando a verificacao complementar confirma a leitura.

## Limites

- A verificacao complementar nao confirma verdade ou mentira de forma definitiva.
- A API em nuvem pode ter limite gratuito de uso.
- Se a chave nao estiver configurada ou a API falhar, o app informa que a verificacao nao foi concluida.
- Imagens sao redimensionadas antes do envio para reduzir falhas por tamanho.
- Links sao lidos com limite de tamanho e bloqueio de enderecos locais ou privados.
