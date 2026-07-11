-- Public, rebuildable D1 projection. Canonical business data remains in Supabase Postgres.
PRAGMA foreign_keys = ON;

CREATE TABLE public_content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_html TEXT NOT NULL,
  cover_url TEXT,
  author_name TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0),
  UNIQUE (type, slug)
) STRICT;
CREATE INDEX public_content_type_published_idx ON public_content(type, published_at DESC);
CREATE INDEX public_content_published_idx ON public_content(published_at DESC);

CREATE TABLE public_content_blocks (
  content_id TEXT NOT NULL REFERENCES public_content(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  block_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  PRIMARY KEY (content_id, block_key)
) STRICT;
CREATE INDEX public_content_blocks_order_idx ON public_content_blocks(content_id, sort_order);

-- The projector writes searchable text explicitly so rendering remains deterministic.
CREATE VIRTUAL TABLE public_content_search USING fts5(
  content_id UNINDEXED,
  title,
  excerpt,
  body_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE public_case_studies (
  id TEXT PRIMARY KEY REFERENCES public_content(id) ON DELETE CASCADE,
  client_name TEXT,
  summary TEXT,
  challenge TEXT,
  solution TEXT,
  outcome TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE public_stack_guides (
  id TEXT PRIMARY KEY REFERENCES public_content(id) ON DELETE CASCADE,
  summary TEXT,
  audience TEXT,
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced')),
  tools_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tools_json))
) STRICT;

CREATE TABLE public_tools (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  vendor_name TEXT,
  category TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  is_recommended INTEGER NOT NULL DEFAULT 0 CHECK (is_recommended IN (0, 1)),
  setup_difficulty TEXT NOT NULL CHECK (setup_difficulty IN ('beginner', 'intermediate', 'advanced')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  updated_at TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0)
) STRICT;
CREATE INDEX public_tools_category_recommended_idx ON public_tools(category, is_recommended);

CREATE TABLE public_offers (
  id TEXT PRIMARY KEY,
  tool_id TEXT REFERENCES public_tools(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('discount', 'free_trial', 'credit', 'coupon', 'bundle', 'internal_service')),
  code TEXT,
  starts_at TEXT,
  ends_at TEXT,
  terms TEXT,
  affiliate_url TEXT,
  updated_at TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
) STRICT;
CREATE INDEX public_offers_window_idx ON public_offers(starts_at, ends_at);

CREATE TABLE public_navigation (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  parent_id TEXT REFERENCES public_navigation(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0),
  CHECK (parent_id IS NULL OR parent_id <> id)
) STRICT;
CREATE INDEX public_navigation_location_order_idx ON public_navigation(location, sort_order);

CREATE TABLE public_homepage_sections (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  section_type TEXT NOT NULL,
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0)
) STRICT;

CREATE TABLE public_sitemap_urls (
  url TEXT PRIMARY KEY,
  last_modified TEXT,
  change_frequency TEXT CHECK (change_frequency IS NULL OR change_frequency IN ('always','hourly','daily','weekly','monthly','yearly','never')),
  priority_basis_points INTEGER CHECK (priority_basis_points IS NULL OR priority_basis_points BETWEEN 0 AND 10000),
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0)
) STRICT;
CREATE INDEX public_sitemap_urls_modified_idx ON public_sitemap_urls(last_modified DESC);

CREATE TABLE public_redirects (
  source_path TEXT PRIMARY KEY,
  target_path TEXT NOT NULL,
  status_code INTEGER NOT NULL CHECK (status_code IN (301, 302)),
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0)
) STRICT;

CREATE TABLE public_seo_metadata (
  path TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  canonical_url TEXT,
  og_image_url TEXT,
  robots TEXT,
  structured_data_json TEXT CHECK (structured_data_json IS NULL OR json_valid(structured_data_json)),
  updated_at TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_version > 0)
) STRICT;
CREATE INDEX public_seo_metadata_updated_idx ON public_seo_metadata(updated_at DESC);

-- A projector inserts the receipt in the same D1 batch as its projection write.
CREATE TABLE projection_receipts (
  event_id TEXT PRIMARY KEY,
  projection TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  sync_version INTEGER NOT NULL CHECK (sync_version > 0),
  payload_checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
) STRICT;
CREATE INDEX projection_receipts_aggregate_idx ON projection_receipts(aggregate_type, aggregate_id);
