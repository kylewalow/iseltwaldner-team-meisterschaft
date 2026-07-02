import { getStatus, getVotes, getVoterChoice } from '~~/server/utils/kv'

// Public endpoint: returns the poll status plus raw counts. The UI decides
// whether to reveal the numbers (only once status is `published`). Counts are
// intentionally not hidden server-side — see the project notes.
export default defineEventHandler(async (event) => {
  const [status, votes] = await Promise.all([getStatus(), getVotes()])

  const voterId = getCookie(event, 'voterId')
  const myChoice = voterId ? await getVoterChoice(voterId) : null

  const total = Object.values(votes).reduce((sum, n) => sum + n, 0)

  return { status, votes, total, myChoice }
})
