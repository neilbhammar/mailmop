create extension if not exists "wrappers" with schema "extensions";


drop policy "Allow public to read all daily stats" on "public"."daily_stats";

drop policy "Prevent all modifications on daily_stats" on "public"."daily_stats";

create policy "Allow public to read all daily stats"
on "public"."daily_stats"
as permissive
for select
to anon, authenticated
using (true);


create policy "Prevent all modifications on daily_stats"
on "public"."daily_stats"
as permissive
for all
to anon, authenticated
using (false);



