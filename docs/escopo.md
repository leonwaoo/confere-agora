# Escopo

## Versao Inicial

O MVP do Confere Agora foca em uma experiencia simples:

1. O usuario escolhe verificar texto, foto ou link.
2. No modo texto, cola um conteudo recebido.
3. No modo foto, envia uma imagem, print ou card.
4. No modo link, cola uma URL publica para leitura segura.
5. A aplicacao analisa o conteudo com regras locais.
6. A aplicacao chama a verificacao complementar no servidor quando a chave estiver configurada.
7. O resultado mostra nivel de risco, sinais encontrados e recomendacoes.

## Funcionalidades do MVP

- Campo para inserir ou colar texto.
- Opcao para enviar imagem.
- Campo para inserir link.
- Previa da imagem enviada.
- Leitura segura de titulo, descricao e trecho de paginas publicas.
- Redimensionamento de imagem antes do envio.
- Botao para iniciar analise.
- Identificacao de sinais de alerta por regras locais.
- Analise complementar no servidor.
- Pontuacao de risco.
- Resultado com explicacoes claras.
- Aviso informando que a ferramenta nao substitui checagem oficial.

## Sinais de Alerta Iniciais

- Texto com pedido urgente de compartilhamento.
- Uso de termos absolutos ou alarmistas.
- Acusacao grave sem fonte.
- Ausencia de links, fonte, autor ou data.
- Numeros ou percentuais sem contexto.
- Pesquisa ou levantamento sem instituto, data, amostra, margem de erro ou metodologia.
- Mencao a fraude, crime, manipulacao ou adulteracao sem evidencia.

## Sinais de Alerta para Imagens

- Print ou card sem fonte visivel.
- Imagem com texto muito alarmista.
- Baixa qualidade ou cortes que dificultam verificacao.
- Ausencia de data, autor, veiculo ou contexto.
- Pedido para compartilhar rapidamente.
- Numeros, percentuais ou resultados sem origem.
- Conteudo que parece ser recorte de manchete sem link ou publicacao original.

## Fora do Escopo Inicial

Estes itens ficam para versoes futuras e devem ser confirmados antes de implementar:

- cadastro e login;
- banco de dados;
- historico de analises;
- busca automatica na web;
- upload de videos;
- armazenamento permanente de imagens enviadas;
- deteccao tecnica avancada de montagem, deepfake ou manipulacao visual;
- verificacao automatica em sites oficiais;
- extensao de navegador.

## Limites Eticos

A aplicacao deve evitar frases como:

- "isso e fake news";
- "isso e verdade";
- "essa pessoa esta mentindo";
- "essa pesquisa e falsa".

Preferir frases como:

- "este conteudo apresenta sinais de alto risco";
- "faltam informacoes importantes para verificacao";
- "procure a fonte original antes de compartilhar";
- "a analise indica necessidade de cautela".
