-- Cancelling a paid appointment used to flip payments.status straight to
-- 'Refunded' the instant it was cancelled — before any money had actually
-- moved and before an admin had even looked at the refund_requests row.
-- Split that into an honest two-step: 'Refund Pending' the moment a refund
-- is owed, 'Refunded' only once admin.processRefund() confirms a real
-- Cashfree refund (or, for non-gateway/cash payments with no cf_order_id,
-- once an admin manually confirms the money actually went back).

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('Paid', 'Pending', 'Insurance Claimed', 'Refunded', 'Failed', 'Refund Pending'));

alter table public.refund_requests add column if not exists payment_id uuid references public.payments(id) on delete set null;
alter table public.refund_requests add column if not exists cf_refund_id text;

create index if not exists refund_requests_payment_idx on public.refund_requests (payment_id);

-- 'gateway' was always 'Razorpay' — a leftover label from before any real
-- gateway was integrated. Refunds now actually go through Cashfree.
alter table public.refund_requests alter column gateway set default 'Cashfree';
update public.refund_requests set gateway = 'Cashfree' where gateway = 'Razorpay';
