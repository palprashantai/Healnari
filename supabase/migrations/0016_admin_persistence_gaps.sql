-- Closes three admin-panel gaps where an action looked like it worked but
-- nothing was ever persisted:
--
-- 1. Suspend/Activate (Users.jsx, Doctor/PatientDetails.jsx) had no column
--    to write to — the backend comment literally said "no dedicated column
--    yet so just return updated flag". Every suspension silently reverted
--    on the next page load, and a suspended user could still log in.
-- 2. Doctor commission rate was hardcoded to 15% for every doctor
--    everywhere — the admin's commission slider on DoctorDetails.jsx never
--    actually changed anything.
-- 3. "Process Payout" had nowhere to store the bank/UPI reference number
--    the admin enters when marking a payout as paid.
alter table public.profiles
  add column if not exists status text not null default 'Active' check (status in ('Active', 'Suspended')),
  add column if not exists commission_rate numeric(5,2) not null default 15;

alter table public.payouts
  add column if not exists reference_id text;

-- Message templates always had a channel (email/whatsapp/push) and target
-- audience concept in the admin UI (TemplatesManager.jsx's create/edit
-- form collects both), but the backend only ever stored name/content —
-- every template in the list rendered with blank Channel/Audience cells.
alter table public.message_templates
  add column if not exists type text not null default 'email' check (type in ('email', 'whatsapp', 'push')),
  add column if not exists audience text not null default 'General' check (audience in ('General', 'Patient', 'Doctor'));
