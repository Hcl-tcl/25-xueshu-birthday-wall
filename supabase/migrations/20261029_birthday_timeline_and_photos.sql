-- Upgrade an existing birthday wall with year-specific wish archives and public classmate portraits.
-- Old wishes keep a null birthday_year because their intended birthday year cannot be inferred safely.
alter table public.classmates add column if not exists photo_path text;
alter table public.wishes add column if not exists birthday_year integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wishes_birthday_year_check'
      and conrelid = 'public.wishes'::regclass
  ) then
    alter table public.wishes
      add constraint wishes_birthday_year_check check (birthday_year is null or birthday_year between 1900 and 2200);
  end if;
end;
$$;

create index if not exists wishes_birthday_year_idx on public.wishes (birthday_year, recipient_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'classmate-photos',
  'classmate-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read classmate photos" on storage.objects;
create policy "Anyone can read classmate photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'classmate-photos');

drop policy if exists "Class admins can upload classmate photos" on storage.objects;
create policy "Class admins can upload classmate photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'classmate-photos'
    and public.is_class_admin ()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Class admins can update classmate photos" on storage.objects;
create policy "Class admins can update classmate photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'classmate-photos'
    and public.is_class_admin ()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'classmate-photos'
    and public.is_class_admin ()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Class admins can delete classmate photos" on storage.objects;
create policy "Class admins can delete classmate photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'classmate-photos'
    and public.is_class_admin ()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
