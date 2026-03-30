-- BookRight — Deposit Method Migration
-- Run this in your Supabase SQL editor AFTER schema.sql and schema-deposits.sql
-- Replaces Stripe-based deposit flow with manual payment instructions

-- Add deposit collection method to artists
alter table artists
  add column if not exists deposit_method text default null,       -- 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'other'
  add column if not exists deposit_handle text default null,       -- @username, phone, email, etc.
  add column if not exists deposit_instructions text default null; -- optional custom message shown to clients

-- Drop Stripe-specific deposit column from appointments (no longer needed)
-- NOTE: Only run this line if you never collected real Stripe deposits
-- alter table appointments drop column if exists deposit_payment_intent_id;
