import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { definirAoPerderSessao } from '@/config'
import { useAuth } from '@/composables/useAuth'
import type { Role } from '@/types/api'

/**
 * Área de cada tela — espelha as permissões do backend (D7–D9):
 * - operacao: todos os perfis (bancada, catálogo, cadastro, histórico, ajuste)
 * - admin e dashboard: somente ADMIN
 * O backend recusa com 403 de qualquer forma; o guard só evita a tela vazia.
 */
export type Area = 'operacao' | 'admin' | 'dashboard'

declare module 'vue-router' {
  interface RouteMeta {
    titulo: string
    area?: Area
    /** Rótulo no menu lateral; ausente = tela não aparece no menu. */
    menu?: string
    /** Perfis com acesso; ausente = qualquer usuário logado. */
    perfis?: Role[]
    /** Acessível sem login. */
    publica?: boolean
  }
}

const SO_ADMIN: Role[] = ['ADMIN']

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'bancada' } },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { titulo: 'Entrar', publica: true },
  },

  // ---------- Operação (todos) ----------
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
  {
    // D8: AJUSTE é permitido a todos os perfis (o motivo continua obrigatório)
    path: '/ajuste',
    name: 'ajuste',
    component: () => import('@/views/operacao/AjusteView.vue'),
    meta: { titulo: 'Ajuste de estoque', area: 'operacao', menu: 'Ajuste de estoque' },
  },

  // ---------- Administração (ADMIN) ----------
  {
    path: '/admin/produtos/:id/editar',
    name: 'produto-editar',
    component: () => import('@/views/admin/ProdutoEditarView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { titulo: 'Editar produto', area: 'admin', perfis: SO_ADMIN },
  },
  {
    path: '/admin/unidades',
    name: 'unidades',
    component: () => import('@/views/admin/UnidadesView.vue'),
    meta: { titulo: 'Unidades de medida', area: 'admin', menu: 'Unidades de medida', perfis: SO_ADMIN },
  },
  {
    path: '/admin/usuarios',
    name: 'usuarios',
    component: () => import('@/views/admin/UsuariosView.vue'),
    meta: { titulo: 'Usuários', area: 'admin', menu: 'Usuários', perfis: SO_ADMIN },
  },

  // ---------- Dashboard (ADMIN, D7) ----------
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: { titulo: 'Dashboard', area: 'dashboard', menu: 'Indicadores', perfis: SO_ADMIN },
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'nao-encontrado',
    component: () => import('@/views/NaoEncontradoView.vue'),
    meta: { titulo: 'Página não encontrada' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/** Só aceita caminho interno no ?volta= (evita redirecionar para outro site). */
export function destinoSeguro(volta: unknown): string {
  return typeof volta === 'string' && volta.startsWith('/') && !volta.startsWith('//')
    ? volta
    : '/bancada'
}

router.beforeEach(async (to) => {
  document.title = `${to.meta.titulo} · Estoque Casa São José`
  const auth = useAuth()
  const usuario = await auth.carregar().catch(() => null)

  if (to.meta.publica) {
    return to.name === 'login' && usuario ? destinoSeguro(to.query.volta) : true
  }
  if (!usuario) return { name: 'login', query: { volta: to.fullPath } }
  if (to.meta.perfis && !to.meta.perfis.includes(usuario.role)) return { name: 'bancada' }
  return true
})

// F4.4: sessão expirada no meio da operação → login, e depois de volta à mesma tela
definirAoPerderSessao(() => {
  const atual = router.currentRoute.value
  useAuth().esquecer()
  if (!atual.meta.publica) router.replace({ name: 'login', query: { volta: atual.fullPath, expirou: '1' } })
})
