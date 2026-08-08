-- Seed data for Admin Portal (CMS, Templates, Broadcast History)
-- Connect to Supabase SQL editor or run `npx supabase db execute -f seed_admin.sql`

-- 1. Message Templates
insert into public.message_templates (name, content) values
('System Maintenance Notice', 'Dear [Name],

We will be performing scheduled maintenance on [Date]. The platform will be unavailable for approximately 2 hours.

Thank you,
Admin Team'),
('New Feature Announcement', 'Hi [Name]!

We are excited to announce a new feature that will improve your experience on our platform. Check it out today!

Best,
The Healnari Team'),
('Policy Update (Doctors)', 'Dear Dr. [Name],

Please note that our payout commission policy has been updated. Please review the new terms in your dashboard.

Regards,
Admin Team'),
('Health Camp Invite (Patients)', 'Hello [Name],

Join our upcoming free health camp this weekend! Click here to register and get your free checkup pass.

Stay Healthy,
Healnari');

-- 2. Broadcast History
insert into public.broadcast_history (display_id, subject, audience, status, opens, clicks, created_at) values
('BC-901', 'System Maintenance Notice', 'All Patients', 'Sent', '68%', '12%', now() - interval '10 days'),
('BC-902', 'New Feature: Video Consults', 'All Doctors', 'Sent', '82%', '45%', now() - interval '20 days'),
('BC-903', 'Weekend Health Camp', 'New Patients', 'Scheduled', '-', '-', now() + interval '5 days');

-- 3. CMS Articles (Articles & FAQs & Banners)
insert into public.cms_articles (display_id, title, author, category, status, views, created_at) values
('C-101', 'PCOS Diagnostic Algorithm v2', 'Medical Board', 'Symptom Checker', 'Published', '12K', now() - interval '30 days'),
('C-102', 'Nutrition Guide 2026', 'Dietetics Dept', 'Patient Resource', 'Published', '45K', now() - interval '45 days'),
('C-103', 'Endo Flare-up Protocol', 'Dr. S. Mitchell', 'Clinical Guide', 'Draft', '0', now() - interval '2 days');

-- 4. Reports History
insert into public.reports_history (report_id, name, type, date, size, status, created_at) values
('RPT-8802', 'Q2 Revenue Share', 'CSV', now() - interval '5 days', '452 KB', 'Generated', now() - interval '5 days'),
('RPT-8803', 'Doctor Payouts (July)', 'PDF', now() - interval '1 day', '1.2 MB', 'Generated', now() - interval '1 day'),
('RPT-8804', 'New Patient Signups', 'CSV', now(), '-', 'Processing', now());

raise notice 'Admin seed complete.';
