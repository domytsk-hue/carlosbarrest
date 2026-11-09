-- Fase 1 · Operação: cardápio, salão, clientes, pedidos de todos os canais e caixa.
-- Espelha src/lib/dominio/tipos.ts. Toda tabela tem restaurante_id e RLS por membro.

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  icone text,
  ordem int not null default 0
);

create type public.setor as enum ('cozinha', 'bar');

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  codigo text,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  preco_delivery numeric(10,2),
  foto text,
  setor public.setor not null default 'cozinha',
  ativo boolean not null default true,
  no_delivery boolean not null default true,
  unique (restaurante_id, codigo)
);

create table public.mesas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  numero int not null,
  area text not null default 'Salão',
  lugares int not null default 4,
  unique (restaurante_id, numero)
);

create table public.bairros (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  taxa numeric(10,2) not null default 0
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  telefone text not null,
  enderecos jsonb not null default '[]',
  credito numeric(10,2) not null default 0,
  criado_em timestamptz not null default now()
);
create index clientes_tel_idx on public.clientes(restaurante_id, telefone);

-- Funcionários sem login (garçom, entregador) também entram aqui; membros.user_id liga ao login.
create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  membro_id uuid references public.membros(id) on delete set null,
  nome text not null,
  funcao public.funcao not null,
  comissao numeric(10,2) not null default 0,
  ativo boolean not null default true
);

create type public.tipo_pagamento as enum ('dinheiro', 'pix', 'credito', 'debito', 'voucher', 'credito_cliente', 'fiado');

create table public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  tipo public.tipo_pagamento not null,
  taxa numeric(5,2) not null default 0,
  prazo_dias int not null default 0,
  ativo boolean not null default true
);

create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null
);

create table public.sessoes_caixa (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  caixa_id uuid not null references public.caixas(id),
  operador_id uuid references public.funcionarios(id),
  aberta_em timestamptz not null default now(),
  fundo numeric(10,2) not null default 0,
  fechada_em timestamptz,
  contado jsonb
);
-- Um caixa só pode ter uma sessão aberta
create unique index sessoes_caixa_aberta_uq on public.sessoes_caixa(caixa_id) where fechada_em is null;

create type public.tipo_movimento as enum ('suprimento', 'sangria', 'despesa', 'repasse');

create table public.movimentos_caixa (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  sessao_id uuid not null references public.sessoes_caixa(id) on delete cascade,
  tipo public.tipo_movimento not null,
  valor numeric(10,2) not null check (valor > 0),
  descricao text not null,
  destino text,
  em timestamptz not null default now()
);

create type public.canal as enum ('mesa', 'comanda', 'balcao', 'pdv', 'entrega', 'delivery', 'ifood', 'aiqfome', 'qrcode');
create type public.status_conta as enum ('aberta', 'fechamento', 'paga', 'cancelada');
create type public.status_entrega as enum ('novo', 'confirmado', 'preparo', 'pronto', 'saiu', 'entregue');
create type public.status_preparo as enum ('pendente', 'preparo', 'pronto', 'entregue');

create table public.contas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  numero bigint generated always as identity,
  canal public.canal not null,
  status public.status_conta not null default 'aberta',
  mesa_id uuid references public.mesas(id),
  comanda int,
  cliente_id uuid references public.clientes(id),
  cliente_nome text,
  telefone text,
  endereco jsonb,
  para_viagem boolean not null default false,
  entregador_id uuid references public.funcionarios(id),
  status_entrega public.status_entrega,
  saiu_em timestamptz,
  desconto numeric(10,2) not null default 0,
  servico_pct numeric(5,2) not null default 0,
  couvert numeric(10,2) not null default 0,
  taxa_entrega numeric(10,2) not null default 0,
  aberta_em timestamptz not null default now(),
  fechada_em timestamptz,
  atendente_id uuid references public.funcionarios(id),
  pessoas int,
  externo_id text,
  cupom text,
  observacao text
);
create index contas_abertas_idx on public.contas(restaurante_id, status) where status in ('aberta', 'fechamento');
create index contas_fechadas_idx on public.contas(restaurante_id, fechada_em);
-- Uma mesa só pode ter uma conta aberta
create unique index contas_mesa_aberta_uq on public.contas(mesa_id) where status in ('aberta', 'fechamento') and mesa_id is not null;

create table public.itens (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  conta_id uuid not null references public.contas(id) on delete cascade,
  produto_id uuid references public.produtos(id),
  nome text not null,
  preco numeric(10,2) not null,
  qtd numeric(10,3) not null check (qtd > 0),
  obs text,
  setor public.setor not null,
  atendente_id uuid references public.funcionarios(id),
  pedido_numero bigint not null,
  enviado_em timestamptz not null default now(),
  preparo public.status_preparo not null default 'pendente',
  cancelado_em timestamptz,
  cancelado_motivo text,
  cancelado_por uuid references public.funcionarios(id)
);
create index itens_conta_idx on public.itens(conta_id);
create index itens_preparo_idx on public.itens(restaurante_id, preparo) where preparo in ('pendente', 'preparo');
create sequence public.pedido_numero_seq start 64000;

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  conta_id uuid not null references public.contas(id) on delete cascade,
  forma_id uuid not null references public.formas_pagamento(id),
  sessao_caixa_id uuid references public.sessoes_caixa(id),
  valor numeric(10,2) not null check (valor > 0),
  troco numeric(10,2),
  referencia text,
  em timestamptz not null default now()
);
create index pagamentos_sessao_idx on public.pagamentos(sessao_caixa_id);

-- RLS: membros do restaurante leem e escrevem; exclusões só dono/gerente.
do $$
declare t text;
begin
  foreach t in array array['categorias','produtos','mesas','bairros','clientes','funcionarios','formas_pagamento','caixas','sessoes_caixa','movimentos_caixa','contas','itens','pagamentos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros leem" on public.%I for select using (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros inserem" on public.%I for insert with check (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros alteram" on public.%I for update using (public.e_membro(restaurante_id))', t);
    execute format($p$create policy "gestao exclui" on public.%I for delete using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]))$p$, t);
  end loop;
end $$;

-- Tempo real para as telas de operação (mesas, cozinha, entregas, caixa)
alter publication supabase_realtime add table public.contas, public.itens, public.pagamentos, public.sessoes_caixa;
