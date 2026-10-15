<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, remover } = useToast()
const ROTULO = { sucesso: 'OK', aviso: 'Atenção', erro: 'Erro', info: 'Info' } as const
</script>

<template>
  <!-- aria-live: leitores de tela anunciam sem roubar o foco do campo do leitor óptico -->
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.tipo" role="status">
        <strong>{{ ROTULO[t.tipo] }}</strong>
        <span>{{ t.mensagem }}</span>
        <button type="button" class="fechar" tabindex="-1" aria-label="Fechar" @click="remover(t.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: grid;
  gap: 8px;
  width: min(420px, calc(100vw - 32px));
  z-index: 50;
}
.toast {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
  font-size: 0.9375rem;
}
.toast.sucesso { border-left-color: var(--ok); }
.toast.aviso { border-left-color: var(--warn); background: var(--warn-bg); }
.toast.erro { border-left-color: var(--danger); background: var(--danger-bg); }
.fechar {
  border: none;
  background: none;
  color: var(--text-2);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
