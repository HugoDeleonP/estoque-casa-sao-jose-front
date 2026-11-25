<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useUnidades } from '@/composables/useUnidades'
import { unidadeService } from '@/services'
import { GRANDEZAS, type Grandeza, type Unidade, type UnidadeInput } from '@/types/api'
import { errosDeCampo, mensagemDeErro } from '@/utils/erros'
import { formatarDecimal } from '@/utils/format'

const toast = useToast()
const { unidades, recarregar } = useUnidades()

const ROTULO: Record<Grandeza, { nome: string; base: string }> = {
  MASSA: { nome: 'Peso (massa)', base: 'kg' },
  VOLUME: { nome: 'Volume', base: 'L' },
  CONTAGEM: { nome: 'Contagem', base: 'un' },
}

const vazio = (): UnidadeInput => ({ sigla: '', nome: '', grandeza: 'MASSA', fator_base: 1 })
const form = reactive<UnidadeInput>(vazio())
const editando = ref<Unidade | null>(null)
const erros = ref<Record<string, string>>({})
const enviando = ref(false)
const excluindo = ref<number | null>(null)

/** F1.4: em unidade usada por produtos, só o nome pode mudar. */
const travada = computed(() => editando.value?.em_uso ?? false)
const exemplo = computed(() => {
  const base = ROTULO[form.grandeza].base
  return form.fator_base > 0 ? `1 ${form.sigla || '?'} = ${formatarDecimal(form.fator_base)} ${base}` : ''
})

function editar(u: Unidade) {
  editando.value = u
  Object.assign(form, { sigla: u.sigla, nome: u.nome, grandeza: u.grandeza, fator_base: u.fator_base })
  erros.value = {}
}

function cancelar() {
  editando.value = null
  Object.assign(form, vazio())
  erros.value = {}
}

async function salvar() {
  enviando.value = true
  erros.value = {}
  try {
    const dados = { ...form, sigla: form.sigla.trim(), nome: form.nome.trim() }
    if (editando.value) {
      await unidadeService.atualizar(editando.value.id, dados)
      toast.sucesso(`Unidade ${dados.sigla} atualizada`)
    } else {
      await unidadeService.criar(dados)
      toast.sucesso(`Unidade ${dados.sigla} criada: já aparece no cadastro de produtos`)
    }
    cancelar()
    await recarregar()
  } catch (e) {
    erros.value = errosDeCampo(e)
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}

async function excluir(u: Unidade) {
  excluindo.value = u.id
  try {
    await unidadeService.excluir(u.id)
    toast.sucesso(`Unidade ${u.sigla} excluída`)
    if (editando.value?.id === u.id) cancelar()
    await recarregar()
  } catch (e) {
    toast.erro(mensagemDeErro(e))
  } finally {
    excluindo.value = null
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Unidades de medida</h1>
        <p>
          Unidades do conteúdo das embalagens. O fator converte para a unidade base da grandeza (kg, L ou un), e o
          dashboard soma os totais com ele.
        </p>
      </div>
    </header>

    <form class="card stack" novalidate @submit.prevent="salvar">
      <h2>{{ editando ? `Editar ${editando.sigla}` : 'Nova unidade' }}</h2>
      <p v-if="travada" class="alert alert-warn">
        Esta unidade já é usada por produtos: só o nome pode ser alterado. Mudar a grandeza ou o fator alteraria
        os totais já registrados.
      </p>
      <div class="grade">
        <label class="field">
          <span>Sigla *</span>
          <input v-model="form.sigla" maxlength="10" placeholder="Ex.: fd" :readonly="travada" :aria-invalid="!!erros.sigla" />
          <small v-if="erros.sigla" class="erro">{{ erros.sigla }}</small>
        </label>
        <label class="field">
          <span>Nome *</span>
          <input v-model="form.nome" maxlength="40" placeholder="Ex.: fardo" :aria-invalid="!!erros.nome" />
          <small v-if="erros.nome" class="erro">{{ erros.nome }}</small>
        </label>
        <label class="field">
          <span>Grandeza *</span>
          <select v-model="form.grandeza" :disabled="travada">
            <option v-for="g in GRANDEZAS" :key="g" :value="g">{{ ROTULO[g].nome }}</option>
          </select>
        </label>
        <label class="field">
          <span>Fator para {{ ROTULO[form.grandeza].base }} *</span>
          <input
            v-model.number="form.fator_base"
            type="number"
            min="0"
            step="any"
            :readonly="travada"
            :aria-invalid="!!erros.fator_base"
          />
          <small v-if="erros.fator_base" class="erro">{{ erros.fator_base }}</small>
          <small v-else class="dica">{{ exemplo }}</small>
        </label>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary" :disabled="enviando">
          {{ enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar unidade' }}
        </button>
        <button v-if="editando" type="button" class="btn" @click="cancelar">Cancelar</button>
      </div>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sigla</th>
            <th>Nome</th>
            <th>Grandeza</th>
            <th class="num">Fator</th>
            <th>Uso</th>
            <th><span class="sr">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!unidades.length">
            <td colspan="6" class="vazio">Carregando…</td>
          </tr>
          <tr v-for="u in unidades" :key="u.id">
            <td><strong>{{ u.sigla }}</strong></td>
            <td>{{ u.nome }}</td>
            <td>{{ ROTULO[u.grandeza].nome }}</td>
            <td class="num">1 {{ u.sigla }} = {{ formatarDecimal(u.fator_base) }} {{ ROTULO[u.grandeza].base }}</td>
            <td class="muted">{{ u.em_uso ? 'Em uso' : 'Sem produtos' }}</td>
            <td>
              <div class="acoes">
                <button type="button" class="btn btn-sm" @click="editar(u)">Editar</button>
                <button
                  v-if="!u.em_uso"
                  type="button"
                  class="btn btn-sm btn-danger"
                  :disabled="excluindo === u.id"
                  @click="excluir(u)"
                >
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px 16px;
}
</style>
