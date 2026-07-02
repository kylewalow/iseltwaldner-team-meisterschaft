import { randomUUID } from 'node:crypto'
import { TEAM_IDS } from '#shared/teams'
import {
  getStatus,
  getVoterChoice,
  setVoterChoice,
  incrTeam,
  decrTeam,
} from '~~/server/utils/kv'

const VOTER_COOKIE = 'voterId'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export default defineEventHandler(async (event) => {
  // 1. Voting is only allowed while the poll is open.
  const status = await getStatus()
  if (status !== 'open') {
    throw createError({ statusCode: 403, statusMessage: 'Abstimmung ist nicht geöffnet.' })
  }

  const body = await readBody<{ teamId?: number | string }>(event)
  const teamId = Number(body?.teamId)
  if (!TEAM_IDS.includes(teamId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Team.' })
  }

  // 2. Identify the voter via HttpOnly cookie (create one on first vote).
  let voterId = getCookie(event, VOTER_COOKIE)
  if (!voterId) {
    voterId = randomUUID()
    setCookie(event, VOTER_COOKIE, voterId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })
  }

  // 3. Look up the previous choice.
  const previous = await getVoterChoice(voterId)

  // 4. Same choice -> no-op. Changed choice -> move the vote atomically.
  if (previous === teamId) {
    return { ok: true, choice: teamId }
  }
  if (previous != null) {
    await decrTeam(previous)
  }
  await incrTeam(teamId)
  await setVoterChoice(voterId, teamId)

  return { ok: true, choice: teamId }
})
