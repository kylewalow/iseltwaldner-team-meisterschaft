import { Redis } from '@upstash/redis'
import { TEAMS, TEAM_IDS, type PollStatus } from '#shared/teams'

// --- Low-level client ---------------------------------------------------------
// In production the Vercel KV / Upstash integration provides the REST
// credentials. When they are missing (local dev) we transparently fall back to
// an in-process store so the app stays runnable without external services.

interface LowLevelStore {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: string | number): Promise<unknown>
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
  mget<T>(keys: string[]): Promise<(T | null)[]>
  keys(pattern: string): Promise<string[]>
  del(keys: string[]): Promise<unknown>
}

function createUpstashStore(url: string, token: string): LowLevelStore {
  const redis = new Redis({ url, token })
  return {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value),
    incr: (key) => redis.incr(key),
    decr: (key) => redis.decr(key),
    mget: (keys) => (keys.length ? redis.mget(...keys) : Promise.resolve([])),
    keys: (pattern) => redis.keys(pattern),
    del: (keys) => (keys.length ? redis.del(...keys) : Promise.resolve(0)),
  }
}

function createMemoryStore(): LowLevelStore {
  const mem = new Map<string, string | number>()
  const matcher = (pattern: string) =>
    new RegExp('^' + pattern.split('*').map(escapeRegExp).join('.*') + '$')
  return {
    async get(key) {
      return (mem.has(key) ? mem.get(key) : null) as never
    },
    async set(key, value) {
      mem.set(key, value)
    },
    async incr(key) {
      const next = Number(mem.get(key) ?? 0) + 1
      mem.set(key, next)
      return next
    },
    async decr(key) {
      const next = Number(mem.get(key) ?? 0) - 1
      mem.set(key, next)
      return next
    },
    async mget(keys) {
      return keys.map((k) => (mem.has(k) ? mem.get(k) : null)) as never
    },
    async keys(pattern) {
      const re = matcher(pattern)
      return [...mem.keys()].filter((k) => re.test(k))
    },
    async del(keys) {
      keys.forEach((k) => mem.delete(k))
      return keys.length
    },
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let store: LowLevelStore | undefined
let warnedMemory = false

// Resolve the Upstash REST credentials regardless of the env-var prefix the
// Vercel/Upstash integration chose (KV_, STORAGE_, UPSTASH_REDIS_, …). Falls
// back to scanning for any "<PREFIX>_REST_API_URL" + matching "..._TOKEN" pair.
function resolveKvCredentials(): { url?: string; token?: string } {
  const env = process.env
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return { url, token }

  const URL_SUFFIX = '_REST_API_URL'
  for (const key of Object.keys(env)) {
    if (!key.endsWith(URL_SUFFIX)) continue
    const tokenKey = `${key.slice(0, -URL_SUFFIX.length)}_REST_API_TOKEN`
    if (env[key] && env[tokenKey]) return { url: env[key], token: env[tokenKey] }
  }
  return {}
}

function getStore(): LowLevelStore {
  if (store) return store
  const { url, token } = resolveKvCredentials()
  if (url && token) {
    store = createUpstashStore(url, token)
  } else {
    if (!warnedMemory) {
      console.warn(
        '[kv] No KV_REST_API_URL/TOKEN found — using in-memory store. ' +
          'State is not persisted and not shared across instances. (Local dev only.)',
      )
      warnedMemory = true
    }
    store = createMemoryStore()
  }
  return store
}

// --- Domain keys --------------------------------------------------------------

const STATUS_KEY = 'poll:status'
const teamKey = (id: number) => `votes:team:${id}`
const voterKey = (voterId: string) => `voter:${voterId}:choice`

// --- Poll status --------------------------------------------------------------

export async function getStatus(): Promise<PollStatus> {
  const value = await getStore().get<PollStatus>(STATUS_KEY)
  return value ?? 'pending'
}

export async function setStatus(status: PollStatus): Promise<void> {
  await getStore().set(STATUS_KEY, status)
}

// --- Vote counters ------------------------------------------------------------

/** Returns a map of team id -> vote count for all 13 teams (never negative). */
export async function getVotes(): Promise<Record<number, number>> {
  const keys = TEAMS.map((t) => teamKey(t.id))
  const values = await getStore().mget<number>(keys)
  const result: Record<number, number> = {}
  TEAMS.forEach((team, index) => {
    result[team.id] = Math.max(0, Number(values[index] ?? 0))
  })
  return result
}

export async function incrTeam(id: number): Promise<number> {
  return getStore().incr(teamKey(id))
}

export async function decrTeam(id: number): Promise<number> {
  return getStore().decr(teamKey(id))
}

export async function setTeam(id: number, value: number): Promise<void> {
  await getStore().set(teamKey(id), value)
}

/** Resets all counters to 0 and clears every stored voter choice. */
export async function resetAll(): Promise<void> {
  const s = getStore()
  await Promise.all(TEAM_IDS.map((id) => s.set(teamKey(id), 0)))
  const voterKeys = await s.keys('voter:*:choice')
  if (voterKeys.length) await s.del(voterKeys)
}

// --- Voter choice -------------------------------------------------------------

export async function getVoterChoice(voterId: string): Promise<number | null> {
  const value = await getStore().get<number>(voterKey(voterId))
  return value == null ? null : Number(value)
}

export async function setVoterChoice(voterId: string, teamId: number): Promise<void> {
  await getStore().set(voterKey(voterId), teamId)
}
