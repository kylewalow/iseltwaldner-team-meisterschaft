<script setup lang="ts">
import { TEAMS } from '#shared/teams'

const { status, votes, myChoice, loading, refresh } = useResults()

const submitting = ref(false)
// Optimistic override so the highlight reacts instantly; cleared once the
// authoritative choice from the server arrives via refresh().
const localChoice = ref<number | null>(null)
const selectedChoice = computed(() => localChoice.value ?? myChoice.value)

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
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    <header class="mb-8 text-center">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Team-Meisterschaft Iseltwald</h1>
      <p class="mt-1 text-slate-600">Publikums-Voting</p>
    </header>

    <div v-if="loading" class="py-16 text-center text-slate-500">Lädt …</div>

    <!-- pending: teams visible, no buttons, no numbers -->
    <template v-else-if="status === 'pending'">
      <div class="mb-6 rounded-lg bg-amber-100 px-4 py-3 text-center font-medium text-amber-900">
        Die Abstimmung hat noch nicht begonnen.
      </div>
      <ul class="space-y-2">
        <li
          v-for="team in TEAMS"
          :key="team.id"
          class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: team.color }" />
          <span class="font-medium">{{ team.name }}</span>
        </li>
      </ul>
    </template>

    <!-- open: colored voting buttons, current choice highlighted, no numbers -->
    <template v-else-if="status === 'open'">
      <p class="mb-6 text-center text-slate-600">
        Tippe auf dein Team. Du kannst deine Wahl jederzeit ändern.
      </p>
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li v-for="team in TEAMS" :key="team.id">
          <button
            type="button"
            :disabled="submitting"
            class="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 disabled:opacity-70"
            :class="
              selectedChoice === team.id
                ? 'ring-4 ring-slate-900 ring-offset-2'
                : 'opacity-95 hover:opacity-100'
            "
            :style="{ backgroundColor: team.color }"
            @click="vote(team.id)"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-sm"
            >
              <span v-if="selectedChoice === team.id">✓</span>
            </span>
            <span class="drop-shadow-sm">{{ team.name }}</span>
          </button>
        </li>
      </ul>
      <p v-if="selectedChoice" class="mt-6 text-center text-slate-600">
        Deine Stimme ist gespeichert. Danke!
      </p>
    </template>

    <!-- closed: voting ended, no numbers -->
    <template v-else-if="status === 'closed'">
      <div class="rounded-lg bg-slate-200 px-4 py-8 text-center">
        <p class="text-lg font-semibold text-slate-800">Abstimmung beendet</p>
        <p class="mt-1 text-slate-600">Das Ergebnis wird in Kürze bekannt gegeben.</p>
      </div>
    </template>

    <!-- published: sorted results with numbers -->
    <template v-else>
      <h2 class="mb-4 text-center text-xl font-bold">Ergebnis</h2>
      <ResultBars :votes="votes" />
    </template>
  </main>
</template>
