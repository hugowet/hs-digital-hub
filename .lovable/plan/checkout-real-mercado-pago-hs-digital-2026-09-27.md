# Checkout real Mercado Pago — HS Digital

## Objetivo
Ativar cobranças reais por Pix e cartão, com um pagamento por loja, comissão automática da HS Digital, acompanhamento para comprador/vendedor/admin e liberação segura de produtos digitais.

## O que será entregue

### 1. Configuração segura do Mercado Pago
- Adicionar ao Admin uma área “Mercado Pago” que mostre se a integração de produção está configurada e conectada.
- Manter a Public Key disponível somente onde o formulário oficial do Mercado Pago precisar dela.
- Guardar Access Token, Client ID, Client Secret e segredo do webhook no cofre seguro do projeto; nunca exibir, devolver ou persistir esses valores no navegador.
- Substituir a antiga configuração de chave Pix do vendedor por “Conectar Mercado Pago”, usando autorização da própria conta do vendedor.

### 2. Checkout Pix e cartão
- Trocar o botão do WhatsApp por checkout interno autenticado.
- Registrar o pedido e reservar o estoque com os valores recalculados no servidor.
- Separar carrinhos com várias lojas em etapas de pagamento por loja.
- Criar cobranças reais com chave de idempotência e comissão da plataforma calculada pela taxa vigente.
- Exibir Pix Copia e Cola, QR Code dinâmico, expiração e acompanhamento do status.
- Integrar cartão com o formulário seguro do Mercado Pago, sem o app manipular dados completos do cartão.
- Criar uma página de status/confirmação com resumo do pedido e pagamentos por loja.

### 3. Confirmação automática e proteção
- Criar a rota pública de webhook do Mercado Pago.
- Validar a assinatura do webhook, registrar eventos sem duplicidade e consultar o pagamento diretamente no Mercado Pago antes de aprovar.
- Atualizar pedido e transações de forma idempotente; creditar o saldo do vendedor uma única vez.
- Devolver o estoque uma única vez em pagamentos recusados, cancelados ou expirados.
- Não usar avisos de sandbox na vitrine; o ambiente será considerado produção somente quando as credenciais reais estiverem configuradas e verificadas.

### 4. Vendedor e Admin
- Vendedor: conectar carteira, cadastrar produtos, definir produto físico/digital, configurar link seguro de entrega e acompanhar pedidos, pagamentos, comissão e valor líquido.
- Admin: abas de visão geral, vendedores, Mercado Pago e transações; filtros por status/loja/data e detalhes dos valores bruto, comissão e repasse.
- Preservar as permissões atuais: cada vendedor vê apenas sua loja e o Admin vê toda a operação.

### 5. Produtos digitais
- Adicionar tipo do produto e cadastro de link de entrega protegido.
- Criar autorização de acesso por comprador, pedido e item pago.
- Após confirmação integral do pagamento da loja, liberar imediatamente os links digitais na página de confirmação/compras.
- Links não serão incluídos em respostas públicas, no catálogo ou em eventos do webhook.

### 6. Verificação
- Validar compilação e erros em execução.
- Testar cadastro e conexão do vendedor, criação de produto, pedido multiloja, Pix, cartão, webhook duplicado e falha com devolução de estoque.
- Testar comprador, vendedor e Admin com sessões reais e conferir os registros gravados.
- Verificar páginas no celular e computador, incluindo QR Code, formulário de cartão e confirmação digital.

## Dependências para ativação real
- Credenciais de produção do Mercado Pago serão solicitadas pelo formulário seguro durante a implementação.
- A URL estável do webhook será criada no código; a ativação externa exige publicar a nova versão e cadastrar essa URL no Mercado Pago.
- A integração só será sinalizada como pronta para vendas após verificação das credenciais e de um pagamento real ou de baixo valor aprovado pelo Mercado Pago.
