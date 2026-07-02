<script setup lang="ts">
import { TEAMS, type Team } from '#shared/teams'

const { status, votes, myChoice, refresh } = useResults()

const submitting = ref(false)
// Optimistic override so the highlight reacts instantly; cleared once the
// authoritative choice from the server arrives via refresh().
const localChoice = ref<number | null>(null)
const selectedChoice = computed(() => localChoice.value ?? myChoice.value)

// Fullscreen lightbox state — opened via long-press (secondary, easter-egg-ish).
const zoomed = ref<Team | null>(null)

// Teams ranked by votes (winner first) — for the published view.
const ranked = computed(() =>
  TEAMS.map((team) => ({ team, count: votes.value[team.id] ?? 0 })).sort(
    (a, b) => b.count - a.count,
  ),
)
const maxVotes = computed(() => Math.max(1, ...ranked.value.map((r) => r.count)))

async function vote(teamId: number) {
  if (status.value !== 'open' || submitting.value) return
  submitting.value = true
  localChoice.value = teamId // optimistic highlight
  try {
    await $fetch('/api/vote', { method: 'POST', body: { teamId } })
    await refresh()
  } catch {
    // Fall back to the server's last known choice.
  } finally {
    localChoice.value = null
    submitting.value = false
  }
}

// Long-press directive: hold ~450ms to fire, and swallow the click that follows
// so a hold never also casts a vote. Works for both touch and mouse.
const LONGPRESS_MS = 450
const vLongpress = {
  mounted(el: HTMLElement & { _lpCleanup?: () => void }, binding: { value?: () => void }) {
    let timer: ReturnType<typeof setTimeout> | null = null
    let fired = false

    const start = () => {
      fired = false
      timer = setTimeout(() => {
        fired = true
        binding.value?.()
      }, LONGPRESS_MS)
    }
    const cancel = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
    const onClickCapture = (e: MouseEvent) => {
      if (fired) {
        e.stopPropagation()
        e.preventDefault()
        fired = false
      }
    }

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchend', cancel)
    el.addEventListener('touchmove', cancel, { passive: true })
    el.addEventListener('touchcancel', cancel)
    el.addEventListener('mousedown', start)
    el.addEventListener('mouseup', cancel)
    el.addEventListener('mouseleave', cancel)
    el.addEventListener('click', onClickCapture, true)

    el._lpCleanup = () => {
      cancel()
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchend', cancel)
      el.removeEventListener('touchmove', cancel)
      el.removeEventListener('touchcancel', cancel)
      el.removeEventListener('mousedown', start)
      el.removeEventListener('mouseup', cancel)
      el.removeEventListener('mouseleave', cancel)
      el.removeEventListener('click', onClickCapture, true)
    }
  },
  unmounted(el: HTMLElement & { _lpCleanup?: () => void }) {
    el._lpCleanup?.()
  },
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    <header class="mb-6 text-center">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Team-Meisterschaft Iseltwald 2026</h1>
      <p class="mt-1 text-slate-600">Publikums-Voting</p>
    </header>

    <!-- pending: team cards visible, no voting, no numbers -->
    <template v-if="status === 'pending'">
      <div class="mb-6 rounded-lg bg-amber-100 px-4 py-3 text-center font-medium text-amber-900">
        Die Abstimmung hat noch nicht begonnen.
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          v-for="team in TEAMS"
          :key="team.id"
          v-longpress="() => (zoomed = team)"
          class="select-none [-webkit-touch-callout:none]"
        >
          <TeamCard :team="team" />
        </div>
      </div>
    </template>

    <!-- open: team cards, tap to vote, long-press to zoom -->
    <template v-else-if="status === 'open'">
      <p class="mb-6 text-center text-slate-600">
        Tippe auf dein Team, um abzustimmen. Du kannst deine Wahl jederzeit ändern.
      </p>
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <li v-for="team in TEAMS" :key="team.id" class="relative">
          <button
            type="button"
            :disabled="submitting"
            v-longpress="() => (zoomed = team)"
            class="block w-full select-none rounded-xl text-left transition [-webkit-touch-callout:none] focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 disabled:opacity-70"
            :class="
              selectedChoice === team.id
                ? 'ring-4 ring-slate-900 ring-offset-2'
                : 'hover:-translate-y-0.5'
            "
            :aria-pressed="selectedChoice === team.id"
            :aria-label="`Für ${team.name} abstimmen`"
            @click="vote(team.id)"
          >
            <TeamCard :team="team" />
          </button>

          <!-- selected checkmark badge -->
          <span
            v-if="selectedChoice === team.id"
            class="pointer-events-none absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow"
          >
            ✓
          </span>
        </li>
      </ul>
      <p v-if="selectedChoice" class="mt-6 text-center text-slate-600">
        Deine Stimme ist gespeichert. Danke!
      </p>
    </template>

    <!-- closed: voting ended, cards still viewable, no numbers -->
    <template v-else-if="status === 'closed'">
      <div class="mb-6 rounded-lg bg-slate-200 px-4 py-6 text-center">
        <p class="text-lg font-semibold text-slate-800">Abstimmung beendet</p>
        <p class="mt-1 text-slate-600">Das Ergebnis wird in Kürze bekannt gegeben.</p>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          v-for="team in TEAMS"
          :key="team.id"
          v-longpress="() => (zoomed = team)"
          class="select-none [-webkit-touch-callout:none]"
        >
          <TeamCard :team="team" />
        </div>
      </div>
    </template>

    <!-- published: sorted team cards with rank, count and proportional bar -->
    <template v-else>
      <h2 class="mb-5 text-center text-xl font-bold">Ergebnis</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          v-for="(entry, index) in ranked"
          :key="entry.team.id"
          v-longpress="() => (zoomed = entry.team)"
          class="select-none [-webkit-touch-callout:none]"
        >
          <TeamCard
            :team="entry.team"
            :rank="index + 1"
            :count="entry.count"
            :bar-percent="(entry.count / maxVotes) * 100"
          />
        </div>
      </div>
    </template>

    <TeamLightbox :team="zoomed" @close="zoomed = null" />
  </main>
</template>
