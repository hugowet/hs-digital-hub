# Expansão da HS Digital com Loop e catálogo completo

## Objetivo
Transformar a vitrine atual em uma experiência de marketplace mais completa, mantendo os 8 produtos existentes e adicionando os 20 produtos solicitados com imagens próprias.

## Experiência da página inicial
- Salvar a imagem enviada do mascote Loop como ativo oficial do projeto.
- Criar um destaque central no topo com Loop, balão de boas-vindas e animação suave de flutuação/iluminação, respeitando a preferência de movimento reduzido do dispositivo.
- Manter a identidade roxo, preto e branco existente, incorporando o vermelho do mascote como destaque complementar.
- Reorganizar o catálogo em uma área com filtros laterais por categoria e preço, seletor de ordenação e grade responsiva.
- Adicionar sugestões de busca em tempo real usando títulos de produtos, categorias e lojas.

## Catálogo e navegação
- Ampliar as categorias para as cinco novas famílias solicitadas sem remover as categorias e produtos atuais.
- Adicionar os 20 produtos fictícios com preços e quantidades vendidas informados, distribuídos em quatro itens por categoria.
- Criar uma imagem exclusiva e coerente para cada novo produto, armazenada como ativo do projeto.
- Tornar imagem e título de cada card navegáveis para a página individual do produto.
- Trocar a ação rápida para “Adicionar ao Carrinho”, atualizar o contador imediatamente e restaurar o aviso “Adicionado ao carrinho” pedido nesta atualização.

## Página de produto
- Criar uma rota individual e compartilhável para cada produto.
- Exibir galeria interativa com imagem principal, miniaturas disponíveis e ampliação ao passar o cursor.
- Mostrar preço, estoque, frete, avaliação, vendas, loja e selo “Vendedor Destaque”.
- Oferecer escolhas de variação quando o produto tiver opções; produtos sem opções não exibirão seletor vazio.
- Incluir “Comprar Agora”, que adiciona o item e leva ao carrinho/checkout, e “Adicionar ao Carrinho”.
- Organizar a parte inferior em Descrição, Especificações Técnicas e Perguntas & Respostas.

## Recuperação de carrinho abandonado
- Criar uma tabela protegida para registrar eventos de carrinho de usuários autenticados.
- Salvar usuário, e-mail da conta, produto, quantidade, estado `abandonado`, origem (`carrinho` ou `checkout`) e horários de criação/atualização.
- Atualizar o registro ao adicionar um item e ao abrir o checkout sem pagamento concluído; impedir leitura ou alteração entre usuários.
- Preparar campos de processamento e referência de webhook para uma futura automação de lembretes, sem enviar mensagens nesta etapa.
- Manter visitantes não autenticados com carrinho local, sem criar registros pessoais no banco.

## Dados e compatibilidade
- Acrescentar ao catálogo os campos necessários para descrição detalhada, especificações, variações e galeria.
- Preservar as regras atuais de estoque, comissão, vendedor e pedidos.
- Não remover nem substituir os 8 produtos já cadastrados.
- Manter o checkout existente funcional; a implementação do gateway automático já planejada permanece uma etapa separada.

## Validação
- Confirmar em desktop e celular: destaque do Loop, busca com sugestões, filtros, ordenação, cards e página individual.
- Confirmar que o contador muda sem recarregar e que o aviso aparece uma única vez.
- Testar usuário autenticado adicionando produto e acessando checkout, verificando os registros protegidos de abandono.
- Verificar os 28 produtos carregados, imagens válidas, links individuais, metadados e ausência de erros na publicação.

## Detalhes técnicos
- Interface em React 19, TanStack Start e componentes existentes do projeto.
- Dados, permissões e rastreamento no Lovable Cloud com regras por usuário.
- Imagens entregues pelo fluxo de ativos do projeto; nenhum endereço externo instável será usado.
