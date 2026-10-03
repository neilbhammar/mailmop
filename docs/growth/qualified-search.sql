-- Read-only report. No schema changes or new permissions are required.
-- Only actions started after this release carry filters.acquisition.
-- Count people with completed work, not pageviews or attempted deletions.
select
  filters->'acquisition'->>'landing' as landing_page,
  count(distinct user_id) filter (
    where type = 'analysis' and status = 'completed'
      and end_type in ('success', 'partial_success') and count > 0
  ) as users_with_analysis,
  count(distinct user_id) filter (
    where type in ('delete', 'delete_with_exceptions', 'unsubscribe', 'create_filter', 'mark_as_read', 'modify_label')
      and status = 'completed' and end_type in ('success', 'partial_success') and count > 0
  ) as users_with_inbox_action,
  count(distinct user_id) filter (
    where type in ('delete', 'delete_with_exceptions', 'unsubscribe')
      and status = 'completed' and end_type in ('success', 'partial_success') and count > 0
  ) as users_with_cleanup
from public.actions
where created_at >= now() - interval '28 days'
  and filters->'acquisition'->>'channel' = 'google'
group by 1
order by users_with_cleanup desc, users_with_analysis desc;
