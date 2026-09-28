# Cadastro seguro, mídias e navegação de conta

## Objetivo
Corrigir o cadastro de produtos, permitir até 10 fotos ou vídeos por anúncio, retirar o mascote da página inicial, transformar as categorias em carrossel horizontal e ampliar o menu da conta com compras e notificações reais.

## Cadastro de produtos e segurança
- Validar no servidor a identidade do vendedor, a propriedade da loja e todos os campos do produto antes de gravar qualquer informação.
- Impedir que o navegador escolha livremente a loja proprietária do produto ou grave dados fora dos limites permitidos.
- Restringir o armazenamento para que cada vendedor envie e gerencie somente arquivos dentro da pasta da própria loja.
- Validar tipos e tamanhos: imagens de até 10 MB e vídeos de até 50 MB, com no máximo 10 mídias por produto.
- Fazer o cadastro de produto e os dados de entrega digital por uma operação protegida, evitando produtos incompletos caso uma etapa falhe.

## Fotos e vídeos
- Trocar o campo de foto única por um seletor múltiplo com pré-visualização, remoção e indicação da mídia principal.
- Salvar a primeira foto como capa; manter as demais fotos e vídeos em uma galeria ordenada.
- Exibir a galeria completa na página do produto, usando imagem ou player de vídeo conforme o tipo da mídia.
- Manter compatibilidade com os produtos existentes e suas galerias atuais.

## Página inicial e categorias
- Remover completamente o mascote Loop, o balão e a animação associados da tela inicial.
- Reorganizar o topo sem deixar espaço vazio, preservando a identidade visual da HS Digital.
- Substituir a lista lateral de categorias por um carrossel horizontal acessível, com setas, rolagem por toque e estado selecionado.
- Manter a faixa de preço e a ordenação disponíveis sem reduzir a área útil do catálogo no celular.

## Menu da conta
- Transformar o menu hambúrguer em um painel de conta mais completo, inspirado na organização do Mercado Livre.
- Incluir atalhos para Início, Minha conta, Minhas compras, Notificações, Carrinho e Seller Center; mostrar Admin somente para administradores.
- Criar “Minhas compras” com os pedidos reais do usuário, valores, datas e situação do pagamento.
- Criar “Notificações” com atualizações reais derivadas dos pedidos e pagamentos da conta, sem mensagens fictícias.
- Manter opções claras de entrar ou sair conforme o estado da conta.

## Validação
- Testar cadastro autenticado de vendedor com várias fotos e vídeo, incluindo rejeição de arquivo inválido e tentativa de usar outra loja.
- Confirmar que capa, galeria e vídeo aparecem corretamente no anúncio.
- Validar carrossel e menu em celular e desktop, além das telas de compras e notificações com sessão real.
- Executar nova verificação de segurança e confirmar que a compilação permanece sem erros.

## Detalhes técnicos
- As mídias continuarão no armazenamento privado, servidas por endereços temporários renovados quando necessário, em vez de links anuais gravados no produto.
- A galeria receberá metadados de tipo e ordem, preservando os campos antigos durante a transição.
- As novas páginas de conta serão protegidas e consultarão somente os registros do usuário autenticado.
