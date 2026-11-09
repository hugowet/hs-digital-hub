# Montink: importar estampas e calcular frete

## Resultado
- Na aba Montink, buscar seus produtos cadastrados e mostrar fotos, nomes, descrições, preços e opções para conferir.
- Selecionar os produtos e publicar na HS Digital sem digitar todos os dados novamente. Nada será publicado só por buscar.
- Preservar o preço com a margem que você cadastrou na Montink. Não acrescentar outra margem automaticamente; mostrar separadamente custo e comissão da HS.
- Consultar o frete real quando o comprador informar o CEP, antes do pagamento, sem você precisar conhecer o endereço antecipadamente.

## Etapas
1. Atualizar a autorização Montink por formulário seguro: o teste de leitura recebeu “Token inválido ou vencido”. Não pedir o token no chat.
2. Conferir uma página real de produtos e o retorno real de frete antes de definir os campos da importação.
3. Criar busca paginada e seleção para publicação, com prevenção de duplicados por loja e código Montink, preservando descrições, imagens e variações oficiais. Preços ou custos ausentes exigirão conferência, não estimativas.
4. Substituir o frete Montink atualmente zerado e o prazo fixo por cotações oficiais vinculadas ao comprador, CEP e itens. Respeitar as condições vigentes de frete embutido sem absorver custo desconhecido nem aplicar comissão sobre frete.
5. Corrigir o envio de pedidos para o formato oficial, incluindo variações e transportadora escolhida; manter envio apenas após pagamento confirmado e proteção contra duplicidade. Resultados incertos de envio não serão repetidos sem reconciliação.
6. Testar catálogo, seleção, cálculo e bloqueios sem cobrar, produzir ou publicar produtos reais durante os testes. Publicação de produtos exige sua seleção explícita.

## Limitações importantes
- A documentação oficial informa que o pedido importado precisa ser pago com saldo na Montink para seguir à produção. A aprovação na HS não prova pagamento à Montink nem início automático da fabricação.
- A conexão atual não está validada: é necessário atualizar o token antes de conferir seus produtos e fretes reais.
- Não usar preços antigos inventados, estoque genérico ou prazos estimados sem confirmação.

## Detalhes técnicos
- Funções autenticadas no servidor, com validação de proprietário da loja; token somente no servidor.
- API oficial: `Authorizationtoken`, GET `/products?pga=0&pp=…`, GET `/product/{id}`, POST `/calculate_shipping` e POST `/create_order`.
- Confirmar os contratos de resposta com a API real antes de implementar os adaptadores; guardar IDs e variações oficiais no catálogo e snapshots do pedido.
- Cotações curtas e vinculadas à identidade, CEP e itens no fluxo existente; testes de preço preservado, duplicação, opções e ausência de cotação válida.