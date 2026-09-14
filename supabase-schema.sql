-- ---------------------------------------------------------------
-- Talk a Bit — CSAT — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- ---------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists csat_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- identificação (opcional, quem responde pode deixar em branco)
  nome text,
  email text,
  linkedin text,

  -- perguntas fechadas
  nps_recomendacao smallint not null check (nps_recomendacao between 0 and 10),
  exp_geral smallint not null check (exp_geral between 1 and 5),
  qualidade_conteudo smallint not null check (qualidade_conteudo between 1 and 5),
  participou_hackathon text not null check (participou_hackathon in ('Não', 'Acaso', 'Sieg')),
  exp_hackathon_acaso smallint check (exp_hackathon_acaso between 1 and 5),
  exp_hackathon_sieg smallint check (exp_hackathon_sieg between 1 and 5),
  estrutura_organizacao smallint not null check (estrutura_organizacao between 1 and 5),
  marcas_conhecidas text[] not null default '{}',
  marcas_interesse text[] not null default '{}',

  -- perguntas abertas
  talk_marcante text,
  sugestoes text
);

-- Row Level Security: qualquer pessoa pode ENVIAR uma resposta,
-- ninguém (além de você, pelo dashboard/service role) pode LER as
-- respostas de outra pessoa através da anon key exposta no site.
alter table csat_responses enable row level security;

drop policy if exists "csat_insert_publico" on csat_responses;
create policy "csat_insert_publico"
  on csat_responses
  for insert
  to anon
  with check (true);

-- Leitura: só quem está autenticado (você e quem você criar login em
-- Authentication > Users) consegue LER as respostas — é o que
-- alimenta o dashboard.html. Ninguém de fora enxerga nada.
drop policy if exists "csat_select_autenticado" on csat_responses;
create policy "csat_select_autenticado"
  on csat_responses
  for select
  to authenticated
  using (true);
