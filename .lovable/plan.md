# Checkout automático com split

## Resultado
- Remover o redirecionamento do WhatsApp e oferecer pagamento por Pix ou Cartão.
- Cobrar o valor total, reter automaticamente a comissão configurada e destinar o restante ao vendedor.
- Adicionar uma área de Transações no painel Admin para acompanhar pagamentos, taxas e repasses.

## Decisão necessária
A integração exige uma conta real em um provedor. Para marketplace de produtos físicos no Brasil, vou comparar Asaas e Mercado Pago e implementar com o escolhido. O split é feito para uma carteira vinculada do vendedor no provedor; uma chave Pix isolada normalmente não substitui o cadastro financeiro e regulatório do recebedor.

## Implementação
- Guardar identificador seguro da carteira/subconta do vendedor e estado de habilitação para receber.
- Criar sessão de cobrança no servidor com validação de pedido, estoque, taxa, idempotência e valores calculados no banco.
- Criar retorno público e webhook assinado para atualizar pagamento, repasse, cancelamento e estorno.
- Reservar estoque durante a cobrança e confirmar ou liberar conforme o resultado.
- Manter credenciais privadas apenas no cofre de segredos.
- Criar tabela/visão de transações e aba Admin com filtros por status, pedido e vendedor.

## Verificação
- Testar Pix e cartão no ambiente de testes do provedor.
- Confirmar comissão, valor do vendedor, proteção contra pagamentos duplicados, atualização por webhook e estados de erro.
