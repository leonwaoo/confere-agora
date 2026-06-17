# Plano de Testes

## Testes Manuais Essenciais

1. Texto com acusação grave sem fonte deve retornar risco alto.
2. Texto de saúde com promessa de cura deve retornar risco alto.
3. Texto com números sem metodologia deve gerar selo de dados sem método.
4. Link encurtado deve gerar cautela.
5. Link de página pública deve tentar capturar título, descrição, domínio, autor e data quando existirem.
6. Foto deve aceitar upload, mostrar prévia e enviar imagem para verificação complementar.
7. Foto com texto visível deve retornar texto detectado quando a verificação complementar conseguir ler.
8. Botão de copiar relatório deve copiar o laudo.
9. Botão de baixar relatório deve gerar arquivo `.txt`.
10. Botão de imagem deve baixar um `.png` do laudo.
11. Histórico local deve registrar e restaurar análises recentes.
12. Referências por categoria devem aparecer após análise.
13. Link analisado deve mostrar medidor de confiabilidade da fonte.
14. Abas `Como funciona` e `Projeto` devem abrir sem perder responsividade.
15. Em mobile, não deve haver texto estourando ou rolagem horizontal.

## Comandos de Verificação

```bash
pnpm build
pnpm test
pnpm test:e2e
```

Na primeira execução do Playwright, talvez seja necessário baixar o navegador:

```bash
pnpm exec playwright install chromium
```

## Testes End-to-End

Os testes Playwright cobrem:

- Analise de texto.
- Analise de link.
- Upload de foto.
- Ações de relatório.
- Layout mobile sem rolagem horizontal.

## Validação de Produção

- Abrir `https://confere-agora.vercel.app/`.
- Confirmar o selo `Verificação ativa`.
- Testar `/api/ai-status` e esperar `ok: true`.
- Confirmar que a interface não mostra o nome do provedor de IA.

## Casos de Regressão

- API complementar indisponível não deve impedir a análise local.
- Link inválido não deve quebrar a interface.
- Upload de imagem grande deve ser comprimido antes do envio.
- O resultado não deve usar linguagem definitiva como "é falso" ou "é verdadeiro".
- Rate limit deve responder com erro amigável quando houver excesso de requisições.
