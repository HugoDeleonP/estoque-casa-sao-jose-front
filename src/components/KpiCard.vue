<script setup lang="ts">
defineProps<{ rotulo: string; valor: string; detalhe?: string; destaque?: 'perigo' }>()
</script>

<template>
  <div class="kpi" :class="destaque">
    <p class="rotulo">{{ rotulo }}</p>
    <p class="valor">{{ valor }}</p>
    <p v-if="detalhe" class="detalhe">{{ detalhe }}</p>
  </div>
</template>

<style scoped>
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 2px;
  align-content: start;
}
.rotulo { font-size: 0.875rem; color: var(--text-2); font-weight: 500; }
.valor { font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text); line-height: 1.2; }
.detalhe { font-size: 0.8125rem; color: var(--text-3); }
.perigo { border-color: var(--danger); background: var(--danger-bg); }
.perigo .valor { color: var(--danger); }
</style>
