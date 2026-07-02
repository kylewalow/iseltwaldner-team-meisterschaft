import { resetAll } from '~~/server/utils/kv'

export default defineEventHandler(async () => {
  await resetAll()
  return { ok: true }
})
