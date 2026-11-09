-- Fase 5 · Crescimento: promoções (cupom, happy hour, combo), chatbot do
-- WhatsApp e treinamentos da equipe.

-- ---------------------------------------------------------------------------
-- Promoções
-- ---------------------------------------------------------------------------
create table public.promocoes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('cupom', 'happyhour', 'combo')),
  ativo boolean not null default true,
  codigo text check (codigo is null or codigo = upper(codigo)),
  percentual numeric(5,2) check (percentual is null or percentual between 0 and 100),
  valor_fixo numeric(10,2) check (valor_fixo is null or valor_fixo >= 0),
  categoria_ids uuid[],
  produto_ids uuid[],
  dias_semana int[],          -- 0 = domingo … 6 = sábado
  hora_inicio time,
  hora_fim time,
  canais public.canal[],
  pedido_minimo numeric(10,2),
  valido_ate date,
  limite_usos int,
  usos int not null default 0,
  -- combo: { "itens": [{ "produto_id": "...", "qtd": 1 }], "preco": 59.9 }
  combo jsonb,
  produto_id uuid references public.produtos(id) on delete set null, -- produto que representa o combo no cardápio
  criado_em timestamptz not null default now(),
  check (tipo <> 'cupom' or codigo is not null)
);
create unique index promocoes_codigo_uq on public.promocoes(restaurante_id, codigo) where codigo is not null;

/** A promoção vale agora, neste canal? (no fuso do restaurante) */
create or replace function public.promocao_vigente(p public.promocoes, p_canal public.canal, p_quando timestamptz default now())
returns boolean language plpgsql stable set search_path = public as $$
declare fuso text; t timestamp; m time;
begin
  if not p.ativo then return false; end if;
  select fuso_horario into fuso from restaurantes where id = p.restaurante_id;
  t := p_quando at time zone coalesce(fuso, 'America/Bahia');
  if p.valido_ate is not null and t::date > p.valido_ate then return false; end if;
  if coalesce(cardinality(p.canais), 0) > 0 and not p_canal = any(p.canais) then return false; end if;
  if coalesce(cardinality(p.dias_semana), 0) > 0 and not extract(dow from t)::int = any(p.dias_semana) then return false; end if;
  if p.hora_inicio is not null and p.hora_fim is not null then
    m := t::time;
    -- Faixa que atravessa a meia-noite (ex.: 22:00–02:00)
    if p.hora_inicio <= p.hora_fim then
      if m < p.hora_inicio or m >= p.hora_fim then return false; end if;
    elsif m < p.hora_inicio and m >= p.hora_fim then return false;
    end if;
  end if;
  if p.limite_usos is not null and p.usos >= p.limite_usos then return false; end if;
  return true;
end $$;

/** Preço do produto no canal, já com o happy hour de maior desconto. */
create or replace function public.preco_vigente(p_produto public.produtos, p_canal public.canal)
returns numeric language sql stable set search_path = public as $$
  select round(
    (case when p_canal = 'delivery' then coalesce(p_produto.preco_delivery, p_produto.preco) else p_produto.preco end)
    * (1 - coalesce((
      select max(h.percentual) from promocoes h
      where h.restaurante_id = p_produto.restaurante_id and h.tipo = 'happyhour' and promocao_vigente(h, p_canal)
        and ((coalesce(cardinality(h.categoria_ids), 0) = 0 and coalesce(cardinality(h.produto_ids), 0) = 0)
             or p_produto.categoria_id = any(h.categoria_ids) or p_produto.id = any(h.produto_ids))
    ), 0) / 100), 2);
$$;

/** Valida o cupom, soma um uso e devolve o desconto. Erro se não vale. */
create or replace function public.usar_cupom(rid uuid, p_codigo text, p_subtotal numeric, p_canal public.canal)
returns numeric language plpgsql security definer set search_path = public as $$
declare p promocoes;
begin
  select * into p from promocoes where restaurante_id = rid and tipo = 'cupom' and codigo = upper(trim(p_codigo)) for update;
  if p.id is null then raise exception 'cupom não encontrado'; end if;
  if not promocao_vigente(p, p_canal) then raise exception 'cupom fora da validade ou esgotado'; end if;
  if p.pedido_minimo is not null and p_subtotal < p.pedido_minimo then raise exception 'cupom vale a partir de %', p.pedido_minimo; end if;
  update promocoes set usos = usos + 1 where id = p.id;
  return round(least(p_subtotal, p_subtotal * coalesce(p.percentual, 0) / 100 + coalesce(p.valor_fixo, 0)), 2);
end $$;
revoke all on function public.usar_cupom(uuid, text, numeric, public.canal) from public, anon, authenticated;

