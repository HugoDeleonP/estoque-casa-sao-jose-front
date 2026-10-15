<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToastContainer from '@/components/ToastContainer.vue'
import { env } from '@/config'
import type { Area } from '@/router'

const route = useRoute()
const router = useRouter()

const GRUPOS: { area: Area; titulo: string }[] = [
  { area: 'operacao', titulo: 'Operação' },
  { area: 'admin', titulo: 'Administração' },
  { area: 'dashboard', titulo: 'Dashboard' },
]

const menu = computed(() =>
  GRUPOS.map((g) => ({
    ...g,
    // options.routes preserva a ordem de declaração (getRoutes() ordena por especificidade)
    itens: router.options.routes.filter((r) => r.meta?.menu && r.meta.area === g.area),
  })),
)
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink to="/" class="marca">
        <span class="logo" aria-hidden="true">CSJ</span>
        <span>
          <strong>Casa São José</strong>
          <small>Estoque de doações</small>
        </span>
      </RouterLink>

      <nav aria-label="Principal">
        <div v-for="g in menu" :key="g.area" class="grupo">
          <p class="grupo-titulo">{{ g.titulo }}</p>
          <RouterLink v-for="r in g.itens" :key="r.path" :to="r.path" class="link">
            {{ r.meta?.menu }}
          </RouterLink>
        </div>
      </nav>

      <p v-if="env.useMock" class="mock" title="VITE_API_MOCK=true">
        Modo demonstração: dados fictícios, sem conexão com a API
      </p>
    </aside>

    <main class="conteudo">
      <RouterView :key="route.path" />
    </main>

    <ToastContainer />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 16px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
.marca {
  display: flex;
  gap: 10px;
  align-items: center;
  text-decoration: none;
  color: var(--text);
}
.marca small {
  display: block;
  color: var(--text-3);
  font-size: 0.8125rem;
}
.logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
  font-size: 0.8125rem;
  flex-shrink: 0;
}
nav {
  display: grid;
  gap: 20px;
}
.grupo {
  display: grid;
  gap: 2px;
}
.grupo-titulo {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  padding: 0 10px 4px;
}
.link {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  text-decoration: none;
  font-weight: 500;
}
.link:hover {
  background: var(--surface-2);
  color: var(--text);
}
.link.router-link-active {
  background: var(--accent-bg);
  color: var(--accent);
}
.mock {
  margin-top: auto;
  font-size: 0.8125rem;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--warn-bg);
  color: var(--text);
  border: 1px solid var(--warn);
}
.conteudo {
  padding: 28px 32px 48px;
  min-width: 0;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
    height: auto;
    gap: 12px;
    padding: 12px 16px;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  nav {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .grupo {
    display: contents;
  }
  .grupo-titulo {
    display: none;
  }
  .link {
    white-space: nowrap;
  }
  .conteudo {
    padding: 20px 16px 40px;
  }
}
</style>
