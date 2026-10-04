# Frete real por CEP e envio automático ao fornecedor

## Resultado
- Remover a tarifa fixa de R$ 19,90 de todo o checkout.
- Exigir CEP completo e mostrar ao cliente opções reais com preço e prazo por loja.
- Usar a cotação oficial da CJ para produtos CJ e o Melhor Envio para produtos próprios.
- Cobrar no Mercado Pago exatamente o frete selecionado e persistir a cotação usada no pedido.
- Enviar pedidos CJ automaticamente assim que o webhook confirmar o pagamento, sem depender de ação do vendedor.

## Checkout e frete
- Adicionar CEP ao endereço do checkout e reaproveitar o endereço padrão salvo.
- Cotar cada loja separadamente, porque um carrinho pode reunir origens e fornecedores diferentes.
- Exibir modalidade, transportadora, prazo e preço; o cliente escolhe uma opção para cada loja.
- Produtos digitais continuam sem frete. Todos os produtos físicos passam a usar frete cotado, inclusive os hoje marcados como frete grátis.
- Invalidar a cotação quando CEP, itens ou quantidades mudarem e exigir nova cotação antes do pagamento.

## CJ Dropshipping
- Consultar o frete da CJ por CEP, variantes e quantidades reais do carrinho.
- Usar a modalidade escolhida também na criação do pedido CJ, em vez de fixar “CJPacket Ordinary”.
- Enviar CEP, UF, cidade, telefone e endereço completos no pedido.
- Após o webhook assinado confirmar a transação, tentar criar imediatamente o pedido na CJ.
- Preservar a fila idempotente existente: se a CJ estiver indisponível ou sem pontos, o webhook continua válido e a fila tenta novamente sem duplicar o pedido.

## Produtos próprios e Melhor Envio
- Adicionar peso, altura, largura e comprimento aos produtos físicos próprios.
- Adicionar CEP de origem à loja do vendedor.
- Permitir que cada vendedor conecte sua conta do Melhor Envio no Painel do Vendedor; credenciais e tokens ficam somente no servidor.
- Cotar Correios e transportadoras disponíveis pelo Melhor Envio para o CEP informado.
- Nesta etapa, o envio automático ao fornecedor aplica-se à CJ. Para produtos próprios, o pedido pago entra no painel do vendedor pronto para postagem; compra de etiqueta poderá usar a mesma conexão em uma etapa posterior.

## Segurança e valores
- Criar cotações com validade curta e identificador aleatório, salvas no banco e vinculadas ao comprador.
- No fechamento, recalcular produtos e validar no servidor que cada cotação pertence ao carrinho, ao CEP e ainda está válida.
- Salvar por loja o valor, modalidade, prazo, origem, destino e provedor; nunca aceitar preço enviado livremente pelo navegador.
- Incluir o frete no total da loja e no valor cobrado pelo Mercado Pago, sem aplicar a comissão de 12% sobre o frete.
- Manter proteção de acesso, estoque transacional e idempotência atuais.

## Alterações de dados
- Criar registros protegidos de cotação e frete por loja.
- Acrescentar campos opcionais de peso/dimensões ao produto e CEP de origem à loja sem quebrar cadastros existentes.
- Atualizar a criação atômica do pedido para consumir somente cotações válidas e substituir integralmente os dois cálculos fixos de R$ 19,90.

## Validação
- Testar CEP válido/inválido, mudança de quantidade, cotação expirada e carrinho com CJ, produto próprio e múltiplas lojas.
- Confirmar que o total exibido, o pedido e cada cobrança Mercado Pago têm o mesmo frete selecionado.
- Simular confirmação duplicada do webhook e comprovar que apenas um pedido CJ é criado.
- Confirmar que falha temporária da CJ mantém o envio pendente para nova tentativa.

## Dependência externa
- A cotação CJ pode usar a integração já ativa.
- Para ativar o frete de produtos próprios será necessário conectar uma conta de produção do Melhor Envio e cadastrar o CEP de origem e as dimensões dos produtos físicos.
