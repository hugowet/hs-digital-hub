# HS Digital Marketplace

Atue como Desenvolvedor Full-Stack Sênior especialista em e-commerce e plataformas de marketplace (estilo Shopee e Mercado Livre).

Preciso do código-fonte e estrutura funcional para o MVP da plataforma "HS Digital".

### 1. REQUISITOS DE DESIGN E UI/UX

- Visual moderno, responsivo e limpo nas cores roxo, preto e branco (identidade HS Digital).

- Header com logo "HS Digital", barra de busca global, carrinho, notificações e menu do usuário.

- Página inicial (Home) com:

  1. Banner principal de destaques.

  2. Categorias em ícones.

  3. Grid de produtos no estilo Shopee/Mercado Livre (imagem, título, preço, avaliação em estrelas, tag "Frete Grátis" e botão de compra rápida).

### 2. ESTRUTURA DO SISTEMA (MODULOS)

- Comprador: Navegação de produtos, filtro por preço/categoria, carrinho multi-loja e tela de checkout.

- Vendedor (Seller Center): Dashboard com saldo, vendas do dia, botão "Cadastrar Produto" (com título, preço, fotos, estoque e categoria).

- Painel Admin: Gestão de taxa/comissão da plataforma por venda e aprovação de vendedores.

### 3. ARQUITETURA TÉCNICA

- Frontend: Next.js (React), Tailwind CSS e Lucide Icons.

- Backend/Database: Supabase (PostgreSQL + Auth + Storage para imagens).

- Pagamentos: Lógica preparada para Split de Pagamento via Mercado Pago ou Asaas (comissão da HS Digital + valor do vendedor).

### 4. O QUE ENTREGAR AGORA

1. Estrutura de arquivos do projeto em Next.js (App Router).

2. Schema do banco de dados SQL (tabelas: users, stores, products, orders, order_items).

3. O código completo da página inicial (app/page.tsx) funcional e estilizado com Tailwind CSS.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hs-digital-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/73d3db96-e083-42af-8e65-a74dbb20f835).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
