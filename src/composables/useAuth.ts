import { computed, ref } from 'vue'
import { ApiError } from '@/config'
import { authService } from '@/services'
import type { LoginInput, Usuario } from '@/types/api'

// Estado global: um único usuário logado por aba
const usuario = ref<Usuario | null>(null)
let verificacao: Promise<Usuario | null> | null = null

/** Consulta /auth/me uma vez (cookie HttpOnly: o front não enxerga a sessão diretamente). */
function carregar(): Promise<Usuario | null> {
  verificacao ??= authService
    .me()
    .then((u) => (usuario.value = u))
    .catch((e) => {
      verificacao = null
      if (e instanceof ApiError && e.naoAutenticado) return (usuario.value = null)
      throw e
    })
  return verificacao
}

async function entrar(dados: LoginInput) {
  usuario.value = await authService.login(dados)
  verificacao = Promise.resolve(usuario.value)
  return usuario.value
}

async function sair() {
  await authService.logout().catch(() => undefined)
  esquecer()
}

/** Sessão expirou no servidor: limpa o estado local sem chamar a API. */
function esquecer() {
  usuario.value = null
  verificacao = Promise.resolve(null)
}

export function useAuth() {
  return {
    usuario,
    isAdmin: computed(() => usuario.value?.role === 'ADMIN'),
    carregar,
    entrar,
    sair,
    esquecer,
  }
}
