// Basic Auth guard for the admin panel and all admin API routes.
// Protecting the `/admin` page (whose directory is `/`) makes the browser cache
// the credentials for the whole origin, so subsequent fetches to `/api/admin/*`
// carry them automatically. HTTPS is provided by Vercel in production.

const REALM = 'Team-Voting Admin'

function isProtected(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin')
}

function requireAuth(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]): never {
  setResponseHeader(event, 'WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`)
  throw createError({ statusCode: 401, statusMessage: 'Authentifizierung erforderlich.' })
}

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0] ?? event.path
  if (!isProtected(path)) return

  const expectedUser = process.env.ADMIN_USER
  const expectedPw = process.env.ADMIN_PW

  // No credentials configured: allow in dev for convenience, deny in production.
  if (!expectedUser || !expectedPw) {
    if (process.env.NODE_ENV === 'production') requireAuth(event)
    return
  }

  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Basic ')) requireAuth(event)

  const decoded = Buffer.from(header!.slice('Basic '.length), 'base64').toString('utf8')
  const separator = decoded.indexOf(':')
  const user = decoded.slice(0, separator)
  const pw = decoded.slice(separator + 1)

  if (user !== expectedUser || pw !== expectedPw) requireAuth(event)
})
