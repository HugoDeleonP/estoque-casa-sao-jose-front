<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { usuarioService } from '@/services'
import { ROLES, type Role, type Usuario, type UsuarioInput } from '@/types/api'
import { errosDeCampo, mensagemDeErro } from '@/utils/erros'
import { formatarDataHora } from '@/utils/format'

const toast = useToast()
const { usuario: eu } = useAuth()

const PERFIL: Record<Role, string> = { ADMIN: 'Voluntário chefe (ADMIN)', COMUM: 'Voluntário (COMUM)' }
const SENHA_MIN = 8

const usuarios = ref<Usuario[]>([])
const carregando = ref(true)
const vazio = (): UsuarioInput => ({ nome: '', email: '', senha: '', role: 'COMUM' })
const form = reactive<UsuarioInput>(vazio())
const erros = ref<Record<string, string>>({})
const enviando = ref(false)

/** Linha com ação em andamento: troca de senha ou confirmação de desativação. */
const senhaPara = ref<number | null>(null)
const novaSenha = ref('')
const desativarId = ref<number | null>(null)
const ocupado = ref<number | null>(null)

async function carregar() {
  carregando.value = true
  try {
    usuarios.value = await usuarioService.listar()
  } catch (e) {
    toast.erro(mensagemDeErro(e))
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

async function criar() {
  erros.value = {}
  if (form.senha.length < SENHA_MIN) {
    erros.value = { senha: `Mínimo de ${SENHA_MIN} caracteres` }
    return
  }
  enviando.value = true
  try {
    const novo = await usuarioService.criar({ ...form, nome: form.nome.trim(), email: form.email.trim() })
    toast.sucesso(`Usuário ${novo.nome} criado. Entregue a senha pessoalmente.`)
    Object.assign(form, vazio())
    await carregar()
  } catch (e) {
    erros.value = errosDeCampo(e)
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}

async function acao(id: number, fn: () => Promise<unknown>, sucesso: string) {
  ocupado.value = id
  try {
    await fn()
    toast.sucesso(sucesso)
    await carregar()
    return true
  } catch (e) {
    toast.erro(mensagemDeErro(e))
    return false
  } finally {
    ocupado.value = null
  }
}

function alterarPerfil(u: Usuario, role: Role) {
  acao(u.id, () => usuarioService.alterarPerfil(u.id, role), `${u.nome} agora é ${PERFIL[role]}`)
}

async function salvarSenha(u: Usuario) {
  if (novaSenha.value.length < SENHA_MIN) {
    toast.erro(`A senha precisa ter ao menos ${SENHA_MIN} caracteres`)
    return
  }
  const ok = await acao(u.id, () => usuarioService.redefinirSenha(u.id, novaSenha.value), `Senha de ${u.nome} redefinida`)
  if (ok) {
    senhaPara.value = null
    novaSenha.value = ''
  }
}

async function desativar(u: Usuario) {
  await acao(u.id, () => usuarioService.desativar(u.id), `${u.nome} desativado`)
  desativarId.value = null
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Usuários</h1>
        <p>Quem pode entrar no sistema. Voluntário chefe (ADMIN) vê o dashboard e administra; voluntário (COMUM) opera a bancada.</p>
      </div>
    </header>

    <form class="card stack" novalidate @submit.prevent="criar">
      <h2>Novo usuário</h2>
      <div class="grade">
        <label class="field">
          <span>Nome *</span>
          <input v-model="form.nome" maxlength="120" autocomplete="off" :aria-invalid="!!erros.nome" />
          <small v-if="erros.nome" class="erro">{{ erros.nome }}</small>
        </label>
        <label class="field">
          <span>E-mail *</span>
          <input v-model="form.email" type="email" maxlength="254" autocomplete="off" :aria-invalid="!!erros.email" />
          <small v-if="erros.email" class="erro">{{ erros.email }}</small>
        </label>
        <label class="field">
          <span>Senha inicial *</span>
          <input v-model="form.senha" type="password" autocomplete="new-password" :aria-invalid="!!erros.senha" />
          <small v-if="erros.senha" class="erro">{{ erros.senha }}</small>
          <small v-else class="dica">Mínimo de {{ SENHA_MIN }} caracteres</small>
        </label>
        <label class="field">
          <span>Perfil *</span>
          <select v-model="form.role">
            <option v-for="r in ROLES" :key="r" :value="r">{{ PERFIL[r] }}</option>
          </select>
        </label>
      </div>
      <div>
        <button type="submit" class="btn btn-primary" :disabled="enviando">
          {{ enviando ? 'Criando…' : 'Criar usuário' }}
        </button>
      </div>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Desde</th>
            <th><span class="sr">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="carregando && !usuarios.length">
            <td colspan="5" class="vazio">Carregando…</td>
          </tr>
          <template v-for="u in usuarios" :key="u.id">
            <tr>
              <td>
                <strong>{{ u.nome }}</strong>
                <span v-if="u.id === eu?.id" class="muted"> (você)</span>
              </td>
              <td>{{ u.email }}</td>
              <td>
                <select
                  :value="u.role"
                  :disabled="u.id === eu?.id || ocupado === u.id"
                  :aria-label="`Perfil de ${u.nome}`"
                  :title="u.id === eu?.id ? 'Você não pode alterar o próprio perfil' : undefined"
                  @change="alterarPerfil(u, ($event.target as HTMLSelectElement).value as Role)"
                >
                  <option v-for="r in ROLES" :key="r" :value="r">{{ PERFIL[r] }}</option>
                </select>
              </td>
              <td class="muted small">{{ formatarDataHora(u.created_at) }}</td>
              <td>
                <div class="acoes">
                  <button type="button" class="btn btn-sm" @click="senhaPara = senhaPara === u.id ? null : u.id">
                    Redefinir senha
                  </button>
                  <template v-if="u.id !== eu?.id">
                    <button
                      v-if="desativarId !== u.id"
                      type="button"
                      class="btn btn-sm btn-danger"
                      @click="desativarId = u.id"
                    >
                      Desativar
                    </button>
                    <template v-else>
                      <button type="button" class="btn btn-sm btn-danger" :disabled="ocupado === u.id" @click="desativar(u)">
                        Confirmar
                      </button>
                      <button type="button" class="btn btn-sm" @click="desativarId = null">Cancelar</button>
                    </template>
                  </template>
                </div>
              </td>
            </tr>
            <tr v-if="senhaPara === u.id" class="linha-senha">
              <td colspan="5">
                <form class="row" @submit.prevent="salvarSenha(u)">
                  <label class="field">
                    <span>Nova senha para {{ u.nome }}</span>
                    <input v-model="novaSenha" type="password" autocomplete="new-password" />
                  </label>
                  <button type="submit" class="btn btn-primary" :disabled="ocupado === u.id">Salvar senha</button>
                  <button type="button" class="btn" @click="senhaPara = null">Cancelar</button>
                </form>
                <p class="small muted">As sessões abertas desse usuário serão encerradas.</p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px 16px;
}
td select {
  min-width: 220px;
}
.linha-senha td {
  background: var(--cor-primaria-clara);
}
</style>
