# Corrigir preços da CJ em reais

## Objetivo
Garantir que os produtos da CJ apareçam na vitrine pelo custo real convertido para reais, com os 35% de margem aplicados somente depois da conversão.

## Alterações
- Confirmar a moeda retornada pela CJ e tratar o custo do fornecedor na moeda correta.
- Obter uma cotação USD/BRL atual no servidor, com validação e sem expor credenciais.
- Calcular cada preço como `custo CJ × cotação USD/BRL × 1,35`, arredondado para centavos.
- Recalcular os produtos CJ já existentes para corrigir os valores muito baixos, sem duplicar itens.
- Manter a mesma regra para novas importações e futuras sincronizações.
- Exibir no painel do vendedor a moeda, cotação utilizada e explicar claramente o estado do Dropi.

## Dropi Nacional
O token já está protegido no servidor, mas o fornecedor continuará como “Aguardando acesso” até serem informados a URL oficial da API e o identificador do integrador. A tela indicará exatamente esses dois dados pendentes; nenhum produto fictício será criado.

## Segurança e validação
- Preservar RLS, checkout, pagamentos, estoque e pedidos existentes.
- Validar a cotação antes de atualizar preços e interromper a operação se ela estiver ausente ou fora de uma faixa segura.
- Conferir amostras no banco e na vitrine para confirmar custo convertido e margem de 35%.
