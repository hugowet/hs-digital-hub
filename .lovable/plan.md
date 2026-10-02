# Priorizar eletrônicos populares da CJ

## Objetivo
Adicionar mais produtos eletrônicos reais à vitrine da HS Digital, com foco em fones de ouvido, áudio Bluetooth, relógios inteligentes, caixas de som e acessórios em alta.

## Implementação
- Priorizar na fila existente as categorias oficiais da CJ relacionadas a áudio, Bluetooth, smartwatches, caixas de som e eletrônicos de consumo.
- Preservar o processamento gradual de todas as 578 categorias, sem perder o progresso já salvo.
- Importar até 20 produtos reais por categoria priorizada, mantendo estoque, imagens, preços com margem e identificadores da CJ.
- Melhorar a classificação para que relógios inteligentes sejam exibidos em Eletrônicos, sem confundi-los com moda.
- Executar lotes da sincronização e conferir os novos itens ativos na vitrine.

## Limites
- Não criar produtos fictícios.
- Não alterar checkout, pagamentos ou pedidos.
- A quantidade imediata depende do catálogo disponível e dos limites de chamadas da CJ.

## Detalhes técnicos
- A ordenação da fila será feita apenas para categorias ainda pendentes; categorias em processamento ou concluídas serão preservadas.
- A sincronização continuará idempotente e com remoção automática de duplicados por variante do fornecedor.
