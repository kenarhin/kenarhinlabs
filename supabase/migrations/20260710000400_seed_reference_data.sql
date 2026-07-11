-- Deterministic production reference data. IDs are stable across environments.
begin;

insert into app.roles (id, key, name, description, is_system) values
  ('10000000-0000-4000-8000-000000000001', 'owner', 'Owner', 'Business owner with every permission.', true),
  ('10000000-0000-4000-8000-000000000002', 'admin', 'Administrator', 'Operational administrator without owner-only system control.', true),
  ('10000000-0000-4000-8000-000000000003', 'editor', 'Editor', 'Creates, edits, schedules, and publishes content.', true),
  ('10000000-0000-4000-8000-000000000004', 'viewer', 'Viewer', 'Read-only access to approved administrative information.', true)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system;

insert into app.permissions (id, key, name, "group", description) values
  ('20000000-0000-4000-8000-000000000001', 'users.read', 'Read users', 'users', 'View profiles, roles, and permission assignments.'),
  ('20000000-0000-4000-8000-000000000002', 'users.manage', 'Manage users', 'users', 'Assign roles and administer application users.'),
  ('20000000-0000-4000-8000-000000000003', 'content.read', 'Read content', 'content', 'View drafts, revisions, and published content.'),
  ('20000000-0000-4000-8000-000000000004', 'content.write', 'Write content', 'content', 'Create and edit content and taxonomy.'),
  ('20000000-0000-4000-8000-000000000005', 'content.publish', 'Publish content', 'content', 'Transition content to published state.'),
  ('20000000-0000-4000-8000-000000000006', 'content.schedule', 'Schedule content', 'content', 'Schedule future publication.'),
  ('20000000-0000-4000-8000-000000000007', 'content.delete', 'Delete content', 'content', 'Archive or remove canonical content.'),
  ('20000000-0000-4000-8000-000000000008', 'crm.read', 'Read CRM', 'crm', 'View leads, clients, projects, and tasks.'),
  ('20000000-0000-4000-8000-000000000009', 'crm.write', 'Write CRM', 'crm', 'Manage leads, clients, projects, and tasks.'),
  ('20000000-0000-4000-8000-000000000010', 'commerce.read', 'Read commerce', 'commerce', 'View vendors, tools, offers, and pricing history.'),
  ('20000000-0000-4000-8000-000000000011', 'commerce.write', 'Write commerce', 'commerce', 'Manage vendors, tools, offers, and affiliate links.'),
  ('20000000-0000-4000-8000-000000000012', 'media.read', 'Read media', 'media', 'View R2 metadata and asset usage.'),
  ('20000000-0000-4000-8000-000000000013', 'media.upload', 'Upload media', 'media', 'Register and update R2 objects and folders.'),
  ('20000000-0000-4000-8000-000000000014', 'media.delete', 'Delete media', 'media', 'Delete asset metadata and usage records.'),
  ('20000000-0000-4000-8000-000000000015', 'email.read', 'Read email', 'email', 'View email threads, messages, and templates.'),
  ('20000000-0000-4000-8000-000000000016', 'email.send', 'Send email', 'email', 'Create outbound messages and update delivery state.'),
  ('20000000-0000-4000-8000-000000000017', 'email.manage', 'Manage email', 'email', 'Create and manage email templates.'),
  ('20000000-0000-4000-8000-000000000018', 'sync.read', 'Read sync state', 'sync', 'Inspect outbox events and projection runs.'),
  ('20000000-0000-4000-8000-000000000019', 'audit.read', 'Read audit logs', 'audit', 'Review append-only security and business audits.'),
  ('20000000-0000-4000-8000-000000000020', 'analytics.read', 'Read analytics', 'analytics', 'View aggregated analytics.'),
  ('20000000-0000-4000-8000-000000000021', 'analytics.write', 'Write analytics', 'analytics', 'Maintain bounded analytics aggregates.'),
  ('20000000-0000-4000-8000-000000000022', 'system.manage', 'Manage system', 'system', 'Manage feature flags, integrations, and system settings.')
on conflict (key) do update set
  name = excluded.name,
  "group" = excluded."group",
  description = excluded.description;

-- Owner receives every current and future permission through app.has_permission; rows aid introspection.
insert into app.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000001'::uuid, permission.id
from app.permissions permission
on conflict do nothing;

-- Administrator receives all operational permissions except owner-only system management.
insert into app.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000002'::uuid, permission.id
from app.permissions permission
where permission.key <> 'system.manage'
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000003'::uuid, permission.id
from app.permissions permission
where permission.key in (
  'content.read','content.write','content.publish','content.schedule',
  'commerce.read','media.read','media.upload','analytics.read'
)
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000004'::uuid, permission.id
from app.permissions permission
where permission.key in ('content.read','crm.read','commerce.read','media.read','analytics.read')
on conflict do nothing;

insert into system.feature_flags (key, enabled, description, rules) values
  ('public_content_d1_reads', false, 'Serve public content from the D1 projection after initial synchronization.', '{}'::jsonb),
  ('client_portal', false, 'Enable the future client portal surface.', '{}'::jsonb),
  ('scheduled_publishing', false, 'Enable automated scheduled publication workflows.', '{}'::jsonb)
on conflict (key) do nothing;

commit;
