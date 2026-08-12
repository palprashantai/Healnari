-- Real payment gateway integration (Cashfree). Payments are only ever
-- marked 'Paid' after a server-to-server call to Cashfree confirms the
-- order — the previous pay() flow, which marked a payment 'Paid' the
-- instant the frontend asked, is being retired in the same release.

alter table public.payments add column if not exists cf_order_id text;
alter table public.payments add column if not exists cf_payment_id text;

create unique index if not exists payments_cf_order_id_uq
  on public.payments (cf_order_id)
  where cf_order_id is not null;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('Paid', 'Pending', 'Insurance Claimed', 'Refunded', 'Failed'));
