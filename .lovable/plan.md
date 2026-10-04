# Configuração administrativa do Dropi

## Objetivo
Permitir que um administrador configure uma integração Dropi sem expor a credencial, teste o acesso e importe produtos reais para a vitrine.

## Implementação
- Adicionar ao Painel Admin uma aba “Dropi Nacional” com URL da API, identificador do integrador, margem e mapeamento configurável dos campos essenciais do produto.
- Salvar URL, identificador e mapeamento na configuração protegida do fornecedor; manter o token já salvo somente no servidor e nunca devolvê-lo à tela.
- Criar funções administrativas autenticadas que confirmem o papel de admin no servidor antes de ler ou alterar a configuração.
- Implementar um cliente Dropi configurável, com validação de URL HTTPS, timeout, tratamento claro dos erros e suporte a autenticação por token/identificador.
- Testar a conexão consultando o endpoint de produtos configurado e validando a resposta conforme o mapeamento informado.
- Importar produtos reais com identificadores estáveis, imagens, preço acrescido da margem, estoque e status ativo, atualizando itens já existentes sem duplicá-los.
- Permitir iniciar a importação manual na aba e exibir quantidade importada, ignorada e eventual erro retornado pelo fornecedor.
- Incluir integrações Dropi ativas na sincronização automática já usada pelos fornecedores.

## Segurança e validação
- Validar todos os campos no navegador e no servidor.
- Bloquear URLs locais, privadas ou não HTTPS para evitar acesso indevido à rede interna.
- Não registrar nem retornar credenciais; somente indicar se o token está configurado.
- Preservar RLS e todas as regras atuais de checkout, pagamentos e pedidos.

## Validação final
- Confirmar compilação sem erros.
- Testar a nova aba com uma conta administradora.
- Executar o teste de conexão; se o contrato informado for aceito, importar e conferir os itens ativos na vitrine. Caso o Dropi recuse a configuração, mostrar a resposta exata sem criar produtos fictícios.
