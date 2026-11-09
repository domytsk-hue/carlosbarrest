-- Fase 4 · Integrações: iFood/aiqfome, maquininha, NFC-e e impressoras.
-- Segredos (tokens, client secrets, certificado) NUNCA ficam no banco: ficam
-- nas variáveis de ambiente do servidor ou no painel do emissor fiscal.

-- Configuração de cada integração por restaurante (sem segredos)
create table public.integracoes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  tipo text not null check (tipo in ('ifood', 'aiqfome', 'stone', 'fiscal', 'impressao')),
  ativo boolean not null default false,
  -- ifood/aiqfome: { "loja_id": "...", "aceite_automatico": false }
  -- stone: { "serial_pos": "..." }   fiscal: { "emissor": "focusnfe", "ambiente": "homologacao", "cnpj": "...", "ie": "...", "regime": "simples", "automatica": false }
  -- impressao: { "agente_url": "http://localhost:9123", "impressoras": [{ "nome": "cozinha", "setores": ["cozinha"], "colunas": 48 }] }
  config jsonb not null default '{}',
  atualizado_em timestamptz not null default now(),
  unique (restaurante_id, tipo)
);
create index integracoes_loja_idx on public.integracoes((config->>'loja_id')) where tipo in ('ifood', 'aiqfome');

alter table public.integracoes enable row level security;
create policy "membros leem" on public.integracoes for select using (public.e_membro(restaurante_id));
create policy "gestao altera" on public.integracoes for all
  using (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]))
  with check (public.tem_funcao(restaurante_id, array['dono','gerente']::public.funcao[]));

-- Fiscal por produto
alter table public.produtos add column ncm text, add column cfop text;

-- NFC-e emitida e pedidos pagos no app
alter table public.contas
  add column nfce jsonb,
  add column pago_no_app boolean not null default false;
-- Um pedido de marketplace entra uma vez só
create unique index contas_externo_uq on public.contas(restaurante_id, canal, externo_id) where externo_id is not null;

-- Dados do cartão para conciliação (sem dados sensíveis do cartão)
alter table public.pagamentos add column bandeira text, add column parcelas int;

-- Forma "pago no app" para os pedidos de marketplace
alter type public.tipo_pagamento add value if not exists 'marketplace';

-- ---------------------------------------------------------------------------
-- Pedido de marketplace (chamado pelo webhook com a chave de serviço)
-- ---------------------------------------------------------------------------
create or replace function public.receber_pedido_marketplace(p_canal text, p_loja text, p_pedido jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; integ integracoes; cid uuid; n bigint := nextval('pedido_numero_seq'); it jsonb; prod produtos;
  forma uuid; tot numeric;
begin
  if p_canal not in ('ifood', 'aiqfome') then raise exception 'canal inválido'; end if;
  select * into integ from integracoes where tipo = p_canal and ativo and config->>'loja_id' = p_loja;
  if integ.id is null then raise exception 'loja % não ligada', p_loja; end if;
  rid := integ.restaurante_id;

  -- Já recebido? (o parceiro pode reenviar o mesmo pedido)
  select id into cid from contas where restaurante_id = rid and canal = p_canal::canal and externo_id = p_pedido->>'externoId';
  if cid is not null then return cid; end if;

  insert into contas (restaurante_id, canal, externo_id, cliente_nome, telefone, endereco, para_viagem, status_entrega,
                      taxa_entrega, desconto, pago_no_app, observacao)
  values (rid, p_canal::canal, p_pedido->>'externoId', left(p_pedido->'cliente'->>'nome', 80), p_pedido->'cliente'->>'telefone',
          p_pedido->'entrega', coalesce((p_pedido->>'retirada')::boolean, false),
          (case when coalesce((integ.config->>'aceite_automatico')::boolean, false) then 'confirmado' else 'novo' end)::status_entrega,
          coalesce((p_pedido->>'taxaEntrega')::numeric, 0), coalesce((p_pedido->>'desconto')::numeric, 0),
          coalesce((p_pedido->>'pagoOnline')::boolean, false),
          left(concat_ws(' · ', '#' || (p_pedido->>'codigo'), p_pedido->>'observacao'), 300))
  returning id into cid;

  for it in select * from jsonb_array_elements(p_pedido->'itens') loop
    prod := null;
    select * into prod from produtos where restaurante_id = rid and ((it->>'codigoExterno') is not null and codigo = it->>'codigoExterno');
    if prod.id is null then select * into prod from produtos where restaurante_id = rid and lower(nome) = lower(it->>'nome') limit 1; end if;
    insert into itens (restaurante_id, conta_id, produto_id, nome, preco, qtd, obs, setor, pedido_numero, origem)
    values (rid, cid, prod.id, coalesce(prod.nome, it->>'nome'), round((it->>'precoUnit')::numeric, 2), (it->>'qtd')::numeric,
            left(it->>'obs', 200), coalesce(prod.setor, 'cozinha'), n, 'online');
  end loop;

  if coalesce((p_pedido->>'pagoOnline')::boolean, false) then
    select id into forma from formas_pagamento where restaurante_id = rid and tipo = 'marketplace' limit 1;
    if forma is null then
      insert into formas_pagamento (restaurante_id, nome, tipo, ativo) values (rid, 'Pago no app', 'marketplace', false) returning id into forma;
    end if;
    select sum(preco * qtd) into tot from itens where conta_id = cid;
    tot := tot + coalesce((p_pedido->>'taxaEntrega')::numeric, 0) - coalesce((p_pedido->>'desconto')::numeric, 0);
    if tot > 0 then
      insert into pagamentos (restaurante_id, conta_id, forma_id, valor, referencia) values (rid, cid, forma, tot, p_canal || ':' || (p_pedido->>'externoId'));
    end if;
  end if;
  return cid;
end $$;
revoke all on function public.receber_pedido_marketplace(text, text, jsonb) from public, anon, authenticated;
