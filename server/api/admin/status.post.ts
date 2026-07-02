import { isPollStatus } from '#shared/teams'
import { setStatus } from '~~/server/utils/kv'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ status?: string }>(event)
  if (!isPollStatus(body?.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Status.' })
  }
  await setStatus(body.status)
  return { ok: true, status: body.status }
})
