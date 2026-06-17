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

## 2026-06-16 - Laudo curto

Decisao: apresentar o resultado como um laudo curto com risco, motivo principal, sinais, categorias e proximas checagens.

Motivo: o usuario precisa entender rapidamente por que deve ter cautela antes de compartilhar.

## 2026-06-16 - Relatorio copiavel

Decisao: permitir copiar o relatorio da verificacao.

Motivo: o recurso torna o projeto mais util para estudo, compartilhamento responsavel e demonstracao em portfolio, sem depender de download de arquivo simples.

## 2026-06-16 - Checagem de formato de noticia

Decisao: indicar se o conteudo parece noticia, nao parece noticia ou tem formato indefinido.

Motivo: muitos boatos se apresentam como noticia, mas nao mostram autoria, data, veiculo, fonte primaria ou contexto.

## 2026-06-16 - OCR pela verificacao complementar

Decisao: solicitar que a verificacao complementar leia texto visivel em imagens quando possivel.

Motivo: prints e cards frequentemente carregam a alegacao principal dentro da imagem, e depender apenas de transcricao manual reduz a utilidade da ferramenta.

## 2026-06-16 - Historico local

Decisao: salvar as ultimas analises no navegador usando `localStorage`.

Motivo: o usuario pode recuperar laudos recentes sem criar conta, banco de dados ou coleta centralizada.

## 2026-06-16 - Referencias por categoria

Decisao: mostrar links uteis conforme o tipo de risco detectado.

Motivo: a ferramenta deve orientar o proximo passo de checagem, nao apenas alertar que existe risco.

## 2026-06-16 - Compartilhamento do laudo

Decisao: permitir compartilhar o relatorio e baixar uma imagem do laudo.

Motivo: isso torna o resultado mais util em conversas e mais apresentavel como projeto de portfolio.

## 2026-06-16 - Limite anti-abuso

Decisao: aplicar limite leve por IP na funcao `/api/analyze`.

Motivo: proteger a chave de verificacao em nuvem contra uso excessivo e preservar a disponibilidade do projeto publico.

## 2026-06-16 - Testes automatizados

Decisao: adicionar testes com `node --test` para helpers de produto.

Motivo: validar regras reutilizaveis sem adicionar dependencias pesadas ao MVP.

## 2026-06-17 - Exportacao de relatorio

Decisao: manter downloads de relatorio somente em PDF e imagem, removendo a opcao TXT da interface.

Motivo: PDF e imagem sao formatos mais visuais, profissionais e adequados para portifolio, print e compartilhamento. O texto continua disponivel para copiar, mas nao aparece mais como arquivo baixavel.

## 2026-06-17 - PDF em uma pagina

Decisao: gerar o PDF do laudo em uma unica pagina A4, com blocos fixos para cabecalho, risco, sinais, resumo, proximos passos, conteudo analisado e aviso de limite.

Motivo: o PDF anterior podia ficar colado ou cortar conteudo. A versao de uma pagina prioriza leitura rapida, espacamento consistente e compartilhamento sem paginas quebradas.

## 2026-06-17 - Responsividade mobile

Decisao: revisar cabecalho, navegacao, botoes de acao e grids para evitar rolagem horizontal e elementos aumentados no celular.

Motivo: o site publico precisa funcionar bem em telas pequenas, especialmente porque o uso natural do produto acontece em celulares, ao receber links, prints e mensagens.

## 2026-06-17 - Resiliencia da verificacao em nuvem

Decisao: quando o provedor responder com erro temporario, alta demanda ou falha 5xx, a funcao `/api/analyze` deve tentar modelos alternativos antes de devolver falha ao usuario.

Motivo: a verificacao estava configurada corretamente, mas o modelo principal podia responder `503` por alta demanda. O fallback melhora disponibilidade sem mascarar erros de chave, permissao, billing ou quota real.

## Decisoes Pendentes

- URL final do deploy.
- Se sera usado dominio proprio.
- Se havera limite de uso por usuario.
- Se a proxima versao tera historico de analises.
