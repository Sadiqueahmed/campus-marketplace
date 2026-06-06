
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'buyer');
CREATE TYPE public.listing_type AS ENUM ('DIGITAL_NOTE', 'PHYSICAL_ITEM');
CREATE TYPE public.item_condition AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR');
CREATE TYPE public.listing_status AS ENUM ('ACTIVE', 'SOLD', 'INACTIVE');
CREATE TYPE public.order_status AS ENUM ('PENDING', 'PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  college TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =========================
-- USER ROLES (separate table for security)
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- LISTINGS (generalized: digital notes + physical items)
-- =========================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.listing_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  condition public.item_condition,           -- physical items only
  location TEXT,                              -- physical items only
  file_url TEXT,                              -- digital notes only
  images TEXT[] NOT NULL DEFAULT '{}',
  status public.listing_status NOT NULL DEFAULT 'ACTIVE',
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_type ON public.listings(type);
CREATE INDEX idx_listings_category ON public.listings(category);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_seller ON public.listings(seller_id);
CREATE INDEX idx_listings_created ON public.listings(created_at DESC);

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active listings are public"
  ON public.listings FOR SELECT USING (status = 'ACTIVE' OR auth.uid() = seller_id);
CREATE POLICY "Sellers can create listings"
  ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers update own listings"
  ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own listings"
  ON public.listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- =========================
-- ORDERS (with commission split)
-- =========================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  platform_fee NUMERIC(10,2) NOT NULL CHECK (platform_fee >= 0),
  seller_earnings NUMERIC(10,2) NOT NULL CHECK (seller_earnings >= 0),
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  status public.order_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_listing ON public.orders(listing_id);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer or seller can view order"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers create orders"
  ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- =========================
-- TIMESTAMP TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- AUTO PROFILE + DEFAULT BUYER ROLE ON SIGNUP
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
