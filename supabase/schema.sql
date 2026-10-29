create table if not exists public.admin_emails (
  email text primary key check (email = lower(email))
);

create table if not exists public.classmates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 18),
  month_day text not null check (
    month_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    and substring(month_day, 4, 2)::integer <= case
      when substring(month_day, 1, 2)::integer = 2 then 29
      when substring(month_day, 1, 2)::integer in (4, 6, 9, 11) then 30
      else 31
    end
  ),
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.classmates add column if not exists photo_path text;

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.classmates(id) on delete cascade,
  sender_name text not null check (char_length(btrim(sender_name)) between 1 and 18),
  message text not null check (char_length(btrim(message)) between 1 and 140),
  anonymous boolean not null default false,
  birthday_year integer,
  created_at timestamptz not null default now()
);

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

create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  hero_title text not null check (char_length(btrim(hero_title)) between 1 and 80),
  hero_description text not null check (char_length(btrim(hero_description)) between 1 and 160),
  hero_image_path text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, hero_title, hero_description)
values (1, E'每个生日，\n都有全班的祝福。', '记住同学的生日，在那一天把心意送到 TA 手上。')
on conflict (id) do nothing;

create index if not exists classmates_month_day_idx on public.classmates (month_day);
create index if not exists wishes_created_at_idx on public.wishes (created_at desc);
create index if not exists wishes_recipient_id_idx on public.wishes (recipient_id, created_at desc);
create index if not exists wishes_birthday_year_idx on public.wishes (birthday_year, recipient_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'class-birthday-wall-hero',
  'class-birthday-wall-hero',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

create or replace function public.is_class_admin ()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on public.admin_emails from anon, authenticated;
grant execute on function public.is_class_admin () to anon, authenticated;

alter table public.admin_emails enable row level security;
alter table public.classmates enable row level security;
alter table public.wishes enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read classmates" on public.classmates;
create policy "Anyone can read classmates"
  on public.classmates for select to anon, authenticated using (true);

drop policy if exists "Class admins can manage classmates" on public.classmates;
create policy "Class admins can manage classmates"
  on public.classmates for all to authenticated
  using (public.is_class_admin ())
  with check (public.is_class_admin ());

drop policy if exists "Anyone can read wishes" on public.wishes;
create policy "Anyone can read wishes"
  on public.wishes for select to anon, authenticated using (true);

drop policy if exists "Anyone can send a birthday wish" on public.wishes;
create policy "Anyone can send a birthday wish"
  on public.wishes for insert to anon, authenticated with check (true);

drop policy if exists "Class admins can moderate wishes" on public.wishes;
create policy "Class admins can moderate wishes"
  on public.wishes for delete to authenticated using (public.is_class_admin ());

grant select on public.classmates, public.wishes to anon, authenticated;
grant insert on public.wishes to anon, authenticated;
grant insert, update, delete on public.classmates to authenticated;
grant delete on public.wishes to authenticated;
grant update (sender_name, message, birthday_year) on public.wishes to authenticated;

drop policy if exists "Class admins can edit wishes" on public.wishes;
create policy "Class admins can edit wishes"
  on public.wishes for update to authenticated
  using (public.is_class_admin ())
  with check (public.is_class_admin ());

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Class admins can update site settings" on public.site_settings;
create policy "Class admins can update site settings"
  on public.site_settings for update to authenticated
  using (public.is_class_admin ())
  with check (public.is_class_admin ());

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

drop policy if exists "Anyone can read birthday wall hero images" on storage.objects;
create policy "Anyone can read birthday wall hero images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'class-birthday-wall-hero');

drop policy if exists "Class admins can upload birthday wall hero images" on storage.objects;
create policy "Class admins can upload birthday wall hero images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'class-birthday-wall-hero'
    and public.is_class_admin ()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classmates'
  ) then
    alter publication supabase_realtime add table public.classmates;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wishes'
  ) then
    alter publication supabase_realtime add table public.wishes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_settings'
  ) then
    alter publication supabase_realtime add table public.site_settings;
  end if;
end;
$$;
