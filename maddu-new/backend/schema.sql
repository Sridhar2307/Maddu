-- ============================================================================
-- DAKSHINAGRIHUB POSTGRESQL / SUPABASE DATABASE SCHEMA
-- Southern India Integrated Agri-Livestock, Mandi & Tele-Vet Ecosystem
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE (Farmers, Breeders, Buyers, Vets, Admins)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    state VARCHAR(10) NOT NULL DEFAULT 'TN', -- TN, AP, TG, KA, KL, PY, AN, LD
    district VARCHAR(100) NOT NULL DEFAULT 'Erode',
    role VARCHAR(32) NOT NULL DEFAULT 'BUYER', -- BUYER, SELLER, VET, ADMIN
    kyc_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- PENDING, VERIFIED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rapid phone lookups during OTP auth
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ----------------------------------------------------------------------------
-- 2. LISTINGS TABLE (Biometric Verified Livestock & Dairy Cattle)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
    id VARCHAR(64) PRIMARY KEY,
    seller_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    breed VARCHAR(100) NOT NULL, -- Kangayam, Ongole, Hallikar, Umblachery, Punganur, etc.
    category VARCHAR(50) NOT NULL DEFAULT 'Cattle', -- Cattle, Buffalo, Goat, Sheep, Poultry
    state_id VARCHAR(10) NOT NULL DEFAULT 'TN',
    district VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    daily_yield NUMERIC(5, 2) DEFAULT 0.0, -- Daily milk yield in Litres
    lactation INTEGER DEFAULT 0, -- Lactation / Calving count
    pregnancy_status VARCHAR(120) DEFAULT 'Normal',
    ear_tag_id VARCHAR(64) NOT NULL, -- Government INAPH 12-digit RFID Tag
    ear_tag_verified BOOLEAN DEFAULT TRUE,
    estimated_weight INTEGER DEFAULT 350, -- Weight in kg calculated via Shaeffer formula
    image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SOLD, PAUSED, MODERATED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faceted search & regional filters
CREATE INDEX IF NOT EXISTS idx_listings_state_breed ON public.listings(state_id, breed);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_ear_tag ON public.listings(ear_tag_id);

-- ----------------------------------------------------------------------------
-- 3. ORDERS TABLE (PashuSafe Escrow & Carrier Logistics)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED', -- CREATED, PAID_ESCROW, DISPATCHED, DELIVERED, RELEASED
    logistics_status VARCHAR(255) DEFAULT 'Awaiting Escrow Deposit',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing ON public.orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ----------------------------------------------------------------------------
-- 4. VET_CONSULTATIONS TABLE (PashuCare Tele-Vet Diagnosis & Gestation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vet_consultations (
    id VARCHAR(64) PRIMARY KEY,
    farmer_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_doctor VARCHAR(255) DEFAULT 'Dr. Radhakrishnan (Vet)',
    symptom_key VARCHAR(50) NOT NULL, -- bloat, mastitis, fmd, fever, diarrhea
    notes TEXT,
    prescription TEXT,
    status VARCHAR(32) DEFAULT 'ASSIGNED', -- OPEN, ASSIGNED, RESOLVED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. MANDI_ALERTS TABLE (Real-Time Price & Shandy Alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mandi_alerts (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(32) NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    market VARCHAR(120) NOT NULL,
    channel VARCHAR(32) DEFAULT 'SMS', -- SMS, WHATSAPP, VOICE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INITIAL SEED DATA (Ready to Run in Supabase SQL Editor)
-- ============================================================================

-- Seed 1: Platform Users (Admin, Sellers, Buyers, Vet)
INSERT INTO public.users (id, name, phone, state, district, role, kyc_status)
VALUES 
    ('usr_admin_1', 'Senthil Nathan (Admin)', '+919000000001', 'TN', 'Chennai', 'ADMIN', 'VERIFIED'),
    ('usr_seller_1', 'Murugesan K (Breeder)', '+919000000002', 'TN', 'Erode', 'SELLER', 'VERIFIED'),
    ('usr_seller_2', 'Venkat Reddy (Dairy)', '+919000000003', 'AP', 'Guntur', 'SELLER', 'VERIFIED'),
    ('usr_buyer_1', 'Anand Murthy', '+919000000004', 'KA', 'Bengaluru', 'BUYER', 'VERIFIED'),
    ('usr_buyer_2', 'Rajesh Varma', '+919000000005', 'TN', 'Madurai', 'BUYER', 'PENDING'),
    ('usr_vet_1', 'Dr. Radhakrishnan (Vet)', '+919000000006', 'TN', 'Namakkal', 'VET', 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

-- Seed 2: Native Livestock Listings
INSERT INTO public.listings (id, seller_id, title, breed, category, state_id, district, price, daily_yield, lactation, pregnancy_status, ear_tag_id, ear_tag_verified, estimated_weight, image_url, status)
VALUES
    ('pashu-101', 'usr_seller_1', 'Pure Kangayam Heritage Milch Cow with Heifer Calf', 'Kangayam', 'Cattle', 'TN', 'Kangeyam, Tiruppur', 68000, 7.5, 2, 'Artificial Insemination done (45 days)', 'TN-3304-9812-4410', true, 360, 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80', 'ACTIVE'),
    ('pashu-102', 'usr_seller_2', 'Magnificent Ongole Breeding Stud Bull (Chittoor / Prakasam Lineage)', 'Ongole', 'Cattle', 'AP', 'Ongole, Prakasam', 115000, 0, 0, 'N/A (Breeding Bull)', 'AP-2801-7104-9923', true, 520, 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80', 'ACTIVE'),
    ('pashu-103', 'usr_seller_1', 'Hallikar Heavy Draught Bullocks Pair (Mandya Lineage)', 'Hallikar', 'Cattle', 'KA', 'Mandya, Karnataka', 92000, 0, 0, 'Draught Working Pair', 'KA-4102-5509-1123', true, 440, 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed 3: PashuSafe Escrow Orders
INSERT INTO public.orders (id, listing_id, buyer_id, seller_id, amount, status, logistics_status)
VALUES
    ('ord_tn_881', 'pashu-101', 'usr_buyer_1', 'usr_seller_1', 68000, 'DELIVERED', 'Arrived at Buyer Farm (Bengaluru)'),
    ('ord_ap_442', 'pashu-102', 'usr_buyer_2', 'usr_seller_2', 115000, 'PAID_ESCROW', 'In-Transit with Bolero Carrier')
ON CONFLICT (id) DO NOTHING;

