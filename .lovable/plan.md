# Catálogo completo da CJ

## Objetivo
Importar para a vitrine até 20 produtos reais de cada uma das 578 categorias disponíveis na conta CJ, sem criar itens fictícios e sem alterar checkout, pagamentos ou pedidos.

## Implementação
- Consultar e armazenar a árvore oficial de categorias da CJ, usando os identificadores reais das categorias finais.
- Criar uma fila persistente de importação por categoria, com progresso, contadores, bloqueio contra execuções simultâneas e retomada após interrupções.
- Processar a importação em pequenos lotes para respeitar o limite da CJ e o tempo máximo de cada execução.
- Buscar até 20 produtos populares por categoria, remover duplicados e manter preço com margem, imagens, variante, estoque e status ativo.
- Atualizar a sincronização automática e o botão do vendedor para iniciar/continuar o catálogo completo sem travar a página.
- Exibir o progresso da importação e continuar automaticamente nas execuções agendadas até concluir todas as categorias.
- Validar no banco e na vitrine os produtos ativos importados.

## Limites e segurança
- A CJ informou 578 categorias finais, portanto o objetivo máximo é 11.560 produtos antes da remoção de duplicados e categorias vazias.
- A importação será gradual por causa do limite de chamadas e da cota diária da CJ; o progresso ficará salvo e retomará sem repetir categorias concluídas.
- A automação terá limite por execução, trava única, operações idempotentes e pausa persistente em caso de bloqueio do fornecedor.
- Não criar produtos fictícios, não expor credenciais e não alterar checkout, pagamentos ou pedidos.
