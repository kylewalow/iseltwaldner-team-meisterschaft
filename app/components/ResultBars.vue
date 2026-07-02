<script setup lang="ts">
import { TEAMS } from '#shared/teams'

const props = defineProps<{
  votes: Record<number, number>
}>()

// Teams ranked by votes, winner first.
const ranked = computed(() =>
  TEAMS.map((team) => ({ ...team, count: props.votes[team.id] ?? 0 })).sort(
    (a, b) => b.count - a.count,
  ),
)

// Bar width is relative to the leading team (at least 1 to avoid /0).
const maxVotes = computed(() => Math.max(1, ...ranked.value.map((t) => t.count)))
</script>

<template>
  <ol class="space-y-2">
    <li
      v-for="(team, index) in ranked"
      :key="team.id"
      class="relative overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <!-- Fill bar proportional to the leader, animated. -->
      <div
        class="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
        :style="{
          width: `${(team.count / maxVotes) * 100}%`,
          backgroundColor: team.color,
          opacity: 0.85,
        }"
      />
      <div class="relative flex items-center justify-between gap-3 px-4 py-3">
        <span class="flex items-center gap-2 font-medium text-slate-900">
          <span class="w-6 text-right tabular-nums text-sm text-slate-600">{{ index + 1 }}.</span>
          <span>{{ team.name }}</span>
        </span>
        <span class="tabular-nums text-lg font-bold text-slate-900">{{ team.count }}</span>
      </div>
    </li>
  </ol>
</template>
