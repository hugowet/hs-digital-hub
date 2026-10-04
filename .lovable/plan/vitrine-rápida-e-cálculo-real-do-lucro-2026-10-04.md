# Vitrine rápida e cálculo real do lucro

## Resultado
- Fazer a página inicial abrir já com um primeiro lote de produtos atuais, sem a espera visível de “processando”.
- Manter busca, categorias, preço, frete grátis e ordenação consultando o catálogo real, sem carregar milhares de itens de uma vez.
- Carregar mais produtos em lotes para preservar velocidade no celular e no computador.
- Manter a sincronização da CJ e do Dropi separada da abertura da vitrine: o cliente sempre vê a última versão já salva.

## Valores e fornecedores
- Exibir e documentar o cálculo do produto de R$ 134: custo estimado do fornecedor, margem de 35%, comissão da plataforma e valor restante antes das taxas externas.
- Usar a credencial do Dropi que já está protegida no servidor; não mostrar nem devolver essa chave na interface.
- Manter o Dropi aguardando somente a URL oficial da API e o identificador do integrador, necessários para testar e importar produtos reais.

## Detalhes técnicos
- Trocar a leitura inicial apenas no navegador por carregamento antecipado no servidor e cache controlado pelo catálogo.
- Paginar e filtrar na consulta ao banco, evitando transferir e renderizar mais de sete mil produtos em cada abertura.
- Invalidar/atualizar os dados após sincronizações, sem executar importação de fornecedor durante a visita do cliente.
- Validar abertura inicial, filtros, busca, carregamento adicional e ausência de erros em telas pequenas e grandes.