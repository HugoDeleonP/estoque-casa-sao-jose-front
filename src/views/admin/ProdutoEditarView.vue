<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProdutoForm from '@/components/ProdutoForm.vue'
import SaldoBadge from '@/components/SaldoBadge.vue'
import { useToast } from '@/composables/useToast'
import { produtoService } from '@/services'
import type { Produto, ProdutoInput } from '@/types/api'
import { errosDeCampo, mensagemDeErro } from '@/utils/erros'
import { descricaoProduto, formatarDataHora } from '@/utils/format'

const props = defineProps<{ id: number }>()

const router = useRouter()
const toast = useToast()

const produto = ref<Produto | null>(null)
const erroCarga = ref('')
const erros = ref<Record<string, string>>({})
const enviando = ref(false)
const confirmandoExclusao = ref(false)
const excluindo = ref(false)

onMounted(async () => {
  try {
    produto.value = await produtoService.buscar(props.id)
  } catch (e) {
    erroCarga.value = mensagemDeErro(e)
  }
})

async function salvar(dados: ProdutoInput) {
  enviando.value = true
  erros.value = {}
  try {
    produto.value = await produtoService.atualizar(props.id, dados)
    toast.sucesso('Alterações salvas')
    router.push({ name: 'catalogo' })
  } catch (e) {
    erros.value = errosDeCampo(e)
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}

async function excluir() {
  excluindo.value = true
  try {
    await produtoService.excluir(props.id)
    toast.sucesso(`${descricaoProduto(produto.value!)} excluído do catálogo`)
    router.push({ name: 'catalogo' })
  } catch (e) {
    toast.erro(mensagemDeErro(e))
    confirmandoExclusao.value = false
  } finally {
    excluindo.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Editar produto</h1>
        <p v-if="produto">
          Cadastrado em {{ formatarDataHora(produto.created_at) }} · atualizado em
          {{ formatarDataHora(produto.updated_at) }}
        </p>
      </div>
    </header>

    <p v-if="erroCarga" class="alert alert-danger">{{ erroCarga }}</p>
    <p v-else-if="!produto" class="muted">Carregando…</p>

    <template v-else>
      <section class="card">
        <ProdutoForm :inicial="produto" :erros="erros" :enviando="enviando" @enviar="salvar" @cancelar="router.back()" />
      </section>

      <section class="card zona-perigo">
        <h2>Excluir produto</h2>
        <p class="muted">
          O produto sai do catálogo, mas o histórico de movimentações é mantido. Se o código for lido de novo, a
          Bancada oferece a reativação.
        </p>
        <p>Saldo atual: <SaldoBadge :saldo="produto.saldo" /></p>

        <template v-if="produto.saldo !== 0">
          <p class="alert alert-warn">
            Só é possível excluir com saldo zero. Registre um ajuste para zerar o estoque antes.
          </p>
          <div>
            <RouterLink :to="{ name: 'ajuste', query: { produto_id: produto.id } }" class="btn">
              Ir para ajuste de estoque
            </RouterLink>
          </div>
        </template>
        <div v-else class="row">
          <button v-if="!confirmandoExclusao" type="button" class="btn btn-danger" @click="confirmandoExclusao = true">
            Excluir produto
          </button>
          <template v-else>
            <button type="button" class="btn btn-danger" :disabled="excluindo" @click="excluir">
              {{ excluindo ? 'Excluindo…' : 'Confirmar exclusão' }}
            </button>
            <button type="button" class="btn" @click="confirmandoExclusao = false">Cancelar</button>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.zona-perigo {
  display: grid;
  gap: 12px;
  border-color: var(--danger);
}
</style>
