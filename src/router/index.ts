import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * Área de permissão de cada tela — espelha os três routers do backend.
 * Pós-MVP (RF07): o guard abaixo consulta o perfil do usuário e bloqueia
 * 'admin' e 'dashboard' para o perfil COMUM, sem alterar as rotas.
 */
export type Area = 'operacao' | 'admin' | 'dashboard'

declare module 'vue-router' {
  interface RouteMeta {
    titulo: string
    area: Area
    /** Rótulo no menu lateral; ausente = tela não aparece no menu. */
    menu?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'bancada' } },

  // ---------- Operação ----------
  {
    path: '/bancada',
    name: 'bancada',
    component: () => import('@/views/operacao/BancadaView.vue'),
    meta: { titulo: 'Bancada', area: 'operacao', menu: 'Bancada (leitor)' },
  },
  {
    path: '/catalogo',
    name: 'catalogo',
    component: () => import('@/views/operacao/CatalogoView.vue'),
    meta: { titulo: 'Catálogo', area: 'operacao', menu: 'Catálogo' },
  },
  {
    path: '/catalogo/novo',
    name: 'produto-novo',
    component: () => import('@/views/operacao/ProdutoNovoView.vue'),
    meta: { titulo: 'Novo produto', area: 'operacao', menu: 'Cadastrar produto' },
  },
  {
    path: '/movimentacoes',
    name: 'movimentacoes',
    component: () => import('@/views/operacao/MovimentacoesView.vue'),
    meta: { titulo: 'Histórico', area: 'operacao', menu: 'Histórico' },
  },

  // ---------- Administração ----------
  {
    path: '/admin/ajuste',
    name: 'ajuste',
    component: () => import('@/views/admin/AjusteView.vue'),
    meta: { titulo: 'Ajuste de estoque', area: 'admin', menu: 'Ajuste de estoque' },
  },
  {
    path: '/admin/produtos/:id/editar',
    name: 'produto-editar',
    component: () => import('@/views/admin/ProdutoEditarView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { titulo: 'Editar produto', area: 'admin' },
  },

  // ---------- Dashboard ----------
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: { titulo: 'Dashboard', area: 'dashboard', menu: 'Indicadores' },
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'nao-encontrado',
    component: () => import('@/views/NaoEncontradoView.vue'),
    meta: { titulo: 'Página não encontrada', area: 'operacao' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  // Pós-MVP: if (!podeAcessar(usuario, to.meta.area)) return { name: 'bancada' }
  document.title = `${to.meta.titulo} · Estoque Casa São José`
})
