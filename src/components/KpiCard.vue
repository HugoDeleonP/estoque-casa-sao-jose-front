<script setup lang="ts">
defineProps<{ rotulo: string; valor: string; unidade?: string; detalhe?: string; destaque?: 'aviso' }>()
</script>

<template>
  <div class="kpi" :class="destaque">
    <p class="rotulo">{{ rotulo }}</p>
    <p class="valor">
      {{ valor }}<span v-if="unidade" class="unidade">{{ unidade }}</span>
    </p>
    <p v-if="detalhe" class="detalhe">{{ detalhe }}</p>
  </div>
</template>

<style scoped>
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 4px solid var(--cor-primaria);
  border-radius: var(--radius);
  padding: 16px 18px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 2px;
  align-content: start;
}
.rotulo {
  font-size: 0.8125rem;
  color: var(--text-2);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking);
}
.valor {
  font-size: 2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--cor-primaria);
  line-height: 1.2;
}
.unidade {
  margin-left: 0.3em;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-2);
}
.detalhe {
  font-size: 0.875rem;
  color: var(--text-2);
}
/* Saldo negativo é alerta: âmbar, independente da paleta da marca */
.aviso {
  border-top-color: var(--warn);
  background: var(--warn-bg);
}
.aviso .valor {
  color: var(--warn);
}
</style>
