# Roadmap

## Etapa 1 - Documentacao

Status: concluida

- Definir nome do projeto.
- Registrar ideia principal.
- Definir escopo do MVP.
- Registrar decisoes iniciais.
- Criar roadmap.

## Etapa 2 - Prototipo Visual

Status: concluida

- layout principal;
- area de texto;
- area de upload de imagem;
- botao de analise;
- painel de resultado;
- estados vazio, analisando e concluido.

## Etapa 3 - Motor de Analise por Regras

Status: primeira versao concluida

- lista de padroes de risco;
- regras especificas para textos;
- regras especificas para imagens;
- pontuacao de risco;
- classificacao baixo, medio ou alto;
- mensagens educativas para cada sinal.

## Etapa 4 - IA na Nuvem

Status: primeira versao concluida

- integracao com verificacao complementar em nuvem;
- endpoint `/api/analyze`;
- endpoint `/api/ai-status`;
- analise de texto;
- analise de imagem;
- analise de link;
- fallback para regras locais quando a chave nao estiver configurada.

## Etapa 5 - Deploy Publico

Status: preparado

- configuracao `vercel.json`;
- guia de deploy;
- variaveis de ambiente documentadas;
- imagem redimensionada antes do envio para reduzir falhas.

## Etapa 6 - Refinamento de Produto

Status: em andamento

- responsividade fina;
- melhorias visuais;
- exemplos de textos para teste;
- exemplos de links para teste;
- laudo visual com exportacao em imagem, texto e PDF;
- README mais completo;
- prints ou video de demonstracao;
- deploy publico com URL final.

## Etapa 7 - Evolucoes Futuras

Status: pendente

- banco de dados;
- historico de analises;
- autenticacao;
- leitura de metadados de imagens;
- links para fontes oficiais;
- busca automatica na web.
