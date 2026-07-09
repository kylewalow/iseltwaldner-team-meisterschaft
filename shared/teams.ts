// Central, single-source definition of the 13 teams and poll states.
// Order and spelling live here only — used by both the Nuxt app and the server.

export interface Team {
  id: number
  name: string
  /** Stable ASCII slug — also the served image filename (`/teams/<slug>.webp`). */
  slug: string
  /** Distinct brand color per team (hex), used for buttons and result bars. */
  color: string
}

export const TEAMS: Team[] = [
  { id: 9, name: '5 vor Karies', slug: '5-vor-karies', color: '#06b6d4' },
  { id: 6, name: 'Aloha Girls', slug: 'aloha-girls', color: '#22c55e' },
  { id: 8, name: 'Die Himmlische 5', slug: 'die-himmlische-5', color: '#14b8a6' },
  { id: 12, name: 'Donnstigteam', slug: 'donnstigteam', color: '#8b5cf6' },
  { id: 1, name: 'Frauenverein Iseltwald', slug: 'frauenverein-iseltwald', color: '#e11d48' },
  { id: 5, name: 'Gang geng gredi', slug: 'gang-geng-gredi', color: '#84cc16' },
  { id: 3, name: 'Harderwybli', slug: 'harderwybli', color: '#f59e0b' },
  { id: 7, name: 'Hawaii Girls', slug: 'hawaii-girls', color: '#10b981' },
  { id: 14, name: 'SaLuMaZoMü', slug: 'salumazomue', color: '#0ea5e9' },
  { id: 11, name: 'SHC Oberland', slug: 'shc-oberland', color: '#6366f1' },
  { id: 4, name: 'Skiklub Bönigen 1', slug: 'skiklub-boenigen-1', color: '#eab308' },
  { id: 13, name: 'Skiklub Bönigen 2', slug: 'skiklub-boenigen-2', color: '#ec4899' },
  { id: 10, name: 'Skiklub Hofstetten', slug: 'skiklub-hofstetten', color: '#3b82f6' },
  { id: 2, name: 'TVI 1. Rang', slug: 'tvi-1-rang', color: '#f97316' },
]

/** Full-size image (for the fullscreen lightbox). */
export function teamImage(team: Team): string {
  return `/teams/${team.slug}.webp`
}

/** Smaller thumbnail (for the card grid). */
export function teamThumb(team: Team): string {
  return `/teams/${team.slug}-thumb.webp`
}

export const TEAM_IDS: number[] = TEAMS.map((t) => t.id)

export function teamById(id: number): Team | undefined {
  return TEAMS.find((t) => t.id === id)
}

export type PollStatus = 'pending' | 'open' | 'closed' | 'published'

export const POLL_STATUSES: PollStatus[] = ['pending', 'open', 'closed', 'published']

export function isPollStatus(value: unknown): value is PollStatus {
  return typeof value === 'string' && (POLL_STATUSES as string[]).includes(value)
}
