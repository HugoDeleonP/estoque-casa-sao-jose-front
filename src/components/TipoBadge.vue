<script setup lang="ts">
import type { TipoMovimentacao } from '@/types/api'

defineProps<{ tipo: TipoMovimentacao }>()
const ROTULO: Record<TipoMovimentacao, string> = { ENTRADA: '↓ Entrada', SAIDA: '↑ Saída', AJUSTE: '± Ajuste' }
</script>

<template>
  <span class="tipo" :class="tipo.toLowerCase()">{{ ROTULO[tipo] }}</span>
</template>

<style scoped>
.tipo {
  display: inline-block;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid currentColor;
}
.entrada { color: var(--series-entrada); }
.saida { color: var(--series-saida); }
.ajuste { color: var(--text-2); }
</style>
