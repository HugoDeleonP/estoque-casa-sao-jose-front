<script setup lang="ts">
import { formatarSaldo } from '@/utils/format'

defineProps<{ saldo: number }>()
</script>

<template>
  <span class="saldo" :class="{ negativo: saldo < 0, zero: saldo === 0 }">
    <span v-if="saldo < 0" class="sr">Saldo negativo:</span>
    {{ formatarSaldo(saldo) }}
    <span v-if="saldo < 0" aria-hidden="true">⚠</span>
  </span>
</template>

<style scoped>
.saldo {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--ok-bg);
  color: var(--ok);
}
.zero { background: var(--surface-2); color: var(--text-2); }
.negativo { background: var(--danger-bg); color: var(--danger); }
</style>
