<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- O checkout registra o pedido atomicamente, reserva estoque e cobra cada loja separadamente pelo Mercado Pago; a comissão usa `application_fee` e toda confirmação depende de webhook assinado mais consulta à API.
- Credenciais da plataforma e tokens OAuth dos vendedores ficam criptografados no banco e são lidos apenas no servidor; produtos digitais são liberados pela confirmação idempotente do pagamento.
- Papéis de comprador/vendedor são criados por trigger a partir do cadastro e nunca são gravados pelo navegador, evitando elevação de privilégio.
- Eventos de carrinho abandonado são persistidos apenas para usuários autenticados e protegidos por usuário, permitindo automações futuras sem expor contatos.
- Mídias de produtos ficam em armazenamento privado e são entregues por URLs temporárias geradas no servidor, evitando links públicos permanentes.
- O checkout bloqueia produtos em ordem determinística e possui limites de espera, evitando travamentos por concorrência.
- Em lojas da própria conta Mercado Pago da plataforma, a cobrança omite `application_fee`; a comissão permanece no razão interno porque não existe repasse externo.
- A geração de Pix exige CPF do pagador e bloqueia autopagamento quando comprador e recebedor usam a mesma conta Mercado Pago.
- Pedidos só podem ser cancelados antes de iniciar uma cobrança; o cancelamento é feito no servidor, devolve estoque e preserva o histórico financeiro.
- Pagamentos iniciados são reconciliados com o Mercado Pago pela página do pedido, além do webhook assinado, para recuperar avisos atrasados.
- Supplier products use stable provider variant IDs; paid orders enter an idempotent fulfillment queue, and all supplier credentials stay server-only.
