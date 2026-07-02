import { TEAM_IDS } from '#shared/teams'
import { setTeam } from '~~/server/utils/kv'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ teamId?: number | string; value?: number | string }>(event)
  const teamId = Number(body?.teamId)
  const value = Number(body?.value)

  if (!TEAM_IDS.includes(teamId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Team.' })
  }
  if (!Number.isInteger(value) || value < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Wert.' })
  }

  await setTeam(teamId, value)
  return { ok: true, teamId, value }
})
