begin;

-- Replace overlapping profile policies with one update predicate that supports self-service and admins.
drop policy profiles_self_update on app.profiles;
drop policy profiles_manage on app.profiles;
create policy profiles_update on app.profiles for update to authenticated
  using (
    (id = (select auth.uid()) and status = 'active')
    or app.has_permission('users.manage')
  )
  with check (
    (id = (select auth.uid()) and status = 'active')
    or app.has_permission('users.manage')
  );

-- Split broad management policies so their write predicates are not evaluated during SELECTs.
do $$
declare
  policy_spec text;
  schema_name text;
  table_name text;
  policy_prefix text;
  permission_key text;
begin
  foreach policy_spec in array array[
    'app.roles:roles:system.manage',
    'app.permissions:permissions:system.manage',
    'app.user_roles:user_roles:users.manage',
    'app.role_permissions:role_permissions:system.manage',
    'app.settings:settings:system.manage',
    'content.categories:categories:content.write',
    'content.tags:tags:content.write',
    'content.content_categories:content_categories:content.write',
    'content.content_tags:content_tags:content.write',
    'content.redirects:redirects:content.write',
    'content.navigation_items:navigation:content.write',
    'comms.email_templates:email_templates:email.manage',
    'system.feature_flags:feature_flags:system.manage',
    'system.integrations:integrations:system.manage'
  ] loop
    schema_name := split_part(split_part(policy_spec, ':', 1), '.', 1);
    table_name := split_part(split_part(policy_spec, ':', 1), '.', 2);
    policy_prefix := split_part(policy_spec, ':', 2);
    permission_key := split_part(policy_spec, ':', 3);

    execute format('drop policy %I on %I.%I', policy_prefix || '_manage', schema_name, table_name);
    execute format(
      'create policy %I on %I.%I for insert to authenticated with check (app.has_permission(%L))',
      policy_prefix || '_insert', schema_name, table_name, permission_key
    );
    execute format(
      'create policy %I on %I.%I for update to authenticated using (app.has_permission(%L)) with check (app.has_permission(%L))',
      policy_prefix || '_update', schema_name, table_name, permission_key, permission_key
    );
    execute format(
      'create policy %I on %I.%I for delete to authenticated using (app.has_permission(%L))',
      policy_prefix || '_delete', schema_name, table_name, permission_key
    );
  end loop;
end;
$$;

-- Preserve public content visibility while evaluating one SELECT policy per authenticated request.
drop policy content_items_public_read on content.content_items;
drop policy content_items_admin_read on content.content_items;
create policy content_items_public_read on content.content_items for select to anon
  using (status = 'published' and published_at <= now() and deleted_at is null);
create policy content_items_authenticated_read on content.content_items for select to authenticated
  using (
    (status = 'published' and published_at <= now() and deleted_at is null)
    or app.has_permission('content.read')
  );

-- Public commerce remains anonymous-readable; authenticated reads combine public and RBAC paths.
drop policy vendors_public_read on commerce.vendors;
drop policy vendors_admin_read on commerce.vendors;
drop policy vendors_manage on commerce.vendors;
create policy vendors_public_read on commerce.vendors for select to anon using (status = 'active');
create policy vendors_authenticated_read on commerce.vendors for select to authenticated
  using (status = 'active' or app.has_permission('commerce.read') or app.has_permission('commerce.write'));
create policy vendors_insert on commerce.vendors for insert to authenticated
  with check (app.has_permission('commerce.write'));
create policy vendors_update on commerce.vendors for update to authenticated
  using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy vendors_delete on commerce.vendors for delete to authenticated
  using (app.has_permission('commerce.write'));

drop policy tools_public_read on commerce.tools;
drop policy tools_admin_read on commerce.tools;
drop policy tools_manage on commerce.tools;
create policy tools_public_read on commerce.tools for select to anon using (status = 'active');
create policy tools_authenticated_read on commerce.tools for select to authenticated
  using (status = 'active' or app.has_permission('commerce.read') or app.has_permission('commerce.write'));
create policy tools_insert on commerce.tools for insert to authenticated
  with check (app.has_permission('commerce.write'));
create policy tools_update on commerce.tools for update to authenticated
  using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy tools_delete on commerce.tools for delete to authenticated
  using (app.has_permission('commerce.write'));

