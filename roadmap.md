# HS Digital — MVP

## Ajustes atuais do catálogo CJ
- [ ] Mostrar total real de produtos CJ na aba Fornecedores.
- [ ] Melhorar busca por palavras, acentos e nomes de produtos.
- [ ] Atualizar descrições e especificações oficiais de todos os produtos CJ cadastrados em lotes retomáveis.
- [ ] Concluir títulos em português, mostrando progresso e impedimentos reais.

- [x] Exibir o Lupi empurrando um carrinho cheio e, depois, revelar “HS Digital Marketplace” e “Evoluindo com tecnologia” antes de entrar no site.

- [x] Bloquear carrinho e todas as páginas internas após o logout.
- [x] Ocultar a barra de tarefas e o carrinho sem uma sessão ativa.
- [x] Mostrar “Adicionado ao carrinho” em toda inclusão de produto.
- [x] Exibir aviso de login e bloquear ações privadas iniciadas sem sessão.
- [x] Controlar os quatro jogos por deslizes no celular e setas no computador.

- [x] Banco de dados: profiles, user_roles, stores, products, orders, order_items, platform_settings
- [x] Design system roxo/preto/branco
- [x] Home: banner, categorias, grid de produtos, filtros
- [x] Carrinho multi-loja com dados de entrega e pagamentos por loja
- [x] Seller Center: saldo, vendas do dia, cadastro de produto
- [x] Painel Admin: comissão e aprovação de lojas
- [x] Login (e-mail/senha + Google)
- [x] Usar a logo enviada pelo usuário no header, rodapé e ícone da aba
- [x] Revisão pré-publicação: páginas, produtos, imagens, carrinho, links e WhatsApp
- [x] Cadastro real com escolha entre Comprador e Vendedor
- [x] Estoque transacional e comissão automática por venda
- [x] Remover checkout via WhatsApp e criar checkout automático por Pix/Cartão, separado por loja
- [x] Permitir conexão das contas Mercado Pago dos vendedores e aplicar comissão automática por pagamento
- [x] Criar configuração segura e aba de transações Mercado Pago no painel Admin
- [x] Conceder acesso Admin mestre ao usuário solicitado com validação segura no banco
- [x] Corrigir acesso público indevido às imagens privadas de produtos
- [x] Remover o mascote Loop da Home
- [x] Adicionar filtros laterais, autocomplete e ordenação ao catálogo
- [x] Criar página completa de detalhes do produto
- [x] Registrar carrinhos abandonados de usuários autenticados
- [x] Adicionar 20 produtos fictícios com imagens próprias sem remover os 8 atuais
- [x] Informar claramente os bloqueios restantes para vendas reais e publicação

- [x] Adicionar liberação segura de produtos digitais após pagamento confirmado
- [x] Criar página de confirmação e acompanhamento do pedido do comprador
- [x] Validar webhook Mercado Pago, idempotência e devolução de estoque
- [x] Validar o payload final contra o exemplo enviado, mantendo `application_fee` calculado pela comissão vigente
- [ ] Ativação externa: salvar credenciais de produção, registrar a URL do webhook e conectar cada conta vendedora
- [ ] Homologação externa: realizar e estornar uma compra real de baixo valor após a ativação
- [x] Corrigir cadastro seguro de produtos e permitir até 10 fotos ou vídeos
- [x] Remover mascote e transformar categorias em carrossel
- [x] Ampliar menu da conta com compras e notificações reais
- [x] Eliminar travamento do checkout com bloqueios ordenados e limite de espera
- [x] Corrigir a recusa do Mercado Pago ao gerar pagamentos Pix
- [x] Corrigir o cadastro de produtos com fotos privadas
- [x] Adicionar uma área dedicada “Meus produtos” no painel do vendedor
- [x] Corrigir a geração de Pix e adicionar reconciliação do pagamento com o Mercado Pago
- [x] Permitir dispensar notificações e cancelar pedidos não pagos com devolução de estoque
- [x] Adicionar endereços salvos e preencher o endereço padrão no checkout
- [x] Adicionar mensagens por pedido, atendimento no Admin e badge de mensagens
- [x] Adicionar acompanhamento de entrega em cinco etapas
- [x] Adicionar roleta, raspadinha interativa, cobrinha e cupons de frete válidos por 24 horas.
- [x] Permitir usar cupons ganhos nos jogos durante o checkout, com teto de R$ 30.
- [x] Adicionar entrada por biometria/passkey, com cadastro após autenticação e credenciais protegidas por usuário.
- [x] Restringir Jogos & Prêmios a compradores e ocultar o acesso de contas vendedoras.
- [x] Corrigir os rótulos da roleta e transformar cada jogo em uma experiência de tela inteira.
- [x] Melhorar a cobrinha e adicionar Pac-Man, Flappy Bird e corredor de estrada, sem prêmios por partida isolada.
- [x] Somar moedas dos quatro jogos e liberar cupom de 10% no frete a cada 1.000 moedas.
- [x] Tornar os jogos mais difíceis após 500 moedas e limitar frete grátis de até R$ 30 a uma vez por mês por usuário.
- [x] Exibir “Vem brincar na HS e concorra a prêmios” antes de iniciar cada jogo.
- [x] Ajustar a roleta para quatro áreas grandes e legíveis conforme a referência enviada.
- [x] Exibir o acesso a Jogos & Prêmios abaixo do aviso de frete grátis da primeira compra, sem mostrar para vendedores.

