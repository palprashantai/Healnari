-- Migration 0033: Seed Clinical & Pharmacology Knowledge Base for Vector RAG & Function Calling

-- Ensure pgvector extension and documents table exist
create extension if not exists vector;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz default now()
);

create index if not exists documents_embedding_idx on public.documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Enable RLS
alter table public.documents enable row level security;

-- Policy for reading clinical guidelines
create policy "Authenticated users can read clinical documents"
  on public.documents for select
  to authenticated
  using (true);

create policy "Admins can manage documents"
  on public.documents for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to search documents by similarity
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float default 0.6,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.embedding is not null
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
