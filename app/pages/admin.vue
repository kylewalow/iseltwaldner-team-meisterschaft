<script setup lang="ts">
import { TEAMS, POLL_STATUSES, type PollStatus } from '#shared/teams'

const { status, votes, total, loading, refresh } = useResults()

const busy = ref(false)

// --- Confirmation dialog ------------------------------------------------------
const confirmState = ref<{ message: string; action: () => Promise<void> } | null>(null)

function askConfirm(message: string, action: () => Promise<void>) {
  confirmState.value = { message, action }
}

async function runConfirmed() {
  const current = confirmState.value
  confirmState.value = null
  if (!current) return
  busy.value = true
  try {
    await current.action()
    await refresh()
  } finally {
    busy.value = false
  }
}

// --- Status labels & actions --------------------------------------------------
const STATUS_META: Record<PollStatus, { label: string; confirm: string }> = {
  pending: {
    label: 'Vor Start',
    confirm: 'Abstimmung auf „Vor Start" zurücksetzen? Besucher können nicht abstimmen.',
  },
  open: {
    label: 'Starten',
    confirm: 'Abstimmung wirklich starten? Besucher können ab sofort abstimmen.',
  },
  closed: {
    label: 'Beenden',
    confirm: 'Abstimmung wirklich beenden? Besucher können dann nicht mehr abstimmen.',
  },
  published: {
    label: 'Veröffentlichen',
    confirm: 'Ergebnis wirklich veröffentlichen? Die Stimmenzahlen werden für alle sichtbar.',
  },
}

const STATUS_BADGE: Record<PollStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  open: 'bg-green-100 text-green-900',
  closed: 'bg-slate-200 text-slate-800',
  published: 'bg-blue-100 text-blue-900',
}

function changeStatus(next: PollStatus) {
  if (next === status.value) return
  askConfirm(STATUS_META[next].confirm, async () => {
    await $fetch('/api/admin/status', { method: 'POST', body: { status: next } })
  })
}

function resetAll() {
  askConfirm(
    'Alle Stimmen wirklich auf 0 zurücksetzen? Das kann nicht rückgängig gemacht werden.',
    async () => {
      await $fetch('/api/admin/reset', { method: 'POST' })
    },
  )
}

// --- Per-team override --------------------------------------------------------
// Draft inputs are kept separate from the live counts so the 5s refresh never
// overwrites what the admin is typing.
const drafts = reactive<Record<number, string>>({})

function saveOverride(teamId: number, name: string) {
  const raw = drafts[teamId]
  if (raw === undefined || raw === '') return
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    window.alert('Bitte eine ganze Zahl ≥ 0 eingeben.')
    return
  }
  askConfirm(`Stimmen für „${name}" auf ${value} setzen?`, async () => {
    await $fetch('/api/admin/set', { method: 'POST', body: { teamId, value } })
    drafts[teamId] = ''
  })
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Admin – Team-Voting</h1>
      <span
        class="rounded-full px-3 py-1 text-sm font-semibold"
        :class="STATUS_BADGE[status]"
      >
        {{ STATUS_META[status].label }}
      </span>
    </header>

    <div v-if="loading" class="py-16 text-center text-slate-500">Lädt …</div>

    <template v-else>
      <!-- Status control -->
      <section class="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="mb-3 font-semibold">Status</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in POLL_STATUSES"
            :key="s"
            type="button"
            :disabled="busy || s === status"
            class="rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed"
            :class="
              s === status
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            "
            @click="changeStatus(s)"
          >
            {{ STATUS_META[s].label }}
          </button>
        </div>
      </section>

      <!-- Live overview -->
      <section class="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-semibold">Live-Übersicht</h2>
          <span class="text-sm text-slate-600">
            Stimmen gesamt: <strong class="tabular-nums">{{ total }}</strong>
          </span>
        </div>
        <ResultBars :votes="votes" />
        <p class="mt-3 text-xs text-slate-500">
          Aktualisiert sich automatisch alle 5&nbsp;Sekunden. Nutze die Gesamtzahl, um
          Auffälligkeiten zu erkennen.
        </p>
      </section>

      <!-- Per-team override -->
      <section class="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="mb-3 font-semibold">Einzelnen Zähler überschreiben</h2>
        <ul class="space-y-2">
          <li
            v-for="team in TEAMS"
            :key="team.id"
            class="flex items-center gap-3"
          >
            <span
              class="h-3 w-3 shrink-0 rounded-full"
              :style="{ backgroundColor: team.color }"
            />
            <span class="min-w-0 flex-1 truncate font-medium">{{ team.name }}</span>
            <span class="w-12 text-right tabular-nums text-slate-500">{{ votes[team.id] ?? 0 }}</span>
            <input
              v-model="drafts[team.id]"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              :placeholder="String(votes[team.id] ?? 0)"
              class="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right tabular-nums focus:border-slate-500 focus:outline-none"
            />
            <button
              type="button"
              :disabled="busy"
              class="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              @click="saveOverride(team.id, team.name)"
            >
              Speichern
            </button>
          </li>
        </ul>
      </section>

      <!-- Danger zone -->
      <section class="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h2 class="mb-3 font-semibold text-rose-900">Zurücksetzen</h2>
        <button
          type="button"
          :disabled="busy"
          class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          @click="resetAll"
        >
          Alle Zähler auf 0
        </button>
      </section>
    </template>

    <!-- Confirmation dialog -->
    <div
      v-if="confirmState"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="confirmState = null"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p class="text-slate-800">{{ confirmState.message }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="confirmState = null"
          >
            Abbrechen
          </button>
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            @click="runConfirmed"
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
