-- Fase 0 · Fundação
-- Restaurantes (multi-empresa), membros com função, e log de auditoria.
-- Todo dado de negócio das próximas fases terá a coluna restaurante_id e
-- políticas RLS baseadas em public.e_membro(restaurante_id).

create type public.funcao as enum ('dono', 'gerente', 'caixa', 'garcom', 'cozinha', 'entregador');

-- ---------------------------------------------------------------------------
-- Restaurantes
-- ---------------------------------------------------------------------------
create table public.restaurantes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  razao_social  text,
  cnpj          text,
  telefone      text,
  endereco      jsonb,
  logo_url      text,
  cor_marca     text not null default '#9E1B1E',
  taxa_servico  numeric(5,2) not null default 10.00,
  fuso_horario  text not null default 'America/Bahia',
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Membros: vínculo usuário ↔ restaurante, com a função que define permissões
-- ---------------------------------------------------------------------------
create table public.membros (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  funcao          public.funcao not null,
  nome_exibicao   text not null,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  unique (restaurante_id, user_id)
);
create index membros_user_idx on public.membros(user_id);

-- Funções auxiliares usadas pelas políticas (security definer evita recursão de RLS)
create or replace function public.e_membro(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros where restaurante_id = rid and user_id = auth.uid() and ativo
  );
$$;

create or replace function public.tem_funcao(rid uuid, funcoes public.funcao[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros
    where restaurante_id = rid and user_id = auth.uid() and ativo and funcao = any(funcoes)
  );
$$;

-- ---------------------------------------------------------------------------
-- Auditoria: registro de ações sensíveis (cancelamento, desconto, sangria...)
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id              bigint generated always as identity primary key,
  restaurante_id  uuid not null references public.restaurantes(id) on delete cascade,
  user_id         uuid references auth.users(id),
  acao            text not null,          -- ex.: 'item.cancelado', 'caixa.sangria'
  entidade        text,                   -- ex.: 'pedido'
  entidade_id     text,
  detalhes        jsonb,
  criado_em       timestamptz not null default now()
);
create index auditoria_rest_data_idx on public.auditoria(restaurante_id, criado_em desc);

-- Grava uma entrada de auditoria em nome do usuário logado.
create or replace function public.registrar_auditoria(
  rid uuid, p_acao text, p_entidade text default null, p_entidade_id text default null, p_detalhes jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not e_membro(rid) then
    raise exception 'sem acesso a este restaurante';
  end if;
  insert into auditoria (restaurante_id, user_id, acao, entidade, entidade_id, detalhes)
  values (rid, auth.uid(), p_acao, p_entidade, p_entidade_id, p_detalhes);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.restaurantes enable row level security;
alter table public.membros      enable row level security;
alter table public.auditoria    enable row level security;

create policy "membros veem o restaurante" on public.restaurantes
  for select using (public.e_membro(id));
create policy "dono e gerente editam o restaurante" on public.restaurantes
  for update using (public.tem_funcao(id, array['dono','gerente']::public.funcao[]));

create policy "membros veem a equipe" on public.membros
  for select using (public.e_membro(restaurante_id));
create policy "dono e gerente gerenciam a equipe" on public.membros
  for all using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]))
  with check (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

-- Auditoria é somente leitura para dono e gerente; inserção apenas via registrar_auditoria().
create policy "dono e gerente leem a auditoria" on public.auditoria
  for select using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

-- ---------------------------------------------------------------------------
-- Criação de restaurante: quem cria vira dono
-- ---------------------------------------------------------------------------
create or replace function public.criar_restaurante(p_nome text, p_nome_exibicao text)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if auth.uid() is null then
    raise exception 'login necessário';
  end if;
  insert into restaurantes (nome) values (p_nome) returning id into rid;
  insert into membros (restaurante_id, user_id, funcao, nome_exibicao)
  values (rid, auth.uid(), 'dono', p_nome_exibicao);
  return rid;
end;
$$;

-- Tempo real: membros (troca de função/ativação aparece na hora)
alter publication supabase_realtime add table public.membros;
