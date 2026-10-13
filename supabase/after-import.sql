select setval(
  pg_get_serial_sequence('public.farmers', 'id'),
  coalesce((select max(id) from public.farmers), 1),
  exists (select 1 from public.farmers)
);
