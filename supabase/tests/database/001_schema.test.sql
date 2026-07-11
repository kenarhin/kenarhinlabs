begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(56);

select has_schema(schema_name, format('%s schema exists', schema_name))
from unnest(array['app','media','content','crm','commerce','comms','sync','audit','analytics','system']) schema_name;

select has_table('app', table_name) from unnest(array[
  'profiles','roles','permissions','user_roles','role_permissions','settings'
]) table_name;
select has_table('media', table_name) from unnest(array['asset_folders','assets','asset_usages']) table_name;
select has_table('content', table_name) from unnest(array[
  'content_items','content_revisions','categories','tags','content_categories','content_tags','redirects','navigation_items'
]) table_name;
select has_table('crm', table_name) from unnest(array[
  'clients','contacts','leads','projects','project_milestones','project_tasks'
]) table_name;
select has_table('commerce', table_name) from unnest(array[
  'vendors','tools','offers','affiliate_links','pricing_snapshots'
]) table_name;
select has_table('comms', table_name) from unnest(array['email_templates','email_threads','email_messages']) table_name;
select has_table('sync', table_name) from unnest(array['outbox_events','projection_runs']) table_name;
select has_table('audit', 'audit_logs');
select has_table('analytics', 'events_daily');
select has_table('system', table_name) from unnest(array['feature_flags','integrations']) table_name;

select has_column('sync', 'outbox_events', 'locked_at', 'outbox has stale-claim recovery state');
select has_column('sync', 'outbox_events', 'dedupe_key', 'outbox supports producer idempotency');
select has_index('content', 'content_items', 'content_items_search_idx', 'content has full-text search index');
select has_index('sync', 'outbox_events', 'outbox_events_poll_idx', 'outbox polling path is indexed');
select has_function('app', 'has_permission', array['text','uuid'], 'RBAC helper exists');
select has_function('sync', 'claim_outbox_events', array['integer'], 'atomic outbox claim function exists');
select has_trigger('auth', 'users', 'on_auth_user_created', 'auth profile lifecycle trigger exists');
select has_trigger('content', 'content_items', 'capture_content_revision', 'revision trigger exists');
select has_trigger('content', 'content_items', 'enqueue_projection_event', 'outbox trigger exists');

select * from finish();
rollback;
