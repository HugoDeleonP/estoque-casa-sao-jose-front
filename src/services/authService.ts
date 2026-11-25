import { API_ROUTES, request } from '@/config'
import type { LoginInput, Usuario } from '@/types/api'

const r = API_ROUTES.auth

export const authService = {
  login: (dados: LoginInput) => request<Usuario>(r.login, { body: dados }),
  logout: () => request<void>(r.logout),
  me: () => request<Usuario>(r.me),
}
