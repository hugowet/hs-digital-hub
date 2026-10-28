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

- Intro runs home-only once per browser session.
- Checkout eligibility comes from server-side order history, never browser state.
- HS Bank mirrors records, not bank balances. Owner SQL snapshots non-binding credit estimates; no debt/payouts. Coupons require funded atomic identity-bound redemption preserving seller net.

- Checkout reserves stock atomically; Mercado Pago splits stores with application_fee and verified webhooks/API.
- Delivery is atomic; tracking checks owner/payment and shares latest real events via Realtime/polling. Buyer photos verify purchases before signing; reports never grant access.
- Credenciais da plataforma e tokens OAuth dos vendedores ficam criptografados no banco e são lidos apenas no servidor; produtos digitais são liberados pela confirmação idempotente do pagamento.
- Papéis de comprador/vendedor são criados por trigger a partir do cadastro e nunca são gravados pelo navegador, evitando elevação de privilégio.
- Eventos de carrinho abandonado são persistidos apenas para usuários autenticados e protegidos por usuário, permitindo automações futuras sem expor contatos.
- Product media stays private with server-signed temporary URLs, never permanent public links.
- Checkout locks deterministically with bounded waits.
- Em lojas da própria conta Mercado Pago da plataforma, a cobrança omite `application_fee`; a comissão permanece no razão interno porque não existe repasse externo.
- A geração de Pix exige CPF do pagador e bloqueia autopagamento quando comprador e recebedor usam a mesma conta Mercado Pago.
- Pedidos só podem ser cancelados antes de iniciar uma cobrança; o cancelamento é feito no servidor, devolve estoque e preserva o histórico financeiro.
- Pagamentos iniciados são reconciliados com o Mercado Pago pela página do pedido, além do webhook assinado, para recuperar avisos atrasados.
- Supplier products use stable provider variant IDs; CJ USD costs are converted with the latest validated BCB USD/BRL selling rate before applying margin; CJ full-catalog imports use a persistent bounded queue; Dropi catalog contracts use admin-configured server-only mappings with SSRF-safe URLs; paid orders enter an idempotent fulfillment queue; all supplier credentials stay server-only.
- Catalog lists use cover-only paginated SSR DTOs; details share a prefetched Query cache. Supplier synchronization never runs on storefront load.
- CJ translation jobs send an explicitly authorized MyMemory contact server-side and reserve an atomic conservative identified byte budget shared with anonymous usage; retain SHA-256 cache, leases, deferrals and per-product progress, with no paid fallback or storefront calls.
- Catalog search intersects synonyms/attributes over indexed title, descriptions, specs and category; supplier filters precede pagination and persist in URL/cache; admin uses exact counts.
- Amazon options use a shared parser; templates and labels never confirm stock. Apparel stays stock-zero pending supplier confirmation.
- Physical checkout uses short-lived, buyer-bound server quotes per store; CJ quotes are converted from USD and own-stock products use each seller's Melhor Envio OAuth account, while platform commission never applies to shipping.
- CJ base prices have a database cost/markup/commission floor; CEP quotes store protected net targets and exact costs, with a transaction trigger rejecting underfunded CJ orders. Freight is allocated once outside commission; payment fees remain unverified.
- CJ quotes drain a bounded queue, match product/store and reuse saved-CEP quotes in cart; changes need acceptance. Official variants, server add-ons and profit guards remain authoritative.
- One delivery provider shares identity/address across cards and cart, avoiding duplicate auth listeners.
- Savings use recorded comparable prices, never generated discounts, CJ base references or embedded freight.
- CJ delivery exposes only Express and Premium mapped to confirmed services; buyer-bound quotes are reused across product and cart, Premium shows only its real difference, and first-purchase margin is in quoted prices and allocated atomically to the platform ledger, never re-added.
Game rewards are issued and rate-limited atomically in the database; shipping coupons expire after 24 hours and are redeemed atomically during checkout, funded only from platform commission up to R$ 30.
- Authentication uses email/password and Google; biometric/passkey authentication is intentionally excluded because it caused deployment startup failures.
- Cart, orders, games, seller tools, and administration live under the authenticated route gate so logout blocks every private surface.
- Public mutations revalidate identity; signed-out users see a login notice.
- Games and game coupons are buyer-only on both UI and server. Arcade sessions are single-use, coin awards are server-capped, 10% shipping coupons are issued atomically every 1,000 coins, and free shipping is limited to once per user per month.
- Social media/presence are participant-scoped; avatars use signed URLs. Presence/pins use RPCs; receipts require visible chats; one root listener handles alerts. Admin Club is free. Calls serialize SDP before ICE, avoid joining recipient listeners, and track WebRTC connection.
- Reviews use paid-order-verified RPCs and owner-private, server-signed photos.
- Radio shares one provider; Club suppresses HS announcements. Club Pix uses CPF-validated direct payments, QR/copy-paste and owner-bound API reconciliation plus signed webhooks; browser writes cannot grant access. Installability is manifest-only.
- Sitemap follows explicit route decisions and paginated public reads; private subtrees are excluded and failures never emit partial XML.
- Search schema excludes unconfirmed CJ offers and invented reviews.
- Todos uses scheduled sales-first, category-balanced Boa Vista daily ranking to avoid catalog timeouts.
- Home exit uses a sentinel; menus use a same-URL entry consumed on close/replaced by navigation to keep Back local.
- Order chat is a dialog over existing seller messages; closing never deletes messages.
