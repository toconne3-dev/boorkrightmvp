-- BookRight — Deposit Migration
-- Run this in your Supabase SQL editor AFTER the original schema.sql

-- Add deposit amount to services (in cents, null = no deposit required)
alter table services add column if not exists deposit_amount int default null;

-- Add deposit tracking to appointments
alter table appointments add column if not exists deposit_required int default null;   -- amount charged (cents)
alter table appointments add column if not exists deposit_paid boolean not null default false;
alter table appointments add column if not exists deposit_payment_intent_id text default null;
