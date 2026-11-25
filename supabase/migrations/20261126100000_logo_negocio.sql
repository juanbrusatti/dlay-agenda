-- ============================================================================
-- Dlay Agenda · Each business's logo or photo
--
-- A business can upload its logo (or a photo) and it shows, small, at the top
-- of the two pages its clients see: the online booking page and the page
-- behind the reminder's link, where they confirm or cancel.
--
-- The image is shrunk in the browser before uploading (a few KB), and lives in
-- a public storage bucket under the business's own folder: anyone can see it
-- (it is shown on public pages), only that business's owner or admin can put
-- or remove files there.
--
-- Additive only: one nullable column (null = no logo, the usual look), one
-- bucket with its policies, and one read-only function for the public pages,
-- so the booking functions are not touched.
-- ============================================================================

alter table public.tenants
  add column logo_path text
    constraint tenants_logo_path_propio
      check (logo_path is null or logo_path like id::text || '/%');

comment on column public.tenants.logo_path is
  'Path of the business logo in the «logos» bucket. Null when there is none.';

-- ---------------------------------------------------------------------------
-- The bucket: public to read, small images only
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 307200, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Writing: only into your own business's folder, and only owner or admin.
create policy "logos: subir el propio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (select app.has_role(((storage.foldername(name))[1])::uuid, 'owner', 'admin'))
  );

create policy "logos: cambiar el propio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (select app.has_role(((storage.foldername(name))[1])::uuid, 'owner', 'admin'))
  );

create policy "logos: borrar el propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (select app.has_role(((storage.foldername(name))[1])::uuid, 'owner', 'admin'))
  );

-- Listing the folder (the app needs it to clean up the previous logo).
create policy "logos: ver el propio"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'logos'
    and (select app.has_tenant(((storage.foldername(name))[1])::uuid))
  );

-- ---------------------------------------------------------------------------
-- The logo for a public page, by the business's address
-- ---------------------------------------------------------------------------
create or replace function public.logo_negocio(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.logo_path
  from public.tenants t
  where t.slug = p_slug and t.status = 'active';
$$;

revoke all on function public.logo_negocio(text) from public;
grant execute on function public.logo_negocio(text) to anon, authenticated;
