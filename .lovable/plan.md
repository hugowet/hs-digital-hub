# Proteção pós-logout e aviso do carrinho

## Alterações
- Colocar Carrinho, Jogos, Seller Center, Admin e páginas de pedido dentro da área que exige login, preservando os mesmos endereços.
- Ocultar carrinho, notificações, menu da conta e atalhos internos da barra quando não houver sessão.
- Ao sair, limpar dados protegidos e o carrinho antes de enviar o usuário à tela de entrada.
- Centralizar o alerta `Adicionado ao carrinho` para aparecer em qualquer botão que inclua um produto.

## Validação
- Testar que usuários desconectados são enviados para Entrar ao abrir páginas internas diretamente.
- Testar que a barra e o carrinho desaparecem após sair.
- Testar o alerta ao adicionar pela vitrine e pela página do produto.
