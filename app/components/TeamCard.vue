<script setup lang="ts">
import { type Team, teamThumb } from '#shared/teams'

const props = defineProps<{
  team: Team
  /** Rank shown before the name (published results). */
  rank?: number
  /** Vote count shown on the right (published results). */
  count?: number | null
  /** Bottom bar width in percent. Defaults to a full-width color accent. */
  barPercent?: number | null
}>()

const barWidth = computed(() => (props.barPercent == null ? 100 : props.barPercent))
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <img
      :src="teamThumb(team)"
      :alt="team.name"
      loading="lazy"
      class="aspect-[5/4] w-full object-cover"
    />

    <div class="flex flex-1 items-center justify-between gap-2 px-3 py-2">
      <span class="flex min-w-0 items-center gap-1.5">
        <span v-if="rank != null" class="shrink-0 text-sm font-bold text-slate-500">{{ rank }}.</span>
        <span class="truncate text-sm font-semibold text-slate-900">{{ team.name }}</span>
      </span>
      <span v-if="count != null" class="shrink-0 tabular-nums text-base font-bold text-slate-900">
        {{ count }}
      </span>
    </div>

    <!-- color accent: full strip by default, proportional bar for results -->
    <div class="h-2 w-full bg-slate-100">
      <div
        class="h-full transition-[width] duration-700 ease-out"
        :style="{ width: `${barWidth}%`, backgroundColor: team.color }"
      />
    </div>
  </div>
</template>
