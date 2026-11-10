-- Sincronização entre aparelhos (tablet da cozinha, celular do garçom, caixa).
--
-- As telas guardam os dados no aparelho (localStorage). Para o tablet da
-- cozinha, o celular do garçom e o computador do caixa verem as mesmas contas
-- em tempo real, cada registro (uma conta, um produto, um chamado...) também
-- fica nesta tabela, e as mudanças chegam pelo Realtime.
-- Pode rodar mais de uma vez sem problema.

create table if not exists public.loja_registros (
  restaurante_id  uuid not null references public.restaurantes(id) on delete cascade,
  colecao         text not null,
  id              text not null,
  dados           jsonb,               -- null = apagado
  versao          bigint not null default 1,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid default auth.uid(),
  primary key (restaurante_id, colecao, id)
);

create index if not exists loja_registros_atualizado
  on public.loja_registros (restaurante_id, atualizado_em);

alter table public.loja_registros enable row level security;

drop policy if exists "loja_registros_ler" on public.loja_registros;
create policy "loja_registros_ler" on public.loja_registros
  for select to authenticated using (public.e_membro(restaurante_id));

drop policy if exists "loja_registros_criar" on public.loja_registros;
create policy "loja_registros_criar" on public.loja_registros
  for insert to authenticated with check (public.e_membro(restaurante_id));

drop policy if exists "loja_registros_alterar" on public.loja_registros;
create policy "loja_registros_alterar" on public.loja_registros
  for update to authenticated
  using (public.e_membro(restaurante_id))
  with check (public.e_membro(restaurante_id));

-- Grava vários registros de uma vez, cada um só se ninguém tiver gravado
-- antes (versão igual à que o aparelho conhece). Os que outro aparelho mudou
-- voltam em "conflitos" para o aparelho juntar e tentar de novo.
create or replace function public.gravar_registros(rid uuid, registros jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  r jsonb;
  v bigint;
  gravados jsonb := '[]'::jsonb;
  conflitos jsonb := '[]'::jsonb;
begin
  if not public.e_membro(rid) then
    raise exception 'Sem acesso a este restaurante';
  end if;
  for r in select * from jsonb_array_elements(registros) loop
    v := null;
    if coalesce((r->>'versao')::bigint, 0) = 0 then
      insert into public.loja_registros (restaurante_id, colecao, id, dados)
      values (rid, r->>'colecao', r->>'id', nullif(r->'dados', 'null'::jsonb))
      on conflict do nothing
      returning versao into v;
    else
      update public.loja_registros
         set dados = nullif(r->'dados', 'null'::jsonb),
             versao = versao + 1,
             atualizado_em = now(),
             atualizado_por = auth.uid()
       where restaurante_id = rid
         and colecao = r->>'colecao'
         and id = r->>'id'
         and versao = (r->>'versao')::bigint
      returning versao into v;
    end if;
    if v is null then
      conflitos := conflitos || jsonb_build_array(jsonb_build_object('colecao', r->>'colecao', 'id', r->>'id'));
    else
      gravados := gravados || jsonb_build_array(jsonb_build_object('colecao', r->>'colecao', 'id', r->>'id', 'versao', v));
    end if;
  end loop;
  return jsonb_build_object('gravados', gravados, 'conflitos', conflitos);
end;
$$;
revoke all on function public.gravar_registros(uuid, jsonb) from public, anon;
grant execute on function public.gravar_registros(uuid, jsonb) to authenticated;

-- Mudanças chegam aos outros aparelhos na hora (Realtime)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loja_registros'
  ) then
    alter publication supabase_realtime add table public.loja_registros;
  end if;
end $$;

