-- Fase 3 · Gestão: estoque (insumos, movimentos, lotes, ficha técnica com baixa
-- automática na venda), fornecedores, plano de contas e contas a pagar/receber.

alter table public.produtos add column por_kg boolean not null default false;

create type public.unidade as enum ('un', 'kg', 'g', 'l', 'ml', 'cx', 'pct');
create type public.tipo_mov_estoque as enum ('entrada', 'saida', 'perda', 'ajuste', 'venda', 'estorno');

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  documento text,
  telefone text,
  email text
);
create unique index fornecedores_doc_uq on public.fornecedores(restaurante_id, documento) where documento is not null and documento <> '';

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  unidade public.unidade not null default 'un',
  custo numeric(12,4) not null default 0,
  estoque_minimo numeric(12,3) not null default 0,
  local text not null default 'Depósito',
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  codigo_fornecedor text,
  ativo boolean not null default true
);

create table public.fichas_tecnicas (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete restrict,
  qtd numeric(12,4) not null check (qtd > 0),
  primary key (produto_id, insumo_id)
);

create table public.movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  tipo public.tipo_mov_estoque not null,
  qtd numeric(12,3) not null,            -- com sinal: + entra, − sai
  custo numeric(12,4),
  lote text,
  validade date,
  documento text,
  obs text,
  item_id uuid references public.itens(id) on delete set null,
  user_id uuid default auth.uid(),
  em timestamptz not null default now()
);
create index movimentos_estoque_insumo_idx on public.movimentos_estoque(insumo_id, em);

create view public.saldo_estoque with (security_invoker = true) as
  select i.restaurante_id, i.id as insumo_id, i.nome, i.unidade, i.estoque_minimo, i.custo,
         coalesce(sum(m.qtd), 0) as saldo
  from public.insumos i left join public.movimentos_estoque m on m.insumo_id = i.id
  group by i.id;

-- Entrada recalcula o custo médio ponderado do insumo
create or replace function public.custo_medio_entrada() returns trigger language plpgsql as $$
declare s numeric;
begin
  if new.tipo = 'entrada' and new.custo is not null and new.qtd > 0 then
    select coalesce(sum(qtd), 0) into s from movimentos_estoque where insumo_id = new.insumo_id;
    update insumos set custo = case when greatest(s, 0) + new.qtd > 0
      then (greatest(s, 0) * custo + new.qtd * new.custo) / (greatest(s, 0) + new.qtd) else new.custo end
    where id = new.insumo_id;
  end if;
  return new;
end $$;
create trigger custo_medio before insert on public.movimentos_estoque for each row execute function public.custo_medio_entrada();

-- Baixa automática pela ficha técnica: lançar item baixa; mudar qtd ajusta pela
-- ficha. Cancelar devolve exatamente o que aquele item baixou (mesmo que a ficha
-- tenha mudado depois ou o item seja anterior à ficha).
create or replace function public.devolver_item(p_item uuid, p_doc text) returns void language sql security definer set search_path = public as $$
  insert into movimentos_estoque (restaurante_id, insumo_id, tipo, qtd, documento, item_id)
  select restaurante_id, insumo_id, 'estorno', -sum(qtd), p_doc, p_item
  from movimentos_estoque where item_id = p_item and tipo in ('venda', 'estorno')
  group by restaurante_id, insumo_id having sum(qtd) <> 0;
$$;

create or replace function public.baixa_ficha() returns trigger language plpgsql security definer set search_path = public as $$
declare delta numeric := 0;
begin
  if tg_op = 'UPDATE' and new.cancelado_em is not null and old.cancelado_em is null then
    perform devolver_item(new.id, 'Cancelamento pedido ' || new.pedido_numero);
    return new;
  end if;
  if tg_op = 'INSERT' then delta := new.qtd;
  elsif new.cancelado_em is null and new.qtd <> old.qtd then delta := new.qtd - old.qtd;
  end if;
  if delta = 0 or new.produto_id is null then return new; end if;
  insert into movimentos_estoque (restaurante_id, insumo_id, tipo, qtd, documento, item_id)
  select new.restaurante_id, f.insumo_id, case when delta > 0 then 'venda'::tipo_mov_estoque else 'estorno' end,
         -(f.qtd * delta), 'Pedido ' || new.pedido_numero, new.id
  from fichas_tecnicas f where f.produto_id = new.produto_id;
  return new;
