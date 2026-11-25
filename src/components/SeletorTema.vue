<script setup lang="ts">
import { computed } from 'vue'
import { useTema } from '@/composables/useTema'

const { tema, alternar } = useTema()

const ROTULO = {
  automatico: { icone: '◐', texto: 'Automático' },
  claro: { icone: '☀', texto: 'Claro' },
  escuro: { icone: '☾', texto: 'Escuro' },
} as const

const atual = computed(() => ROTULO[tema.value])
</script>

<template>
  <button
    type="button"
    class="seletor-tema"
    :title="`Tema: ${atual.texto} (clique para trocar)`"
    :aria-label="`Tema: ${atual.texto}. Clique para trocar`"
    @click="alternar"
  >
    <span aria-hidden="true">{{ atual.icone }}</span> {{ atual.texto }}
  </button>
</template>

<style scoped>
.seletor-tema {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking);
  min-height: 36px;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.seletor-tema:hover {
  background: rgb(127 127 127 / 0.15);
}
.seletor-tema span {
  font-size: 1rem;
  line-height: 1;
}
</style>
