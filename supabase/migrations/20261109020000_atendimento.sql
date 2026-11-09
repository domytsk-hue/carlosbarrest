-- Fase 2 · Atendimento: cozinha (KDS), app do garçom, cardápio QR Code da mesa,
-- Pix e delivery próprio. As páginas do cliente (/m/[mesa] e /cardapio) não têm
-- login: falam com o banco só pelas funções públicas abaixo (security definer),
-- que validam tudo e nunca expõem dados de outros clientes.

-- ---------------------------------------------------------------------------
-- Configurações do restaurante usadas pelo atendimento
-- ---------------------------------------------------------------------------
alter table public.restaurantes
  add column slug            text unique,
  add column whatsapp        text,
  add column chave_pix       text,
  add column cidade_pix      text,
  add column delivery_aberto boolean not null default false,
  add column pedido_minimo   numeric(10,2) not null default 0,
  add column tempo_entrega   int not null default 45,
  add column qr_pedidos      boolean not null default true;

-- Origem do item quando não há funcionário (pedido feito pelo cliente)
alter table public.itens add column origem text check (origem in ('qrcode', 'online'));

-- Forma escolhida no cardápio online e token para o cliente acompanhar o pedido
alter table public.contas
  add column pagamento_online text check (pagamento_online in ('pix', 'dinheiro', 'cartao')),
  add column token uuid not null default gen_random_uuid();
create unique index contas_token_uq on public.contas(token);

-- ---------------------------------------------------------------------------
-- Chamados das mesas (chamar garçom, pedir a conta)
-- ---------------------------------------------------------------------------
create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  motivo text not null check (motivo in ('garcom', 'conta')),
  em timestamptz not null default now(),
  atendido_em timestamptz,
  atendido_por uuid references public.funcionarios(id)
);
create index chamados_abertos_idx on public.chamados(restaurante_id) where atendido_em is null;

alter table public.chamados enable row level security;
create policy "membros leem" on public.chamados for select using (public.e_membro(restaurante_id));
create policy "membros inserem" on public.chamados for insert with check (public.e_membro(restaurante_id));
create policy "membros alteram" on public.chamados for update using (public.e_membro(restaurante_id));
create policy "gestao exclui" on public.chamados for delete using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

alter publication supabase_realtime add table public.chamados;

-- ---------------------------------------------------------------------------
-- Funções públicas (anon) das páginas do cliente
-- ---------------------------------------------------------------------------
create or replace function public.restaurante_por_slug(p_slug text)
returns public.restaurantes language sql stable security definer set search_path = public as $$
  select * from restaurantes where slug = p_slug;
$$;

