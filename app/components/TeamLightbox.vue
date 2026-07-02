<script setup lang="ts">
import { type Team, teamImage } from '#shared/teams'

const props = defineProps<{ team: Team | null }>()
const emit = defineEmits<{ close: [] }>()

// Close on Escape while open.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
watch(
  () => props.team,
  (team) => {
    if (import.meta.client) {
      document.documentElement.style.overflow = team ? 'hidden' : ''
      if (team) window.addEventListener('keydown', onKey)
      else window.removeEventListener('keydown', onKey)
    }
  },
)
onBeforeUnmount(() => {
  if (import.meta.client) {
    document.documentElement.style.overflow = ''
    window.removeEventListener('keydown', onKey)
  }
})
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150"
    leave-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="team"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"
      role="dialog"
      aria-modal="true"
      :aria-label="team.name"
      @click="emit('close')"
    >
      <img
        :src="teamImage(team)"
        :alt="team.name"
        class="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
      <button
        type="button"
        class="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-white/25"
        aria-label="Schliessen"
        @click.stop="emit('close')"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>
