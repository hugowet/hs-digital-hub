# Marketplace real: contas, Pix, estoque e comissão

## Resultado
- Cadastro passa a pedir nome e tipo de conta: **Comprador** ou **Vendedor**.
- Cada novo usuário recebe automaticamente perfil e papel corretos no banco.
- Vendedores configuram sua chave Pix no Seller Center antes de vender.
- Ao finalizar pelo WhatsApp, um comprador conectado registra o pedido, reserva o estoque e grava a comissão configurada antes de abrir a conversa.

## Alterações
- Ampliar perfis com tipo de conta e adicionar tipo/chave Pix à loja, protegidos para cada proprietário.
- Criar automação de cadastro para gerar perfil e papel a partir dos dados enviados na criação da conta.
- Criar operação transacional no banco para validar preços e estoque, calcular a comissão vigente, gravar pedido e itens, e reduzir estoque sem confiar nos valores enviados pelo navegador.
- Atualizar a tela de cadastro com nome e seletor Comprador/Vendedor; após confirmação, direcionar vendedores ao Seller Center.
- Adicionar área Pix ao perfil da loja e impedir finalização de pedidos com vendedores sem Pix configurado.
- Registrar o pedido antes de abrir `wa.me`, mantendo produtos, total e entrega codificados na mensagem.
- Preservar o carrinho se o redirecionamento falhar; limpar somente após o pedido ser registrado.

## Regras iniciais
- Comissão começa na taxa já configurada no painel administrativo (atualmente 12%) e cada item salva a taxa aplicada naquele momento.
- O Pix continua manual pelo WhatsApp; o sistema registra o pedido como aguardando pagamento.
- Contas Google existentes continuam entrando normalmente; a escolha explícita de perfil acontece no cadastro por e-mail.

## Verificação
- Testar cadastro dos dois perfis, criação/edição de loja e Pix, cadastro de produto com estoque e pedido autenticado.
- Confirmar redução de estoque, valores de comissão/repasse, URL `wa.me` codificada, páginas, imagens e build final.
