-- Backs the Profile page's "Change Photo" — previously a fake upload that
-- just showed a success toast. Uploads are mediated by the vision backend
-- using the service-role client (never directly from the frontend, per the
-- app's existing "frontend only ever talks to vision" convention), so
-- these RLS policies are defense-in-depth rather than load-bearing: they
-- matter if storage is ever reached with a non-service-role key.
--
-- Objects are stored at `<patient_id>/avatar.<ext>` inside the bucket, so
-- `storage.foldername(name)` (which splits the object path on '/') gives
-- the owning user's id as its first element.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
