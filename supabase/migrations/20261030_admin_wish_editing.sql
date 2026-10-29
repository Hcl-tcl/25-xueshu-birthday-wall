-- Allow class admins to edit existing birthday wishes in the management panel.
grant update (sender_name, message, birthday_year) on public.wishes to authenticated;

drop policy if exists "Class admins can edit wishes" on public.wishes;
create policy "Class admins can edit wishes"
  on public.wishes for update to authenticated
  using (public.is_class_admin ())
  with check (public.is_class_admin ());
