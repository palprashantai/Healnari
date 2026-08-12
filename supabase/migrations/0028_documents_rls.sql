-- AUDIT_REPORT.md DB-8 — `documents` (pgvector RAG knowledge base for the
-- landing-page AI chat) had RLS disabled and no owner column, undocumented
-- as to whether that was intentional. It is: this is a single shared
-- knowledge base, not per-user data — there's no "owner" to scope rows to.
-- It's only ever read via match_documents(), called through the backend's
-- service-role client (bypasses RLS regardless), so enabling RLS here is
-- pure defense-in-depth against a hypothetical direct anon-key read/write —
-- no application code path is affected.
--
-- If this table is ever repurposed to store per-user embeddings, add an
-- owner column and a real ownership-scoped select policy before doing so —
-- the current "no direct client access at all" policy set below would be
-- actively wrong for that use case, not just incomplete.

alter table public.documents enable row level security;

create policy "documents_admin_only" on public.documents
  for all to authenticated using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

comment on table public.documents is
  'Shared pgvector knowledge base for the public landing-page AI chat (ai.service.ts handleLandingAgent). Not per-user data — do not add per-row ownership without also revisiting the RLS policy above.';
