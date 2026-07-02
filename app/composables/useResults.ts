import type { PollStatus } from '#shared/teams'

interface ResultsResponse {
  status: PollStatus
  votes: Record<number, number>
  total: number
  myChoice: number | null
}

/**
 * Fetches `/api/results` (SSR-friendly, so the first paint has real data) and
 * then polls on an interval. Used by both the public page and the admin panel.
 */
export function useResults(intervalMs = 5000) {
  const defaults = (): ResultsResponse => ({
    status: 'pending',
    votes: {},
    total: 0,
    myChoice: null,
  })

  const { data, refresh, status: requestStatus } = useAsyncData<ResultsResponse>(
    'results',
    () => $fetch('/api/results'),
    { default: defaults },
  )

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    timer = setInterval(() => {
      refresh()
    }, intervalMs)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  const status = computed<PollStatus>(() => data.value?.status ?? 'pending')
  const votes = computed(() => data.value?.votes ?? {})
  const total = computed(() => data.value?.total ?? 0)
  const myChoice = computed(() => data.value?.myChoice ?? null)
  const loading = computed(() => requestStatus.value === 'pending')

  return { status, votes, total, myChoice, loading, refresh }
}
