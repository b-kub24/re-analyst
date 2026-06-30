-- RE Analyst Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'starter', 'pro', 'enterprise')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Deals table
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_address text not null,
  purchase_price numeric not null,
  units integer,
  property_type text,
  status text not null default 'draft' check (status in ('draft', 'analyzing', 'complete')),
  deal_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Analyses table
create table public.analyses (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  analysis_type text not null check (analysis_type in ('screening', 'underwriting', 'pro_forma', 'debt', 'risk', 'comps')),
  results jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now() not null
);

-- Subscriptions table (Stripe integration)
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.analyses enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Deals: users can CRUD their own deals
create policy "Users can view own deals" on public.deals for select using (auth.uid() = user_id);
create policy "Users can create deals" on public.deals for insert with check (auth.uid() = user_id);
create policy "Users can update own deals" on public.deals for update using (auth.uid() = user_id);
create policy "Users can delete own deals" on public.deals for delete using (auth.uid() = user_id);

-- Analyses: users can view analyses for their deals
create policy "Users can view own analyses" on public.analyses for select
  using (deal_id in (select id from public.deals where user_id = auth.uid()));
create policy "Users can create analyses" on public.analyses for insert
  with check (deal_id in (select id from public.deals where user_id = auth.uid()));

-- Subscriptions: users can view their own subscription
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index idx_deals_user_id on public.deals(user_id);
create index idx_deals_status on public.deals(status);
create index idx_analyses_deal_id on public.analyses(deal_id);
create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
