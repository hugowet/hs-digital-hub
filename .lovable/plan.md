# Catálogo popular da CJ

## Objetivo
Substituir a listagem antiga da CJ pela busca recomendada da API 2.0 e usar como padrão produtos populares de Casa e Escritório, Eletrônicos, Beleza, Esportes e Moda.

## Implementação
- Consultar produtos mais vendidos em cada categoria padrão, evitando duplicados.
- Buscar a variação real de cada produto para manter preço, estoque e envio automáticos funcionando.
- Respeitar o limite de chamadas da CJ e continuar a sincronização caso um item isolado falhe.
- Salvar os itens como ativos na loja JJ Kuster e executar a sincronização.
- Conferir no banco e na vitrine que os produtos reais apareceram.

## Detalhes técnicos
- Usar `product/listV2` com ordenação por quantidade de listagens.
- Manter o identificador estável de produto/variação usado no estoque e nos pedidos.
- Não criar produtos fictícios nem alterar o checkout.
