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

- The storefront intro is a home-only, once-per-browser-session presentation so internal navigation remains immediate.
- Checkout eligibility comes from server-side order history, never browser state.

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
- Supplier products use stable provider variant IDs; CJ USD costs are converted with the latest validated BCB USD/BRL selling rate before applying margin; CJ full-catalog imports use a persistent bounded queue; Dropi catalog contracts use admin-configured server-only mappings with SSRF-safe URLs; paid orders enter an idempotent fulfillment queue; all supplier credentials stay server-only.
- Catalog lists use cover-only paginated SSR DTOs; details share a prefetched Query cache. Supplier synchronization never runs on storefront load.
- CJ translation jobs send an explicitly authorized MyMemory contact server-side and reserve an atomic conservative identified byte budget shared with anonymous usage; retain SHA-256 cache, leases, deferrals and per-product progress, with no paid fallback or storefront calls.
- Catalog search uses a trigger-maintained accent-normalized text column with a trigram index and intersects per-word synonym groups; home search changes keep prior results visible instead of blocking the route; supplier totals use exact database counts rather than the seller product page size.
- Physical checkout uses short-lived, buyer-bound server quotes per store; CJ quotes are converted from USD and own-stock products use each seller's Melhor Envio OAuth account, while platform commission never applies to shipping.
- CJ item-only base prices use the shared supplier pricing helper; live CEP quotes allocate confirmed consolidated freight before markup and store unit-price snapshots for atomic checkout, keeping supplier freight out of the commission base and preventing double charging. A leased bounded cron refresh updates base costs; no supplier fetch runs during storefront loading.
- Catalog/detail share saved prices; CJ options preserve official IDs and confirmed stock. Authenticated checkout atomically validates quotes and resolves optional add-on prices, never browser amounts.
- CJ delivery exposes only Express and Premium mapped to confirmed services; buyer-bound quotes are reused across product and cart, Premium shows only its real difference, and first-purchase margin is in quoted prices and allocated atomically to the platform ledger, never re-added.
Game rewards are issued and rate-limited atomically in the database; shipping coupons expire after 24 hours and are redeemed atomically during checkout, funded only from platform commission up to R$ 30.
- Authentication uses email/password and Google; biometric/passkey authentication is intentionally excluded because it caused deployment startup failures.
- Cart, orders, games, seller tools, and administration live under the authenticated route gate so logout blocks every private surface.
- Public catalog mutations revalidate the current user before changing private state and redirect unauthenticated attempts with a visible login notice.
- Games and game coupons are buyer-only on both UI and server. Arcade sessions are single-use, coin awards are server-capped, 10% shipping coupons are issued atomically every 1,000 coins, and free shipping is limited to once per user per month.
- Social media and presence are participant-scoped; expiring heartbeats and typing use authenticated RPCs, read receipts require visible chats. One root listener delivers persisted alerts. Club access uses protected admin roles with billing blocked for admins. Trend pins use owner/admin RPCs.
- Reviews persist via authenticated RPC with paid-order verification; owner-only storage reads and server signing of public-review paths preserve private photos.
- Radio shares one provider; Club suppresses HS announcements. Signed API-verified Pix intents grant monthly access; browser profile writes cannot grant membership. Installability uses a manifest and dismissible home prompt, without offline caching.
- Sitemap follows explicit route decisions and paginated public reads; private subtrees are excluded and failures never emit partial XML.
- Search schema omits destination-unconfirmed CJ offers and invented review statistics.
- Unfiltered Todos pages a per-day ranking table precomputed by a scheduled SQL job (category-balanced, sales-first, Boa Vista day), because computing it per request over the full catalog timed out.
