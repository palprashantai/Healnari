-- Add missing tables for the Admin and AI modules

-- Add consultation_fee to profiles if doctors set their own fee,
-- or for use in revenue calculations in Admin module.
alter table public.profiles 
add column if not exists consultation_fee numeric(10, 2) not null default 0.00;

-- ─────────────────────────────────────────────────────────────
-- support_tickets
-- ─────────────────────────────────────────────────────────────
create table public.support_tickets (
  id serial primary key,
  user_name text not null,
  user_role text not null check (user_role in ('doctor', 'patient')),
  issue text not null,
  status text not null default 'Open' check (status in ('Open', 'Investigating', 'Resolved')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- refund_requests
-- ─────────────────────────────────────────────────────────────
create table public.refund_requests (
  id serial primary key,
  patient_name text not null,
  amount numeric(10, 2) not null,
  reason text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Processed')),
  gateway text not null default 'Razorpay',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger refund_requests_set_updated_at
  before update on public.refund_requests
  for each row execute function public.set_updated_at();

-- RLS Policies
alter table public.support_tickets enable row level security;
alter table public.refund_requests enable row level security;

-- Only authenticated users can access support tickets and refund requests
-- In a real app, only admins could select all, but for now we'll mimic the "single-clinic" trust
create policy "support_tickets_select_all" on public.support_tickets for select to authenticated using (true);
create policy "support_tickets_insert_all" on public.support_tickets for insert to authenticated with check (true);
create policy "support_tickets_update_admin" on public.support_tickets for update to authenticated using (true);

create policy "refund_requests_select_all" on public.refund_requests for select to authenticated using (true);
create policy "refund_requests_insert_all" on public.refund_requests for insert to authenticated with check (true);
create policy "refund_requests_update_admin" on public.refund_requests for update to authenticated using (true);

grant select, insert, update, delete on public.support_tickets, public.refund_requests to authenticated;
grant usage, select on sequence support_tickets_id_seq to authenticated;
grant usage, select on sequence refund_requests_id_seq to authenticated;
