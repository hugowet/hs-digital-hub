Analise e corrija o projeto HS Digital usando o código atual de src/routes/vendedor.tsx como base. NÃO recrie a página do zero e NÃO remova funcionalidades que já estão funcionando. Faça somente os ajustes necessários abaixo.

1. CORRIGIR AS ABAS DO VENDEDOR

No componente Tabs de src/routes/vendedor.tsx existem atualmente:

<TabsTrigger value="orders">Pedidos e Envios</TabsTrigger>
<TabsTrigger value="products">Meus produtos</TabsTrigger>
<TabsTrigger value="create">Cadastrar produto</TabsTrigger>
<TabsTrigger value="sales">Vendas e pagamentos</TabsTrigger>
<TabsTrigger value="orders">Painel do Vendedor</TabsTrigger>

Isso está errado porque "Pedidos e Envios" e "Painel do Vendedor" usam o mesmo value.

Altere a quarta aba para:

<TabsTrigger value="seller-panel">Painel do Vendedor</TabsTrigger>

E altere o respectivo:

<TabsContent value="orders">

do painel de rastreamento para:

<TabsContent value="seller-panel">

A aba "Pedidos e Envios" deve continuar usando value="orders" e continuar funcionando normalmente.

2. DESCRIÇÃO DO PRODUTO

No ProductForm de src/routes/vendedor.tsx já existe o estado:

const [description, setDescription] = useState("");

e já existe o Textarea abaixo da Categoria.

Mantenha essa implementação.

O campo deve permanecer logo abaixo de Categoria, com:

<Label htmlFor="p-description">Descrição do produto</Label>

e um Textarea ligado ao estado description, permitindo uma descrição longa, por exemplo maxLength 5000 e rows 6.

No envio do produto, garanta que description.trim() seja enviado para createSellerProduct.

IMPORTANTE: verifique também a implementação de createSellerProduct em src/lib/products.functions.ts. Garanta que o campo description recebido seja realmente persistido na coluna products.description no Supabase. Não basta apenas enviar o valor pelo formulário.

3. PAINEL DO VENDEDOR

A aba "Painel do Vendedor" deve utilizar os pedidos da loja do vendedor.

Use a consulta sellerOrders já existente em SellerCenter como referência, ou reutilize a mesma lógica sem criar consultas duplicadas desnecessariamente.

O painel deve mostrar uma tabela responsiva com:

- Pedido
- Data
- Produtos
- Pagamento
- Etapa da entrega
- Ação/status

Cada pedido deve possuir um SELECT/DROPDOWN para alteração manual do rastreamento.

4. DROPDOWN DE RASTREAMENTO

O dropdown deve possuir EXATAMENTE estas cinco opções e respectivos valores:

confirmed = Pedido confirmado
preparing = Em separação
shipped = Enviado
out_for_delivery = Saiu para entrega
delivered = Entregue

Pode reutilizar o array deliverySteps que já existe no arquivo:

const deliverySteps = [
  ["confirmed", "Pedido confirmado"],
  ["preparing", "Em separação"],
  ["shipped", "Enviado"],
  ["out_for_delivery", "Saiu para entrega"],
  ["delivered", "Entregue"],
] as const;

Não crie valores diferentes.

5. ATUALIZAÇÃO DO RASTREAMENTO

Quando o vendedor alterar o SELECT:

- obter o usuário autenticado com supabase.auth.getUser();
- inserir um novo registro em order_tracking_events;
- usar:
  order_id: order.id
  status: novo status selecionado
  created_by: user.user.id
  note: uma mensagem adequada, como "Status atualizado pelo vendedor"

Use insert em order_tracking_events para manter o histórico dos eventos.

Depois do insert:

- atualizar/invalidate a query ["seller-orders", store.id];
- mostrar toast de sucesso;
- se houver erro, mostrar toast.error com a mensagem real;
- impedir alterações enquanto a atualização daquele pedido estiver acontecendo.

Não crie registros duplicados automaticamente sem necessidade.

6. STATUS INICIAL

Se o pedido ainda não tiver evento em order_tracking_events:

- se payment_status === "approved", considerar inicialmente "confirmed";
- caso contrário, deixar sem etapa ou indicar que aguarda pagamento.

O SELECT deve refletir o último evento registrado daquele pedido.

7. VISÃO DO CLIENTE / BARRA "ACOMPANHE A ENTREGA"

A alteração feita pelo vendedor deve alimentar a mesma tabela order_tracking_events utilizada pela visão do comprador.

Não crie uma segunda tabela ou outro sistema de status.

Verifique a implementação da página de pedido do comprador e garanta que ela leia o último evento de order_tracking_events para montar a barra "Acompanhe a entrega".

Se a visão do comprador já possuir Supabase Realtime para order_tracking_events, preserve e aproveite essa implementação.

Se ainda não possuir Realtime, implemente uma inscrição Supabase Realtime específica para order_tracking_events filtrada pelo order_id da compra, fazendo a barra atualizar automaticamente quando um novo evento for inserido.

Não faça polling desnecessário.

8. NÃO DUPLICAR FUNCIONALIDADES

O arquivo atual possui o componente SellerOrdersTab com botões:

- Em separação
- Marcar Enviado
- Saiu para entrega
- Entregue

Não remova a aba "Pedidos e Envios" nem suas funcionalidades existentes sem necessidade.

Porém, o NOVO "Painel do Vendedor" deve ser independente e possuir o SELECT solicitado para alteração manual das cinco etapas.

Evite duas implementações conflitantes alterando o mesmo status.

9. SEGURANÇA E SUPABASE

Mantenha as verificações existentes de autenticação e loja.

Não exponha service_role no frontend.

Respeite as políticas RLS existentes do Supabase.

Se o insert em order_tracking_events falhar por RLS, não contorne a segurança no frontend. Identifique a política necessária e ajuste somente se for necessário para permitir que o vendedor autenticado da loja correspondente registre o evento daquele pedido.

10. QUALIDADE

Depois das alterações:

- garantir que o TypeScript compile sem erros;
- garantir que não existam dois TabsTrigger com o mesmo value;
- garantir que cada TabsContent tenha um value correspondente;
- manter Tailwind e os componentes UI existentes;
- manter o layout responsivo;
- não alterar o design geral da HS Digital;
- não apagar código funcional;
- não criar dados fictícios;
- não alterar outras páginas sem necessidade.

O resultado final deve ter:

Pedidos e Envios
Meus produtos
Cadastrar produto
Vendas e pagamentos
Painel do Vendedor

E dentro de "Painel do Vendedor", cada pedido recebido deve possuir um dropdown para selecionar:

Pedido confirmado
Em separação
Enviado
Saiu para entrega
Entregue

Ao selecionar uma etapa, deve ser criado o evento correspondente em order_tracking_events e a visão do comprador deve refletir a nova etapa da entrega.
