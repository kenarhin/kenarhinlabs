import type { PwaManifestOptions } from '../types'
import { DEFAULT_PWA_ICONS, KEN_ARHIN_LABS_PWA_COLORS } from '../constants'
import { normalizeAppPath } from './url-patterns'

function mergeManifest(
  base: PwaManifestOptions,
  overrides: PwaManifestOptions | undefined,
): PwaManifestOptions {
  if (!overrides) return base

  return {
    ...base,
    ...overrides,
    icons: overrides.icons ?? base.icons,
    shortcuts: overrides.shortcuts ?? base.shortcuts,
    screenshots: overrides.screenshots ?? base.screenshots,
    categories: overrides.categories ?? base.categories,
  }
}

export interface ManifestFactoryInput {
  name?: string
  shortName?: string
  description?: string
  appId?: string
  startUrl?: string
  scope?: string
  lang?: string
  themeColor?: string
  backgroundColor?: string
  overrides?: PwaManifestOptions
}

export function createPublicManifest(input: ManifestFactoryInput = {}): PwaManifestOptions {
  const scope = normalizeAppPath(input.scope, '/')
  const startUrl = normalizeAppPath(input.startUrl, '/')

  const base: PwaManifestOptions = {
    id: input.appId ?? '/',
    name: input.name ?? 'Ken Arhin Labs',
    short_name: input.shortName ?? 'KAL Labs',
    description:
      input.description ??
      'AI-ready digital systems, websites, applications, automations, infrastructure, and practical field notes.',
    start_url: startUrl,
    scope,
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: input.backgroundColor ?? KEN_ARHIN_LABS_PWA_COLORS.warmCanvas,
    theme_color: input.themeColor ?? KEN_ARHIN_LABS_PWA_COLORS.labInk,
    lang: input.lang ?? 'en',
    dir: 'ltr',
    icons: [...DEFAULT_PWA_ICONS],
    categories: ['business', 'productivity', 'developer'],
    shortcuts: [
      {
        name: 'Start a project',
        short_name: 'Start',
        description: 'Begin a project request with Ken Arhin Labs.',
        url: '/start',
      },
      {
        name: 'Explore our work',
        short_name: 'Work',
        description: 'View case studies and digital systems built by Ken Arhin Labs.',
        url: '/work',
      },
      {
        name: 'Read Field Notes',
        short_name: 'Notes',
        description: 'Read practical guides, experiments, and project notes.',
        url: '/field-notes',
      },
    ],
  }

  return mergeManifest(base, input.overrides)
}

export function createAdminManifest(input: ManifestFactoryInput = {}): PwaManifestOptions {
  const scope = normalizeAppPath(input.scope, '/')
  const startUrl = normalizeAppPath(input.startUrl, '/dashboard')

  const base: PwaManifestOptions = {
    id: input.appId ?? '/',
    name: input.name ?? 'Ken Arhin Labs Admin',
    short_name: input.shortName ?? 'KAL Admin',
    description: input.description ?? 'The secure operating system for Ken Arhin Labs.',
    start_url: startUrl,
    scope,
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: input.backgroundColor ?? KEN_ARHIN_LABS_PWA_COLORS.labInk,
    theme_color: input.themeColor ?? KEN_ARHIN_LABS_PWA_COLORS.labInk,
    lang: input.lang ?? 'en',
    dir: 'ltr',
    icons: [...DEFAULT_PWA_ICONS],
    categories: ['business', 'productivity'],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Open the Ken Arhin Labs operating dashboard.',
        url: '/dashboard',
      },
      {
        name: 'Create content',
        short_name: 'New content',
        description: 'Create a new content item.',
        url: '/content/new',
      },
      {
        name: 'Review leads',
        short_name: 'Leads',
        description: 'Open the lead management workspace.',
        url: '/leads',
      },
    ],
  }

  return mergeManifest(base, input.overrides)
}
