# Checkout automático Mercado Pago

## Resultado
- Substituir o redirecionamento ao WhatsApp por um checkout interno para Pix e cartão.
- Conectar cada vendedor à própria carteira Mercado Pago por autorização segura.
- Em cada pagamento, reter automaticamente a comissão configurada e creditar o restante diretamente na carteira do vendedor.
- Adicionar ao painel Admin uma aba de transações, métricas e acompanhamento de status.
- Garantir acesso administrativo mestre para `hugoet373@gmail.com`, validado exclusivamente no banco.

## Fluxo de compra
- O carrinho continuará aceitando várias lojas, mas cada loja será paga separadamente. O Mercado Pago não permite dividir uma única cobrança entre várias carteiras independentes.
- O checkout exibirá uma etapa por loja, com endereço, Pix ou cartão e situação de cada cobrança.
- O pedido e o estoque serão reservados no banco antes da cobrança; falhas e expirações devolverão o estoque de forma idempotente.
- O preço, estoque, vendedor, comissão e valor de repasse serão sempre calculados no servidor.

## Vendedor
- Trocar a configuração de chave Pix por conexão da carteira Mercado Pago.
- Guardar somente identificadores públicos e credenciais criptografadas; tokens nunca irão para o navegador.
- Impedir vendas automáticas enquanto a loja não estiver aprovada e com carteira conectada.

## Pagamentos e segurança
- Criar registros de pagamentos e eventos com proteção por usuário, vendedor e administrador.
- Criar rotas seguras para autorização do vendedor, criação de cobrança e webhook do Mercado Pago.
- Validar a assinatura do webhook e consultar o pagamento diretamente no Mercado Pago antes de confirmar pedido, comissão, saldo e estoque.
- Corrigir a regra de imagens privadas para impedir downloads indiscriminados.

## Configuração necessária
- O código e o banco serão preparados agora. Para transações reais, será necessário conectar as credenciais da aplicação Marketplace do Mercado Pago em um formulário seguro.
- A URL estável do webhook será documentada para cadastro no Mercado Pago após a publicação.

## Verificação
- Validar cadastro comprador/vendedor, acesso Admin mestre, conexão simulada da carteira, criação segura do checkout, estados de pagamento, split, webhook idempotente e painel de transações.
- Confirmar que não existe mais nenhum link ou texto de checkout por WhatsApp.
