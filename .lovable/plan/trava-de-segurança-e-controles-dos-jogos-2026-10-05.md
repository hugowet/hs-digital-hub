# Trava de segurança e controles dos jogos

## Objetivo
- Bloquear imediatamente qualquer tentativa de usuário desconectado de usar recursos privados.
- Exibir um aviso claro solicitando login antes de levar o usuário à tela de acesso.
- Melhorar os controles dos quatro jogos para celular e computador.

## Implementação
- Manter todas as páginas internas sob a proteção central de autenticação e transportar o motivo do bloqueio até a tela de login.
- Impedir ações privadas iniciadas nas páginas públicas, como adicionar ao carrinho ou comprar, quando não houver sessão; mostrar o mesmo aviso e abrir o login.
- Garantir que carrinho, atalhos internos e barra privada desapareçam imediatamente após logout.
- Adicionar reconhecimento de deslizes em quatro direções nos jogos móveis, com limite mínimo para evitar movimentos acidentais.
- Aplicar as setas do teclado nos quatro jogos: direção para Cobrinha e Come-Come, esquerda/direita para o carro e seta para cima para o pássaro.
- Evitar direção reversa instantânea e repetição excessiva de comandos.

## Validação
- Testar páginas internas e ações públicas sem sessão, incluindo o aviso e o redirecionamento.
- Testar logout seguido de tentativa de retorno ao carrinho.
- Testar cada jogo com teclado e gestos simulados em tela móvel.
- Confirmar que a versão compila sem erros.