-- Itens do cliente (QR Code e delivery) passam a sair com o preço do happy hour
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
    values (rid, cid, p.id, p.nome, preco_vigente(p, (case when p_delivery then 'delivery' else 'qrcode' end)::canal), q,
            left(nullif(trim(it->>'obs'), ''), 140), p.setor, n, p_origem);
  end loop;
  return n;
end $$;
revoke all on function public._lancar_itens_cliente(uuid, uuid, jsonb, text, boolean) from public, anon, authenticated;

-- Pedido do delivery próprio com cupom (validado e contado no servidor)
create or replace function public.pedido_delivery(p_slug text, p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare r restaurantes; cli uuid; cid uuid; tok uuid; tel text := regexp_replace(coalesce(p->>'telefone', ''), '\D', '', 'g');
  retirada boolean := coalesce((p->>'retirada')::boolean, false); taxa numeric := 0; soma numeric; v_cupom text := nullif(upper(trim(p->>'cupom')), '');
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
  if v_cupom is not null then
    update contas set cupom = v_cupom, desconto = usar_cupom(r.id, v_cupom, soma, 'delivery') where id = cid;
  end if;
  return tok;
end $$;
grant execute on function public.pedido_delivery(text, jsonb) to anon, authenticated;

/** Confere um cupom no cardápio público, sem usar. */
create or replace function public.conferir_cupom(p_slug text, p_codigo text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r restaurantes; p promocoes;
begin
  r := restaurante_por_slug(p_slug);
  select * into p from promocoes where restaurante_id = r.id and tipo = 'cupom' and codigo = upper(trim(p_codigo));
  if p.id is null then return jsonb_build_object('ok', false, 'erro', 'Cupom não encontrado'); end if;
  if not promocao_vigente(p, 'delivery') then return jsonb_build_object('ok', false, 'erro', 'Cupom fora da validade ou esgotado'); end if;
  if p.pedido_minimo is not null and p_subtotal < p.pedido_minimo then return jsonb_build_object('ok', false, 'erro', 'Vale para pedidos a partir de R$ ' || p.pedido_minimo); end if;
  return jsonb_build_object('ok', true, 'desconto', round(least(p_subtotal, p_subtotal * coalesce(p.percentual, 0) / 100 + coalesce(p.valor_fixo, 0)), 2));
end $$;
grant execute on function public.conferir_cupom(text, text, numeric) to anon, authenticated;

-- Auditoria das promoções (criar, alterar, excluir)
create or replace function public.auditar_promocao() returns trigger language plpgsql security definer set search_path = public as $$
declare reg promocoes := coalesce(new, old);
begin
  -- O contador de usos muda a cada pedido: não audita
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'usos') = (to_jsonb(old) - 'usos') then return new; end if;
  insert into auditoria (restaurante_id, user_id, acao, entidade, entidade_id, detalhes)
  values (reg.restaurante_id, auth.uid(), 'promocao.' || lower(tg_op), 'promocao', reg.id::text, jsonb_build_object('nome', reg.nome, 'tipo', reg.tipo, 'ativo', reg.ativo));
  return reg;
end $$;
create trigger auditar_promocao after insert or update or delete on public.promocoes for each row execute function public.auditar_promocao();

-- ---------------------------------------------------------------------------
-- Treinamentos
-- ---------------------------------------------------------------------------
create table public.treinamentos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  titulo text not null,
  descricao text,
  quando timestamptz not null,
  duracao_min int not null default 60 check (duracao_min > 0),
  link text check (link is null or link ~ '^https://'),
  local text,
  funcoes public.funcao[] not null default '{}',
  criado_em timestamptz not null default now()
);

