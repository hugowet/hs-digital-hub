# Lucro por venda e atualização dos preços

## Na sua conta de vendedor
- Mostrar **Lucro estimado** em cada venda de Pedidos e envios, exclusivamente para **hugohug12ou@gmail.com**.
- Separar valor da venda, comissão, custo dos produtos e frete conhecido. O repasse não será chamado de lucro.
- Avisar que taxas do pagamento, impostos e despesas não registradas ainda podem reduzir o resultado.
- Nas novas vendas, guardar o custo utilizado naquele momento: mudanças posteriores na vitrine não alteram o lucro histórico.
- Nos pedidos antigos, usar custos históricos confirmados quando existirem. Sem esse registro, indicar que falta confirmar o custo, sem inventar lucro.

## Preços na vitrine
- Amazon: aproveitar a conferência automática existente para ler também o preço atual do próprio anúncio e recalcular o preço na HS, tanto quando baixar quanto quando subir.
- CJ: preservar a atualização de preços já existente e suas proteções de custo, comissão, câmbio e envio.
- Manter a regra de margem vigente: custo até R$ 100 usa a regra atual de primeira compra/recompra; acima disso continua a tabela por faixas. Isso mantém a regra, não promete lucro líquido fixo depois de taxas desconhecidas.
- Conferir em lotes, sem aumentar a frequência nem contratar outro serviço. Amazon confere seis produtos por rodada de dez minutos; CJ percorre lotes e reinicia o ciclo após seis horas. Não é atualização instantânea de todo o catálogo.
- Se a leitura do fornecedor falhar ou o preço não estiver confirmado, não substituir o preço por um valor inventado.
- Preservar pedidos já fechados e exigir atualização/aceite quando uma mudança afetar uma compra ainda não concluída.

## Detalhes técnicos
- Adicionar registro protegido de custo por item no momento do pedido, sem expor custos novos aos compradores nem alterar o razão financeiro existente.
- Consultar as estimativas por função autenticada que verifica a conta solicitada e a propriedade da loja.
- Extrair preço Amazon somente da oferta principal correspondente ao produto, excluindo parcelas, preço riscado e recomendações.
- Reutilizar a precificação existente e manter as proteções CJ no banco e nas cotações.

## Verificação
- Testar exclusividade da conta, quantidade, comissão, frete contado uma vez, custo ausente e preservação do histórico.
- Testar aumento/redução de custo Amazon e rejeição de preços inválidos.
- Conferir Pedidos e envios na conta solicitada; se o acesso não estiver disponível, informar essa limitação.