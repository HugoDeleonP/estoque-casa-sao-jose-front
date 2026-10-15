<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProdutoForm from '@/components/ProdutoForm.vue'
import { useToast } from '@/composables/useToast'
import { produtoService } from '@/services'
import type { ProdutoInput } from '@/types/api'
import { errosDeCampo, mensagemDeErro } from '@/utils/erros'
import { descricaoProduto } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const codigoInicial = typeof route.query.codigo === 'string' ? route.query.codigo : ''
const erros = ref<Record<string, string>>({})
const enviando = ref(false)

async function salvar(dados: ProdutoInput) {
  enviando.value = true
  erros.value = {}
  try {
    const produto = await produtoService.cadastrar(dados)
    toast.sucesso(`Produto cadastrado: ${descricaoProduto(produto)}`)
    router.push({ name: 'catalogo' })
  } catch (e) {
    erros.value = errosDeCampo(e)
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Cadastrar produto</h1>
        <p>O saldo começa em zero. Registre a entrada pela Bancada.</p>
      </div>
    </header>
    <section class="card">
      <ProdutoForm
        :inicial="{ codigo_barras: codigoInicial }"
        :erros="erros"
        :enviando="enviando"
        rotulo-enviar="Cadastrar"
        @enviar="salvar"
        @cancelar="router.back()"
      />
    </section>
  </div>
</template>
