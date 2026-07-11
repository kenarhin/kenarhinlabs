begin;

-- Support foreign-key joins and deletes without forcing full-table scans as data volume grows.
create index profiles_avatar_asset_idx on app.profiles (avatar_asset_id)
  where avatar_asset_id is not null;
create index role_permissions_permission_idx on app.role_permissions (permission_id);
create index settings_updated_by_idx on app.settings (updated_by)
  where updated_by is not null;
create index user_roles_assigned_by_idx on app.user_roles (assigned_by)
  where assigned_by is not null;
create index user_roles_role_idx on app.user_roles (role_id);

create index affiliate_links_offer_idx on commerce.affiliate_links (offer_id)
  where offer_id is not null;
create index affiliate_links_tool_idx on commerce.affiliate_links (tool_id)
  where tool_id is not null;
create index offers_tool_idx on commerce.offers (tool_id)
  where tool_id is not null;
create index tools_vendor_idx on commerce.tools (vendor_id)
  where vendor_id is not null;
create index vendors_logo_asset_idx on commerce.vendors (logo_asset_id)
  where logo_asset_id is not null;

create index email_threads_client_idx on comms.email_threads (client_id)
  where client_id is not null;
create index email_threads_lead_idx on comms.email_threads (lead_id)
  where lead_id is not null;

create index content_categories_category_idx on content.content_categories (category_id);
create index content_items_author_idx on content.content_items (author_id);
create index content_items_cover_asset_idx on content.content_items (cover_asset_id)
  where cover_asset_id is not null;
create index content_items_created_by_idx on content.content_items (created_by);
create index content_items_og_asset_idx on content.content_items (og_asset_id)
  where og_asset_id is not null;
create index content_items_published_by_idx on content.content_items (published_by)
  where published_by is not null;
create index content_items_updated_by_idx on content.content_items (updated_by);
create index content_revisions_created_by_idx on content.content_revisions (created_by);
create index content_tags_tag_idx on content.content_tags (tag_id);
create index navigation_items_parent_idx on content.navigation_items (parent_id)
  where parent_id is not null;

create index clients_created_by_idx on crm.clients (created_by);
create index leads_assigned_to_idx on crm.leads (assigned_to)
  where assigned_to is not null;
create index project_tasks_milestone_idx on crm.project_tasks (milestone_id)
  where milestone_id is not null;
create index projects_created_by_idx on crm.projects (created_by);

create index asset_folders_parent_idx on media.asset_folders (parent_id)
  where parent_id is not null;
create index assets_uploaded_by_idx on media.assets (uploaded_by);

create index feature_flags_updated_by_idx on system.feature_flags (updated_by)
  where updated_by is not null;

commit;
