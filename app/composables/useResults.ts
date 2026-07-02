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

  // Forward the incoming request headers (incl. the voter cookie) to the
  // internal API during SSR, so `myChoice` is correct on the very first paint.
  const requestFetch = useRequestFetch()
  const { data, refresh, status: requestStatus } = useAsyncData<ResultsResponse>(
    'results',
    () => requestFetch('/api/results'),
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

  // Only the very first load counts as "loading" — background poll refreshes set
  // requestStatus back to 'pending' each time, which must NOT flash the loading
  // state (that caused the admin panel to flicker every 5s).
  const hasEverLoaded = ref(false)
  watchEffect(() => {
    if (requestStatus.value === 'success' || requestStatus.value === 'error') {
      hasEverLoaded.value = true
    }
  })
  const loading = computed(() => !hasEverLoaded.value)

  return { status, votes, total, myChoice, loading, refresh }
}
