-- Fotos de produto enviadas pelo painel (Supabase Storage).
-- Arquivos ficam em produtos/<restaurante_id>/<arquivo>.webp.
-- Leitura pública (o cardápio online mostra as fotos sem login);
-- envio, troca e exclusão só para a equipe do próprio restaurante.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Pasta do arquivo precisa ser o id de um restaurante do qual o usuário é membro.
create or replace function public.e_membro_pasta(nome text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when (storage.foldername(nome))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.e_membro(((storage.foldername(nome))[1])::uuid)
    else false
  end;
$$;
revoke all on function public.e_membro_pasta(text) from public, anon;
grant execute on function public.e_membro_pasta(text) to authenticated;

drop policy if exists "fotos_produtos_enviar" on storage.objects;
create policy "fotos_produtos_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produtos' and public.e_membro_pasta(name));

drop policy if exists "fotos_produtos_trocar" on storage.objects;
create policy "fotos_produtos_trocar" on storage.objects
  for update to authenticated
  using (bucket_id = 'produtos' and public.e_membro_pasta(name))
  with check (bucket_id = 'produtos' and public.e_membro_pasta(name));

drop policy if exists "fotos_produtos_excluir" on storage.objects;
create policy "fotos_produtos_excluir" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produtos' and public.e_membro_pasta(name));
