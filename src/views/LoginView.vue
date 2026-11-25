<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoBranco from '@/assets/logo-branco.png'
import logoRoxo from '@/assets/logo-roxo.png'
import SeletorTema from '@/components/SeletorTema.vue'
import { useAuth } from '@/composables/useAuth'
import { useTema } from '@/composables/useTema'
import { destinoSeguro } from '@/router'
import { mensagemDeErro } from '@/utils/erros'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { escuro } = useTema()

const email = ref('')
const senha = ref('')
const erro = ref('')
const enviando = ref(false)
const campoEmail = ref<HTMLInputElement>()

const expirou = route.query.expirou === '1'

onMounted(() => campoEmail.value?.focus())

async function entrar() {
  if (!email.value.trim() || !senha.value) {
    erro.value = 'Informe e-mail e senha'
    return
  }
  enviando.value = true
  erro.value = ''
  try {
    await auth.entrar({ email: email.value.trim(), senha: senha.value })
    router.replace(destinoSeguro(route.query.volta))
  } catch (e) {
    erro.value = mensagemDeErro(e)
    senha.value = ''
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="login">
    <SeletorTema class="tema" />
    <form class="card" novalidate @submit.prevent="entrar">
      <img :src="escuro ? logoBranco : logoRoxo" alt="Hospital São José" class="logo" width="236" height="80" />
      <div>
        <h1>Estoque de doações</h1>
        <p class="muted">Casa São José</p>
      </div>

      <p v-if="expirou && !erro" class="alert alert-warn">Sua sessão expirou. Entre novamente para continuar.</p>
      <p v-if="erro" class="alert alert-danger" role="alert">{{ erro }}</p>

      <label class="field">
        <span>E-mail</span>
        <input ref="campoEmail" v-model="email" type="email" autocomplete="username" inputmode="email" />
      </label>
      <label class="field">
        <span>Senha</span>
        <input v-model="senha" type="password" autocomplete="current-password" />
      </label>
      <button type="submit" class="btn btn-primary" :disabled="enviando">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>
      <p class="small muted">Esqueceu a senha? Peça ao voluntário chefe para redefini-la.</p>
    </form>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: linear-gradient(160deg, var(--cor-primaria-clara), var(--bg) 60%);
}
.card {
  width: min(400px, 100%);
  display: grid;
  gap: 16px;
  padding: 28px;
}
.logo {
  width: 236px;
  height: auto;
  justify-self: center;
}
.tema {
  position: fixed;
  top: 16px;
  right: 16px;
  color: var(--text-2);
}
h1 {
  font-size: 1.25rem;
}
.btn {
  min-height: 48px;
}
</style>