- [x] Adicionar descrição longa ao cadastro de produto e persistir no catálogo.
- [x] Adicionar aba Painel do Vendedor com pedidos da loja.
- [x] Permitir que o vendedor avance/ajuste as cinco etapas de entrega.
- [x] Atualizar o rastreio do comprador em tempo real.
- [ ] Validar o fluxo vendedor → acompanhamento do comprador.

## Integração de fornecedores e logística

- [x] Calcular frete real por CEP no checkout e eliminar a tarifa fixa de R$ 19,90.
- [x] Disparar o envio automático à CJ no webhook após a confirmação do pagamento.
- [ ] Ativar o Melhor Envio em produção com as credenciais da plataforma; vendedores já podem conectar a própria conta, informar CEP de origem e cadastrar dimensões.
- [x] Fazer a vitrine abrir com produtos atuais já carregados, sem baixar nem renderizar todo o catálogo de uma vez.
- [x] Traduzir para português os títulos e descrições dos produtos CJ já importados e das próximas sincronizações.
- [x] Integrar catálogo e estoque da CJ Dropshipping à loja JJ Kuster.
- [x] Usar categorias populares da CJ como padrão e publicar os produtos importados na vitrine.
- [x] Ampliar o catálogo CJ para doze linhas variadas com cinco produtos populares por linha.
- [ ] Importar gradualmente até 20 produtos reais de todas as categorias oficiais da CJ (fila iniciada; conclusão depende dos limites diários do fornecedor).
- [x] Converter custos em USD da CJ pela cotação de venda USD/BRL do Banco Central antes de aplicar a margem e corrigir os produtos já importados.
- [x] Priorizar na fila da CJ fones, Bluetooth, smartwatches, caixas de som e eletrônicos de consumo.
- [x] Priorizar ferramentas, celulares, televisores e peças/acessórios automotivos e de motos, preservando a margem da loja.
- [ ] Remover a integração Dropi Nacional e substituí-la por um fornecedor brasileiro confiável que aceite cadastro somente com CPF, preferencialmente sem mensalidade, com integração simples e margem automática de 35% (em avaliação).
- [x] Encaminhar pedidos pagos da CJ aos fornecedores com processamento idempotente.
- [ ] Integrar rastreamento oficial dos Correios — aguardando contrato PJ e credenciais CWS; códigos do fornecedor já aparecem no acompanhamento.
- [x] Remover apenas produtos fictícios, preservando cadastros reais.

- [ ] Aplicar frete totalmente grátis automaticamente na primeira compra paga do comprador.
- [ ] Traduzir para português todos os produtos importados que ainda aparecem em inglês.

- [x] Centralizar verticalmente a passagem do Lupi e aumentar sua duração para 3 minutos, mantendo as frases no final.
