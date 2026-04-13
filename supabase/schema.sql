-- Run this in Supabase SQL editor.
-- This schema stores user profiles, clients, and invoices with row-level security.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_key text not null,
  name text not null,
  email text,
  address text,
  last_invoice text,
  last_invoice_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_key)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  issue_date date,
  due_date date,
  status text not null default 'due',
  currency text not null default 'USD',
  tax_rate numeric(10, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  company_name text,
  company_email text,
  company_address text,
  client_name text,
  client_email text,
  client_address text,
  project_name text,
  notes text,
  template text not null default 'modern',
  items jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, invoice_number)
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content_html text not null default '',
  category text not null default 'General',
  reading_time text not null default '5 min read',
  cover_image_url text,
  cover_image_alt text,
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_user_updated_idx on public.invoices(user_id, updated_at desc);
create index if not exists clients_user_updated_idx on public.clients(user_id, updated_at desc);
create index if not exists blog_posts_author_updated_idx on public.blog_posts(author_id, updated_at desc);
create index if not exists blog_posts_status_published_idx on public.blog_posts(status, published_at desc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.handle_updated_at();

create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.handle_updated_at();

create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.blog_posts enable row level security;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "clients_all_own"
on public.clients
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "invoices_all_own"
on public.invoices
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "blog_posts_select_published_or_owner"
on public.blog_posts
for select
using (status = 'published' or auth.uid() = author_id);

create policy "blog_posts_insert_own"
on public.blog_posts
for insert
with check (auth.uid() = author_id);

create policy "blog_posts_update_own"
on public.blog_posts
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "blog_posts_delete_own"
on public.blog_posts
for delete
using (auth.uid() = author_id);