drop policy offers_public_read on commerce.offers;
drop policy offers_admin_read on commerce.offers;
drop policy offers_manage on commerce.offers;
create policy offers_public_read on commerce.offers for select to anon
  using (status = 'active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy offers_authenticated_read on commerce.offers for select to authenticated
  using (
    (status = 'active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or app.has_permission('commerce.read')
    or app.has_permission('commerce.write')
  );
create policy offers_insert on commerce.offers for insert to authenticated
  with check (app.has_permission('commerce.write'));
create policy offers_update on commerce.offers for update to authenticated
  using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy offers_delete on commerce.offers for delete to authenticated
  using (app.has_permission('commerce.write'));

drop policy affiliate_links_public_read on commerce.affiliate_links;
drop policy affiliate_links_admin_read on commerce.affiliate_links;
drop policy affiliate_links_manage on commerce.affiliate_links;
create policy affiliate_links_public_read on commerce.affiliate_links for select to anon
  using (status = 'active');
create policy affiliate_links_authenticated_read on commerce.affiliate_links for select to authenticated
  using (status = 'active' or app.has_permission('commerce.read') or app.has_permission('commerce.write'));
create policy affiliate_links_insert on commerce.affiliate_links for insert to authenticated
  with check (app.has_permission('commerce.write'));
create policy affiliate_links_update on commerce.affiliate_links for update to authenticated
  using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy affiliate_links_delete on commerce.affiliate_links for delete to authenticated
  using (app.has_permission('commerce.write'));

drop policy pricing_public_read on commerce.pricing_snapshots;
drop policy pricing_admin_read on commerce.pricing_snapshots;
drop policy pricing_manage on commerce.pricing_snapshots;
create policy pricing_public_read on commerce.pricing_snapshots for select to anon
  using (exists (select 1 from commerce.tools tool where tool.id = tool_id and tool.status = 'active'));
create policy pricing_authenticated_read on commerce.pricing_snapshots for select to authenticated
  using (
    exists (select 1 from commerce.tools tool where tool.id = tool_id and tool.status = 'active')
    or app.has_permission('commerce.read')
    or app.has_permission('commerce.write')
  );
create policy pricing_insert on commerce.pricing_snapshots for insert to authenticated
  with check (app.has_permission('commerce.write'));
create policy pricing_update on commerce.pricing_snapshots for update to authenticated
  using (app.has_permission('commerce.write')) with check (app.has_permission('commerce.write'));
create policy pricing_delete on commerce.pricing_snapshots for delete to authenticated
  using (app.has_permission('commerce.write'));

-- Private CRM and email tables keep independent read and write permissions without FOR ALL overlap.
do $$
declare
  relation text;
  schema_name text;
  table_name text;
  permission_key text;
begin
  foreach relation in array array[
    'crm.clients:crm.write', 'crm.contacts:crm.write', 'crm.leads:crm.write',
    'crm.projects:crm.write', 'crm.project_milestones:crm.write', 'crm.project_tasks:crm.write',
    'comms.email_threads:email.send', 'comms.email_messages:email.send'
  ] loop
    schema_name := split_part(split_part(relation, ':', 1), '.', 1);
    table_name := split_part(split_part(relation, ':', 1), '.', 2);
    permission_key := split_part(relation, ':', 2);

    execute format('drop policy admin_write on %I.%I', schema_name, table_name);
    execute format(
      'create policy admin_insert on %I.%I for insert to authenticated with check (app.has_permission(%L))',
      schema_name, table_name, permission_key
    );
    execute format(
      'create policy admin_update on %I.%I for update to authenticated using (app.has_permission(%L)) with check (app.has_permission(%L))',
      schema_name, table_name, permission_key, permission_key
    );
    execute format(
      'create policy admin_delete on %I.%I for delete to authenticated using (app.has_permission(%L))',
      schema_name, table_name, permission_key
    );
  end loop;
end;
$$;

drop policy events_daily_write on analytics.events_daily;
create policy events_daily_insert on analytics.events_daily for insert to authenticated
  with check (app.has_permission('analytics.write'));
create policy events_daily_update on analytics.events_daily for update to authenticated
  using (app.has_permission('analytics.write')) with check (app.has_permission('analytics.write'));

commit;