/** Cardápio público: dados da loja, categorias e produtos ativos. */
create or replace function public.cardapio_publico(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r restaurantes;
begin
  r := restaurante_por_slug(p_slug);
  if r.id is null then raise exception 'restaurante não encontrado'; end if;
  return jsonb_build_object(
    'restaurante', jsonb_build_object('nome', r.nome, 'whatsapp', r.whatsapp, 'endereco', r.endereco,
      'chave_pix', r.chave_pix, 'cidade_pix', r.cidade_pix, 'delivery_aberto', r.delivery_aberto,
      'pedido_minimo', r.pedido_minimo, 'tempo_entrega', r.tempo_entrega, 'qr_pedidos', r.qr_pedidos,
      'taxa_servico', r.taxa_servico),
    'categorias', coalesce((select jsonb_agg(to_jsonb(c) - 'restaurante_id' order by c.ordem) from categorias c where c.restaurante_id = r.id), '[]'),
    'produtos', coalesce((select jsonb_agg(to_jsonb(p) - 'restaurante_id') from produtos p where p.restaurante_id = r.id and p.ativo), '[]'),
    'bairros', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nome', b.nome, 'taxa', b.taxa)) from bairros b where b.restaurante_id = r.id), '[]')
  );
end $$;

/** Insere itens validados (produto do restaurante, 1 a 50 unidades) e devolve o número do pedido. */
create or replace function public._lancar_itens_cliente(rid uuid, cid uuid, p_itens jsonb, p_origem text, p_delivery boolean)
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint := nextval('pedido_numero_seq'); it jsonb; p produtos; q numeric;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 60 then
    raise exception 'itens inválidos';
  end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    select * into p from produtos where id = (it->>'produto_id')::uuid and restaurante_id = rid and ativo and (not p_delivery or no_delivery);
    if p.id is null then raise exception 'produto indisponível'; end if;
    q := (it->>'qtd')::numeric;
    if q is null or q < 1 or q > 50 or q <> trunc(q) then raise exception 'quantidade inválida'; end if;
    insert into itens (restaurante_id, conta_id, produto_id, nome, preco, qtd, obs, setor, pedido_numero, origem)
    values (rid, cid, p.id, p.nome, case when p_delivery then coalesce(p.preco_delivery, p.preco) else p.preco end, q,
            left(nullif(trim(it->>'obs'), ''), 140), p.setor, n, p_origem);
  end loop;
  return n;
end $$;
revoke all on function public._lancar_itens_cliente(uuid, uuid, jsonb, text, boolean) from public, anon, authenticated;

/** Pedido feito pelo QR Code da mesa: entra na conta aberta da mesa (abre se não houver). */
create or replace function public.pedido_mesa(p_slug text, p_mesa int, p_itens jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare r restaurantes; m mesas; cid uuid;
begin
  r := restaurante_por_slug(p_slug);
  if r.id is null or not r.qr_pedidos then raise exception 'pedidos pelo QR Code desligados'; end if;
  select * into m from mesas where restaurante_id = r.id and numero = p_mesa;
  if m.id is null then raise exception 'mesa não encontrada'; end if;
  select id into cid from contas where mesa_id = m.id and status in ('aberta', 'fechamento') for update;
  if cid is null then
    insert into contas (restaurante_id, canal, mesa_id, servico_pct) values (r.id, 'mesa', m.id, r.taxa_servico) returning id into cid;
  else
    update contas set status = 'aberta' where id = cid;
  end if;
  return _lancar_itens_cliente(r.id, cid, p_itens, 'qrcode', false);
end $$;

create or replace function public.chamar_mesa(p_slug text, p_mesa int, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare r restaurantes; m mesas;
begin
  r := restaurante_por_slug(p_slug);
  select * into m from mesas where restaurante_id = r.id and numero = p_mesa;
  if m.id is null then raise exception 'mesa não encontrada'; end if;
  if p_motivo not in ('garcom', 'conta') then raise exception 'motivo inválido'; end if;
  if not exists (select 1 from chamados where mesa_id = m.id and motivo = p_motivo and atendido_em is null) then
    insert into chamados (restaurante_id, mesa_id, motivo) values (r.id, m.id, p_motivo);
  end if;
  if p_motivo = 'conta' then
    update contas set status = 'fechamento' where mesa_id = m.id and status = 'aberta';
  end if;
end $$;

/** Conta aberta da mesa para o cliente ver (itens, status de preparo, totais). */
create or replace function public.conta_mesa(p_slug text, p_mesa int)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(c) - 'restaurante_id' - 'telefone' - 'endereco' - 'cliente_id' || jsonb_build_object(
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nome', i.nome, 'preco', i.preco, 'qtd', i.qtd, 'obs', i.obs, 'preparo', i.preparo) order by i.enviado_em)
                       from itens i where i.conta_id = c.id and i.cancelado_em is null), '[]'),
    'pago', coalesce((select sum(valor) from pagamentos pg where pg.conta_id = c.id), 0))
  from contas c
  join mesas m on m.id = c.mesa_id
  join restaurantes r on r.id = m.restaurante_id
  where r.slug = p_slug and m.numero = p_mesa and c.status in ('aberta', 'fechamento');
$$;

/** Pedido do cardápio online. Devolve o token de acompanhamento. */
create or replace function public.pedido_delivery(p_slug text, p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare r restaurantes; cli uuid; cid uuid; tok uuid; tel text := regexp_replace(coalesce(p->>'telefone', ''), '\D', '', 'g');
  retirada boolean := coalesce((p->>'retirada')::boolean, false); taxa numeric := 0; soma numeric;
begin
  r := restaurante_por_slug(p_slug);
  if r.id is null or not r.delivery_aberto then raise exception 'delivery fechado'; end if;
  if length(tel) < 10 or length(trim(coalesce(p->>'nome', ''))) < 2 then raise exception 'nome e telefone obrigatórios'; end if;
  if not retirada then
    select b.taxa into taxa from bairros b where b.id = (p->'endereco'->>'bairro_id')::uuid and b.restaurante_id = r.id;
    if taxa is null then raise exception 'bairro não atendido'; end if;
  end if;

  select id into cli from clientes where restaurante_id = r.id and telefone = tel limit 1;
  if cli is null then
    insert into clientes (restaurante_id, nome, telefone, enderecos)
    values (r.id, left(trim(p->>'nome'), 80), tel, case when retirada then '[]'::jsonb else jsonb_build_array(p->'endereco') end)
    returning id into cli;
  end if;

  insert into contas (restaurante_id, canal, cliente_id, cliente_nome, telefone, endereco, para_viagem, status_entrega, taxa_entrega, pagamento_online, observacao)
  values (r.id, 'delivery', cli, left(trim(p->>'nome'), 80), tel, case when retirada then null else p->'endereco' end, retirada, 'novo', taxa,
          p->>'pagamento', left(p->>'observacao', 300))
  returning id, token into cid, tok;
  perform _lancar_itens_cliente(r.id, cid, p->'itens', 'online', true);

  select sum(preco * qtd) into soma from itens where conta_id = cid;
  if soma < r.pedido_minimo then raise exception 'abaixo do pedido mínimo'; end if;
  return tok;
end $$;

/** Acompanhamento do pedido online pelo token (sem login). */
create or replace function public.acompanhar_pedido(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(c) - 'restaurante_id' - 'cliente_id' || jsonb_build_object(
    'itens', coalesce((select jsonb_agg(jsonb_build_object('nome', i.nome, 'preco', i.preco, 'qtd', i.qtd, 'obs', i.obs)) from itens i where i.conta_id = c.id and i.cancelado_em is null), '[]'),
    'pago', coalesce((select sum(valor) from pagamentos pg where pg.conta_id = c.id), 0))
  from contas c where c.token = p_token;
$$;

grant execute on function public.cardapio_publico(text), public.pedido_mesa(text, int, jsonb), public.chamar_mesa(text, int, text),
  public.conta_mesa(text, int), public.pedido_delivery(text, jsonb), public.acompanhar_pedido(uuid) to anon, authenticated;
revoke all on function public.restaurante_por_slug(text) from public, anon;
grant execute on function public.restaurante_por_slug(text) to authenticated;
