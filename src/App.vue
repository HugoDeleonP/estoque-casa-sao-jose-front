<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoBranco from '@/assets/logo-branco.png'
import SeletorTema from '@/components/SeletorTema.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useAuth } from '@/composables/useAuth'
import type { Area } from '@/router'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const GRUPOS: { area: Area; titulo: string }[] = [
  { area: 'operacao', titulo: 'Operação' },
  { area: 'admin', titulo: 'Administração' },
  { area: 'dashboard', titulo: 'Dashboard' },
]

// COMUM não vê os menus de dashboard, unidades e usuários (F3.10)
const menu = computed(() => {
  const role = auth.usuario.value?.role
  return GRUPOS.map((g) => ({
    ...g,
    // options.routes preserva a ordem de declaração (getRoutes() ordena por especificidade)
    itens: router.options.routes.filter(
      (r) => r.meta?.menu && r.meta.area === g.area && (!r.meta.perfis || (role && r.meta.perfis.includes(role))),
    ),
  })).filter((g) => g.itens.length)
})

async function sair() {
  await auth.sair()
  router.replace({ name: 'login' })
}
</script>

<template>
  <RouterView v-if="route.meta.publica || !auth.usuario.value" :key="route.path" />

  <div v-else class="shell">
    <aside class="sidebar">
      <RouterLink to="/" class="marca" aria-label="Casa São José — início">
        <img :src="logoBranco" alt="Hospital São José" width="177" height="60" />
        <small>Estoque de doações · Casa São José</small>
      </RouterLink>

      <nav aria-label="Principal">
        <div v-for="g in menu" :key="g.area" class="grupo">
          <p class="grupo-titulo">{{ g.titulo }}</p>
          <RouterLink v-for="r in g.itens" :key="r.path" :to="r.path" class="link">
            {{ r.meta?.menu }}
          </RouterLink>
        </div>
      </nav>

      <div class="usuario">
        <p>
          <strong>{{ auth.usuario.value?.nome }}</strong>
          <small>{{ auth.isAdmin.value ? 'Voluntário chefe (ADMIN)' : 'Voluntário (COMUM)' }}</small>
        </p>
        <div class="botoes-usuario">
          <button type="button" class="sair" @click="sair">Sair</button>
          <SeletorTema class="tema" />
        </div>
      </div>
    </aside>

    <main class="conteudo">
      <RouterView :key="route.path" />
    </main>
  </div>

  <ToastContainer />
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 252px 1fr;
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
  background: var(--header-bg);
  color: var(--header-text);
  overflow-y: auto;
}
.marca {
  display: grid;
  gap: 8px;
  text-decoration: none;
  color: var(--header-text);
}
.marca img {
  width: 177px;
  height: auto;
}
.marca small {
  display: block;
  color: var(--header-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
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
  letter-spacing: var(--tracking);
  color: var(--header-text-2);
  padding: 0 10px 4px;
}
.link {
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  color: var(--header-text);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9375rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking);
}
.link:hover {
  background: var(--header-hover);
}
.link.router-link-active {
  background: #ffffff;
  color: #482583;
  font-weight: 600;
}
.link:focus-visible,
.sair:focus-visible {
  outline-color: #ffffff;
}
.usuario {
  margin-top: auto;
  display: grid;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgb(255 255 255 / 0.2);
}
.usuario small {
  display: block;
  color: var(--header-text-2);
  font-size: 0.8125rem;
}
.sair {
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking);
  justify-self: start;
  min-height: 36px;
  padding: 4px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgb(255 255 255 / 0.5);
  background: transparent;
  color: var(--header-text);
  cursor: pointer;
}
.botoes-usuario {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tema {
  color: var(--header-text);
  border-color: rgb(255 255 255 / 0.5);
}
.tema:focus-visible {
  outline-color: #ffffff;
}
.sair:hover {
  background: var(--header-hover);
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
  }
  .marca img {
    width: 130px;
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
  .usuario {
    grid-template-columns: 1fr auto;
    align-items: center;
    padding-top: 8px;
  }
  .conteudo {
    padding: 20px 16px 40px;
  }
}
</style>
