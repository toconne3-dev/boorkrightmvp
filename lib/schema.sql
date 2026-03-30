-- BookRight Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- ARTISTS (main user/account table)
-- ─────────────────────────────────────────
create table artists (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  business_name text,
  bio text,
  profession_type text check (profession_type in ('tattoo','hair','nails','lash','esthetics','piercing','other')),
  profile_photo_url text,
  booking_slug text unique,
  city text,
  plan text not null default 'free' check (plan in ('free','pro')),
  plan_started_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  buffer_minutes int not null default 0,
  advance_booking_days int not null default 60,
  min_notice_hours int not null default 24,
  timezone text not null default 'America/New_York',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table artists enable row level security;
create policy "Artists can view and edit their own record"
  on artists for all using (auth.uid() = id);

-- Public read for booking pages (by slug only)
create policy "Public can read artist profiles for booking"
  on artists for select using (true);

-- ─────────────────────────────────────────
-- SERVICES
-- ─────────────────────────────────────────
create table services (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 60,
  price int, -- in cents, null = price not shown
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table services enable row level security;
create policy "Artists manage their own services"
  on services for all using (auth.uid() = artist_id);
create policy "Public can view active services"
  on services for select using (is_active = true);

-- ─────────────────────────────────────────
-- AVAILABILITY RULES (weekly recurring)
-- ─────────────────────────────────────────
create table availability_rules (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time time not null, -- 24-hour, e.g. 09:00
  end_time time not null,   -- 24-hour, e.g. 21:00
  is_available boolean not null default true,
  unique (artist_id, day_of_week)
);

alter table availability_rules enable row level security;
create policy "Artists manage their own availability"
  on availability_rules for all using (auth.uid() = artist_id);
create policy "Public can view availability rules"
  on availability_rules for select using (true);

-- ─────────────────────────────────────────
-- BLOCKED TIMES (one-off overrides)
-- ─────────────────────────────────────────
create table blocked_times (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table blocked_times enable row level security;
create policy "Artists manage their own blocked times"
  on blocked_times for all using (auth.uid() = artist_id);
create policy "Public can view blocked times"
  on blocked_times for select using (true);

-- ─────────────────────────────────────────
-- CONSENT FORMS
-- ─────────────────────────────────────────
create table consent_forms (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade, -- null = global template
  name text not null,
  is_template boolean not null default false,
  profession_type text,
  fields jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table consent_forms enable row level security;
create policy "Artists manage their own consent forms"
  on consent_forms for all using (auth.uid() = artist_id);
create policy "Templates are publicly readable"
  on consent_forms for select using (is_template = true or auth.uid() = artist_id);

-- Seed global templates
insert into consent_forms (artist_id, name, is_template, profession_type, fields) values
(null, 'Tattoo Consent Form', true, 'tattoo', '[
  {"id":"t1","type":"yes_no","label":"Are you 18 years of age or older?","required":true},
  {"id":"t2","type":"yes_no","label":"Are you pregnant or breastfeeding?","required":true},
  {"id":"t3","type":"yes_no","label":"Do you have any blood-borne illnesses (HIV, Hepatitis)?","required":true},
  {"id":"t4","type":"yes_no","label":"Are you currently taking blood thinners or aspirin?","required":true},
  {"id":"t5","type":"yes_no","label":"Do you have diabetes?","required":true},
  {"id":"t6","type":"textarea","label":"Please list any allergies (latex, ink, metals, medications):","required":false},
  {"id":"t7","type":"textarea","label":"Please list any skin conditions in or near the tattoo area:","required":false},
  {"id":"t8","type":"yes_no","label":"Have you consumed alcohol or drugs in the last 24 hours?","required":true},
  {"id":"t9","type":"checkbox","label":"I understand that tattooing is a permanent procedure and I accept full responsibility for my decision.","required":true},
  {"id":"t10","type":"checkbox","label":"I confirm that all information provided is accurate. I understand this form is my responsibility and BookRight is not a medical or legal service provider.","required":true},
  {"id":"t11","type":"signature","label":"Client Signature","required":true}
]'),
(null, 'Hair Chemical Service Consent', true, 'hair', '[
  {"id":"h1","type":"yes_no","label":"Have you had a skin/patch allergy test in the last 48 hours?","required":true},
  {"id":"h2","type":"yes_no","label":"Are you pregnant or breastfeeding?","required":true},
  {"id":"h3","type":"yes_no","label":"Do you have any scalp conditions (psoriasis, eczema, open sores)?","required":true},
  {"id":"h4","type":"textarea","label":"List any allergies to hair products, dyes, or chemicals:","required":false},
  {"id":"h5","type":"textarea","label":"Describe your hair history (recent color, chemical treatments, relaxers):","required":false},
  {"id":"h6","type":"checkbox","label":"I understand that chemical services carry inherent risks and I accept full responsibility for proceeding. I confirm BookRight is not responsible for the outcome.","required":true},
  {"id":"h7","type":"signature","label":"Client Signature","required":true}
]'),
(null, 'Nail Enhancement Consent', true, 'nails', '[
  {"id":"n1","type":"yes_no","label":"Do you have any nail infections, fungal conditions, or open wounds on your hands/feet?","required":true},
  {"id":"n2","type":"yes_no","label":"Are you allergic to acrylics, gels, or nail adhesives?","required":true},
  {"id":"n3","type":"yes_no","label":"Do you have diabetes or circulatory conditions?","required":true},
  {"id":"n4","type":"textarea","label":"List any known allergies or sensitivities:","required":false},
  {"id":"n5","type":"checkbox","label":"I confirm the above information is accurate and I accept full responsibility for this service. I understand BookRight is not a medical or legal service provider.","required":true},
  {"id":"n6","type":"signature","label":"Client Signature","required":true}
]'),
(null, 'Lash Extension Consent', true, 'lash', '[
  {"id":"l1","type":"yes_no","label":"Have you had an allergy test for lash adhesive?","required":true},
  {"id":"l2","type":"yes_no","label":"Do you have eye infections, styes, or blepharitis currently?","required":true},
  {"id":"l3","type":"yes_no","label":"Are you allergic to latex or cyanoacrylate adhesives?","required":true},
  {"id":"l4","type":"yes_no","label":"Do you wear contact lenses?","required":true},
  {"id":"l5","type":"textarea","label":"List any eye conditions or sensitivities:","required":false},
  {"id":"l6","type":"checkbox","label":"I confirm this information is accurate. I understand lash extensions carry inherent risks and BookRight is not responsible for outcomes.","required":true},
  {"id":"l7","type":"signature","label":"Client Signature","required":true}
]'),
(null, 'General Health Intake', true, 'other', '[
  {"id":"g1","type":"textarea","label":"Please describe any medical conditions we should be aware of:","required":false},
  {"id":"g2","type":"textarea","label":"List any allergies (products, materials, medications):","required":false},
  {"id":"g3","type":"yes_no","label":"Are you pregnant or breastfeeding?","required":true},
  {"id":"g4","type":"checkbox","label":"I confirm all information provided is accurate and I accept full responsibility for this service. I understand this form is a tool provided by BookRight and does not constitute legal or medical advice.","required":true},
  {"id":"g5","type":"signature","label":"Client Signature","required":true}
]');

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
create table clients (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  notes text, -- private artist notes
  created_at timestamptz not null default now()
);

alter table clients enable row level security;
create policy "Artists manage their own clients"
  on clients for all using (auth.uid() = artist_id);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  artist_notes text,
  confirmation_sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;
create policy "Artists manage their own appointments"
  on appointments for all using (auth.uid() = artist_id);

-- ─────────────────────────────────────────
-- CONSENT FORM RESPONSES
-- ─────────────────────────────────────────
create table consent_form_responses (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  consent_form_id uuid not null references consent_forms(id) on delete restrict,
  responses jsonb not null default '{}',
  signature_url text,
  signed_at timestamptz,
  client_ip text,
  created_at timestamptz not null default now()
);

alter table consent_form_responses enable row level security;
create policy "Artists view their own form responses"
  on consent_form_responses for select
  using (
    auth.uid() = (
      select artist_id from appointments where id = appointment_id
    )
  );
-- Public insert (clients submitting forms — no auth)
create policy "Public can insert form responses"
  on consent_form_responses for insert with check (true);
