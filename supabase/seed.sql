-- Local-development taxonomy only. Production reference/RBAC data lives in migrations.
insert into content.categories (name, slug, description) values
  ('Field Notes', 'field-notes', 'Practical observations from projects and experiments.'),
  ('Case Studies', 'case-studies', 'Documented digital systems and their outcomes.'),
  ('Stack Guides', 'stack-guides', 'Opinionated guidance for selecting digital tools.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

insert into content.tags (name, slug) values
  ('AI Systems', 'ai-systems'),
  ('Automation', 'automation'),
  ('Cloudflare', 'cloudflare'),
  ('Supabase', 'supabase')
on conflict (slug) do update set name = excluded.name;
