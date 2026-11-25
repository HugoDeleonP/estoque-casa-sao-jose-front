import { API_ROUTES, request } from '@/config'
import type { Role, Usuario, UsuarioInput } from '@/types/api'

const r = API_ROUTES.usuarios

export const usuarioService = {
  listar: () => request<Usuario[]>(r.listar),
  criar: (dados: UsuarioInput) => request<Usuario>(r.criar, { body: dados }),
  alterarPerfil: (id: number, role: Role) =>
    request<Usuario>(r.alterarPerfil, { params: { id }, body: { role } }),
  redefinirSenha: (id: number, senha: string) =>
    request<void>(r.redefinirSenha, { params: { id }, body: { senha } }),
  desativar: (id: number) => request<void>(r.desativar, { params: { id } }),
}
