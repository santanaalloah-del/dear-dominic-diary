-- One logical chat send stays one logical send, even after an iPhone
-- timeout / app reload. No existing conversation messages are modified.
create table if not exists public.chat_delivery_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_send_id uuid not null,
  conversation_id bigint not null,
  message_digest text not null,
  status text not null default 'processing'
    check (status in ('processing','completed','uncertain')),
  user_message_id bigint,
  replies jsonb,
  modality text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, client_send_id)
);

create index if not exists chat_delivery_receipts_recent_idx
  on public.chat_delivery_receipts(user_id, created_at desc);

alter table public.chat_delivery_receipts enable row level security;
revoke all on table public.chat_delivery_receipts from anon, authenticated;
grant select, insert, update, delete on table public.chat_delivery_receipts to service_role;

comment on table public.chat_delivery_receipts is
  'Service-role-only exact-once claim/replay for mobile chat sends. No text copy or passwords.';
