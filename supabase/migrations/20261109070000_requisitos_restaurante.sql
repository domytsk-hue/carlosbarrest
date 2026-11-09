-- Requisitos e correções do restaurante (documento de 09/11/2026).
-- Espelha src/lib/dominio/tipos.ts. Tabelas novas com restaurante_id e RLS por membro.

-- MES-02: localização da mesa (Salão, Varanda ou Rua)
update public.mesas set area = 'Salão' where area not in ('Salão', 'Varanda', 'Rua');
alter table public.mesas add constraint mesas_area_valida check (area in ('Salão', 'Varanda', 'Rua'));

-- FIA-02: cliente do fiado pode ficar sem telefone
alter table public.clientes alter column telefone drop not null;

-- FUN-02: comissão individual em % ou valor fixo por atendimento
alter table public.funcionarios
  add column comissao_tipo text not null default 'percentual' check (comissao_tipo in ('percentual', 'valor'));

-- REC-02/03: comissão escolhida pelo cliente (integral, parcial ou zero) e retirada no balcão
alter table public.contas
  add column servico_valor numeric(10,2) check (servico_valor >= 0),
  add column retirado_em timestamptz;

-- CAI-01/03: conferência do fundo de troco e apuração do fechamento
alter table public.sessoes_caixa
  add column fundo_conferido boolean not null default false,
  add column apuracao jsonb;

-- FIA-03/04: compras e pagamentos do fiado
create table public.fiado_movimentos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  tipo text not null check (tipo in ('lancamento', 'pagamento')),
  valor numeric(10,2) not null check (valor > 0),
  em timestamptz not null default now(),
  origem text not null,
  conta_id uuid references public.contas(id) on delete set null,
  forma_id uuid references public.formas_pagamento(id),
  sessao_caixa_id uuid references public.sessoes_caixa(id),
  obs text,
  usuario text
);
create index fiado_cliente_idx on public.fiado_movimentos(restaurante_id, cliente_id, em);

-- ADM-02: aparelhos que usam o sistema e a autorização de cada um
create table public.dispositivos (
  id text not null,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  funcionario_id uuid references public.funcionarios(id) on delete set null,
  autorizado boolean not null default false,
  descricao text,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz,
  primary key (restaurante_id, id)
);

alter table public.fiado_movimentos enable row level security;
create policy "membros leem" on public.fiado_movimentos for select using (public.e_membro(restaurante_id));
create policy "membros inserem" on public.fiado_movimentos for insert with check (public.e_membro(restaurante_id));
-- O histórico do fiado não é alterado nem apagado (só a gestão, em caso extremo)
create policy "gestao exclui" on public.fiado_movimentos for delete using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

alter table public.dispositivos enable row level security;
create policy "membros leem" on public.dispositivos for select using (public.e_membro(restaurante_id));
create policy "membros registram" on public.dispositivos for insert with check (public.e_membro(restaurante_id) and autorizado = false);
create policy "gestao autoriza" on public.dispositivos for update using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));
create policy "gestao exclui" on public.dispositivos for delete using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));
