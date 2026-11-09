-- Ajustes de segurança apontados pelo linter do Supabase ao ligar o projeto.
-- Funções de gatilho e auxiliares internas não podem ser chamadas pela API
-- (/rest/v1/rpc): só rodam dentro do banco.

alter function public.custo_medio_entrada() set search_path = public;

revoke all on function public.devolver_item(uuid, text) from public, anon, authenticated;
revoke all on function public.baixa_ficha() from public, anon, authenticated;
revoke all on function public.estorno_conta_cancelada() from public, anon, authenticated;
revoke all on function public.auditar_lancamento() from public, anon, authenticated;
revoke all on function public.auditar_promocao() from public, anon, authenticated;
revoke all on function public.custo_medio_entrada() from public, anon, authenticated;

-- Funções da equipe: só para quem está logado (as políticas RLS usam e_membro/tem_funcao)
revoke all on function public.e_membro(uuid) from public, anon;
revoke all on function public.tem_funcao(uuid, public.funcao[]) from public, anon;
revoke all on function public.registrar_auditoria(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.criar_restaurante(text, text) from public, anon;
grant execute on function public.e_membro(uuid), public.tem_funcao(uuid, public.funcao[]),
  public.registrar_auditoria(uuid, text, text, text, jsonb), public.criar_restaurante(text, text) to authenticated;

-- restaurante_por_slug devolve a linha inteira (inclui configurações internas):
-- fica só para uso interno das funções públicas.
revoke all on function public.restaurante_por_slug(text) from public, anon, authenticated;
