begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(14);

select lives_ok($test$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000','30000000-0000-4000-8000-000000000001','authenticated','authenticated','editor@example.test','',now(),'{}','{"display_name":"Editor"}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','30000000-0000-4000-8000-000000000002','authenticated','authenticated','viewer@example.test','',now(),'{}','{"display_name":"Viewer"}',now(),now())
$test$, 'auth users can be created for policy tests');

select results_eq(
  $$select count(*)::bigint from app.profiles where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')$$,
  array[2::bigint],
  'auth trigger created both profiles'
);

select lives_ok($test$
  insert into app.user_roles(user_id, role_id) values
    ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003'),
    ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004')
$test$, 'test roles assigned');

set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok($test$
  insert into content.content_items (
    id,type,status,title,slug,body_format,body_markdown,author_id,published_at,
    created_by,updated_by,published_by
  ) values (
    '40000000-0000-4000-8000-000000000001','post','published','Published','published','markdown','Public body',
    '30000000-0000-4000-8000-000000000001',now(),
    '30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'
  )
$test$, 'editor can publish content');

select lives_ok($test$
  insert into content.content_items (
    id,type,status,title,slug,body_format,body_markdown,author_id,created_by,updated_by
  ) values (
    '40000000-0000-4000-8000-000000000002','post','draft','Draft','draft','markdown','Private body',
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'
  )
$test$, 'editor can create a draft');

reset role;
select results_eq(
  $$select count(*)::bigint from content.content_revisions where content_id in ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002')$$,
  array[2::bigint],
  'content revisions are automatic'
);
select results_eq(
  $$select count(*)::bigint from sync.outbox_events where aggregate_id in ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002')$$,
  array[2::bigint],
  'projection events are transactional'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}';
select results_eq($$select count(*)::bigint from content.content_items where status = 'published'$$, array[1::bigint], 'viewer sees published content');
select results_eq($$select count(*)::bigint from content.content_items where status = 'draft'$$, array[1::bigint], 'viewer role can read drafts through content.read');
select throws_ok($test$
  insert into content.content_items (
    type,status,title,slug,author_id,created_by,updated_by
  ) values (
    'post','draft','Forbidden','forbidden','30000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002'
  )
$test$, '42501', null, 'viewer cannot write content');

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select results_eq($$select count(*)::bigint from content.content_items$$, array[1::bigint], 'anonymous sees only published content');
select lives_ok($test$
  insert into crm.leads(name,email,source,message) values ('Prospect','prospect@example.test','contact_form','Hello')
$test$, 'anonymous lead intake succeeds with safe defaults');
select throws_ok($$select * from crm.leads$$, '42501', null, 'anonymous cannot read private leads');

reset role;
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname in ('app','media','content','crm','commerce','comms','sync','audit','analytics','system')$$,
  array[85::bigint],
  'expected policy set is installed'
);

select * from finish();
rollback;