end $$;
create trigger baixa_ficha after insert or update of qtd, cancelado_em on public.itens for each row execute function public.baixa_ficha();

-- Conta inteira cancelada devolve o estoque dos itens ainda válidos
create or replace function public.estorno_conta_cancelada() returns trigger language plpgsql security definer set search_path = public as $$
declare i record;
begin
  if new.status = 'cancelada' and old.status <> 'cancelada' then
    for i in select id from itens where conta_id = new.id and cancelado_em is null loop
      perform devolver_item(i.id, 'Cancelamento conta ' || new.numero);
    end loop;
  end if;
  return new;
end $$;
create trigger estorno_conta after update of status on public.contas for each row execute function public.estorno_conta_cancelada();

-- ---------------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------------
create type public.grupo_dre as enum ('receita', 'cmv', 'pessoal', 'ocupacao', 'administrativa', 'marketing', 'impostos', 'financeira', 'investimento', 'outras');

create table public.plano_contas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  grupo public.grupo_dre not null
);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  tipo text not null check (tipo in ('pagar', 'receber')),
  descricao text not null,
  plano_id uuid references public.plano_contas(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  valor numeric(12,2) not null check (valor > 0),
  vencimento date not null,
  competencia date,
  documento text,
  parcela text,
  recorrente boolean not null default false,
  pago_em date,
  valor_pago numeric(12,2),
  multa numeric(12,2),
  juros numeric(12,2),
  desconto_pago numeric(12,2),
  forma_id uuid references public.formas_pagamento(id),
  anexo_url text,                         -- arquivo no Supabase Storage (bucket "anexos")
  obs text,
  criado_em timestamptz not null default now()
);
create index lancamentos_venc_idx on public.lancamentos(restaurante_id, vencimento) where pago_em is null;
create index lancamentos_pago_idx on public.lancamentos(restaurante_id, pago_em);

-- Auditoria de pagamento, estorno e exclusão de contas
create or replace function public.auditar_lancamento() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into auditoria (restaurante_id, user_id, acao, entidade, entidade_id, detalhes)
    values (old.restaurante_id, auth.uid(), 'financeiro.excluido', 'lancamento', old.id::text, jsonb_build_object('descricao', old.descricao, 'valor', old.valor));
    return old;
  end if;
  if new.pago_em is distinct from old.pago_em then
    insert into auditoria (restaurante_id, user_id, acao, entidade, entidade_id, detalhes)
    values (new.restaurante_id, auth.uid(), case when new.pago_em is null then 'financeiro.estorno' else 'financeiro.baixa' end, 'lancamento', new.id::text,
            jsonb_build_object('descricao', new.descricao, 'valor_pago', new.valor_pago));
  end if;
  return new;
end $$;
create trigger auditar_lancamento after update or delete on public.lancamentos for each row execute function public.auditar_lancamento();

-- RLS: estoque para membros; financeiro só para dono, gerente e caixa
do $$
declare t text;
begin
  foreach t in array array['fornecedores','insumos','fichas_tecnicas','movimentos_estoque']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros leem" on public.%I for select using (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros inserem" on public.%I for insert with check (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros alteram" on public.%I for update using (public.e_membro(restaurante_id))', t);
    execute format($p$create policy "gestao exclui" on public.%I for delete using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]))$p$, t);
  end loop;
  foreach t in array array['plano_contas','lancamentos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "financeiro" on public.%I for all using (public.tem_funcao(restaurante_id, array['dono','gerente','caixa']::public.funcao[])) with check (public.tem_funcao(restaurante_id, array['dono','gerente','caixa']::public.funcao[]))$p$, t);
  end loop;
end $$;