create table public.treinamento_participantes (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  treinamento_id uuid not null references public.treinamentos(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  confirmado_em timestamptz,
  presente boolean not null default false,
  primary key (treinamento_id, funcionario_id)
);

create table public.materiais_concluidos (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  material_id text not null,
  concluido_em timestamptz not null default now(),
  primary key (funcionario_id, material_id)
);

-- ---------------------------------------------------------------------------
-- Chatbot do WhatsApp
-- ---------------------------------------------------------------------------
alter table public.restaurantes add column chatbot jsonb not null default '{"ativo": false, "respostas": []}';

-- Número do WhatsApp ligado ao restaurante: integracoes(tipo 'whatsapp', config { "phone_id": "..." })
alter table public.integracoes drop constraint integracoes_tipo_check;
alter table public.integracoes add constraint integracoes_tipo_check check (tipo in ('ifood', 'aiqfome', 'stone', 'fiscal', 'impressao', 'whatsapp'));
create index integracoes_whatsapp_idx on public.integracoes((config->>'phone_id')) where tipo = 'whatsapp';

create table public.chatbot_mensagens (
  id bigint generated always as identity primary key,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  telefone text not null,
  entrada text,
  intencao text,
  resposta text,
  transferir boolean not null default false,
  em timestamptz not null default now()
);
create index chatbot_mensagens_idx on public.chatbot_mensagens(restaurante_id, em desc);

/** Contexto para o robô responder (chamado pelo webhook com a chave de serviço). */
create or replace function public.contexto_chatbot(p_phone_id text, p_telefone text, p_mensagem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare rid uuid; r restaurantes; tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select restaurante_id into rid from integracoes where tipo = 'whatsapp' and ativo and config->>'phone_id' = p_phone_id;
  if rid is null then return null; end if;
  select * into r from restaurantes where id = rid;
  insert into chatbot_mensagens (restaurante_id, telefone, entrada) values (rid, tel, left(p_mensagem, 1000));
  return jsonb_build_object(
    'nome', r.nome,
    'endereco', coalesce(r.endereco->>'texto', concat_ws(', ', r.endereco->>'rua', r.endereco->>'numero', r.endereco->>'bairro', r.endereco->>'cidade')),
    'bot', jsonb_build_object('saudacao', '', 'horario', '', 'foraDoHorario', '', 'respostas', '[]'::jsonb) || r.chatbot,
    'aberto', r.delivery_aberto,
    'tempoEntrega', r.tempo_entrega,
    'pedidoMinimo', r.pedido_minimo,
    'promocoes', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'tipo', p.tipo, 'ativo', p.ativo, 'codigo', p.codigo,
        'percentual', p.percentual, 'valorFixo', p.valor_fixo, 'diasSemana', p.dias_semana, 'horaInicio', to_char(p.hora_inicio, 'HH24:MI'),
        'horaFim', to_char(p.hora_fim, 'HH24:MI'), 'canais', p.canais, 'pedidoMinimo', p.pedido_minimo, 'validoAte', p.valido_ate,
        'limiteUsos', p.limite_usos, 'usos', p.usos, 'combo', p.combo))
      from promocoes p where p.restaurante_id = rid and p.ativo), '[]'),
    -- Pedidos das últimas 24 h do mesmo telefone (compara os 8 últimos dígitos)
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('numero', c.numero, 'statusEntrega', c.status_entrega, 'retirada', c.para_viagem, 'abertaEm', c.aberta_em,
        'total', coalesce((select sum(i.preco * i.qtd) from itens i where i.conta_id = c.id and i.cancelado_em is null), 0) + c.taxa_entrega - c.desconto))
      from contas c where c.restaurante_id = rid and length(tel) >= 8 and right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 8) = right(tel, 8)
        and c.aberta_em > now() - interval '24 hours' and c.status <> 'cancelada'), '[]')
  );
end $$;

create or replace function public.registrar_resposta_chatbot(p_phone_id text, p_telefone text, p_intencao text, p_resposta text, p_transferir boolean)
returns void language plpgsql security definer set search_path = public as $$
declare rid uuid; tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'); ult bigint;
begin
  select restaurante_id into rid from integracoes where tipo = 'whatsapp' and ativo and config->>'phone_id' = p_phone_id;
  if rid is null then return; end if;
  select id into ult from chatbot_mensagens where restaurante_id = rid and telefone = tel and resposta is null order by id desc limit 1;
  update chatbot_mensagens set intencao = left(p_intencao, 40), resposta = left(p_resposta, 2000), transferir = p_transferir where id = ult;
end $$;
revoke all on function public.contexto_chatbot(text, text, text), public.registrar_resposta_chatbot(text, text, text, text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.promocoes enable row level security;
create policy "membros leem" on public.promocoes for select using (public.e_membro(restaurante_id));
create policy "gestao altera" on public.promocoes for all
  using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]))
  with check (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

alter table public.treinamentos enable row level security;
create policy "membros leem" on public.treinamentos for select using (public.e_membro(restaurante_id));
create policy "gestao altera" on public.treinamentos for all
  using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]))
  with check (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

-- Participação e trilha: cada membro marca a sua; a gestão faz a chamada
do $$
declare t text;
begin
  foreach t in array array['treinamento_participantes','materiais_concluidos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros leem" on public.%I for select using (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros inserem" on public.%I for insert with check (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros alteram" on public.%I for update using (public.e_membro(restaurante_id))', t);
    execute format('create policy "membros excluem" on public.%I for delete using (public.e_membro(restaurante_id))', t);
  end loop;
end $$;

alter table public.chatbot_mensagens enable row level security;
create policy "membros leem" on public.chatbot_mensagens for select using (public.e_membro(restaurante_id));
