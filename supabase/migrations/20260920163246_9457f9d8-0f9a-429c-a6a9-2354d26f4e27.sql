CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'buyer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  status text NOT NULL DEFAULT 'pending',
  balance numeric(12,2) NOT NULL DEFAULT 0,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved stores are public" ON public.stores FOR SELECT USING (status = 'approved');
CREATE POLICY "owner reads own store" ON public.stores FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner creates store" ON public.stores FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates store" ON public.stores FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL,
  compare_at_price numeric(12,2),
  stock integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'geral',
  image_url text,
  free_shipping boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  reviews_count integer NOT NULL DEFAULT 0,
  sold_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products (category);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active products are public" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "seller reads own products" ON public.products FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "seller writes own products" ON public.products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "seller updates own products" ON public.products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "seller deletes own products" ON public.products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total numeric(12,2) NOT NULL,
  platform_fee numeric(12,2) NOT NULL DEFAULT 0,
  seller_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_provider text,
  payment_reference text,
  shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer reads own orders" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "buyer creates orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  platform_fee numeric(12,2) NOT NULL DEFAULT 0,
  seller_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer and seller read items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "buyer creates items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
);

CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.1200,
  payment_provider text NOT NULL DEFAULT 'mercadopago',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id)
);
GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings are public" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "admin updates settings" ON public.platform_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (id) VALUES (true);

INSERT INTO public.stores (id, name, slug, description, status, rating, balance) VALUES
  ('11111111-1111-4111-8111-111111111111', 'TechHouse Oficial', 'techhouse', 'Eletrônicos e acessórios com garantia.', 'approved', 4.9, 12850.40),
  ('22222222-2222-4222-8222-222222222222', 'Urban Store', 'urban-store', 'Moda, calçados e mochilas.', 'approved', 4.7, 5320.00),
  ('33333333-3333-4333-8333-333333333333', 'Bella Beauty', 'bella-beauty', 'Beleza e cuidados com a pele.', 'pending', 4.8, 0);

INSERT INTO public.products (store_id, title, price, compare_at_price, stock, category, image_url, free_shipping, rating, reviews_count, sold_count) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Headphone Bluetooth HS Pro com Cancelamento de Ruído', 349.90, 599.90, 42, 'eletronicos', '/images/p1.jpg', true, 4.8, 1243, 3200),
  ('11111111-1111-4111-8111-111111111111', 'Smartwatch HS Fit 2 GPS 45mm', 289.00, 459.00, 30, 'eletronicos', '/images/p2.jpg', true, 4.6, 872, 2100),
  ('11111111-1111-4111-8111-111111111111', 'Fone Bluetooth TWS com Estojo de Carga', 129.90, 219.90, 120, 'eletronicos', '/images/p3.jpg', true, 4.5, 2310, 8700),
  ('22222222-2222-4222-8222-222222222222', 'Tênis Esportivo Runner Purple', 219.90, 329.90, 55, 'moda', '/images/p4.jpg', false, 4.7, 540, 1400),
  ('11111111-1111-4111-8111-111111111111', 'Caixa de Som Portátil Bass 20W à Prova d''Água', 179.90, 249.90, 80, 'eletronicos', '/images/p5.jpg', true, 4.4, 690, 2500),
  ('22222222-2222-4222-8222-222222222222', 'Mochila Executiva para Notebook 15,6"', 159.00, 239.00, 65, 'moda', '/images/p6.jpg', true, 4.6, 410, 980),
  ('11111111-1111-4111-8111-111111111111', 'Teclado Mecânico Gamer RGB Switch Blue', 259.90, 399.90, 25, 'games', '/images/p7.jpg', false, 4.9, 318, 760),
  ('33333333-3333-4333-8333-333333333333', 'Sérum Facial Vitamina C 30ml', 89.90, 139.90, 200, 'beleza', '/images/p8.jpg', true, 4.8, 1580, 5400);