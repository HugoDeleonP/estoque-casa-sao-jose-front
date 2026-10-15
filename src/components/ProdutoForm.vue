<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useCategorias } from '@/composables/useCategorias'
import type { Produto, ProdutoInput } from '@/types/api'
import { codigoValido, normalizarCodigo } from '@/utils/codigoBarras'

const props = defineProps<{
  /** Produto existente (edição) ou valores iniciais (cadastro). */
  inicial?: Partial<Produto>
  /** Erros por campo vindos da API (422). */
  erros?: Record<string, string>
  enviando?: boolean
  rotuloEnviar?: string
  /** Na bancada o código já veio do leitor e não deve ser alterado. */
  codigoTravado?: boolean
}>()

const emit = defineEmits<{ enviar: [dados: ProdutoInput]; cancelar: [] }>()

const { categorias } = useCategorias()

const form = reactive({
  codigo_barras: props.inicial?.codigo_barras ?? '',
  nome: props.inicial?.nome ?? '',
  marca: props.inicial?.marca ?? '',
  unidade: props.inicial?.unidade ?? '',
  categoria_id: props.inicial?.categoria?.id ?? 0,
})
const errosLocais = reactive<Record<string, string>>({})

watch(
  () => props.erros,
  (e) => {
    for (const k of Object.keys(errosLocais)) delete errosLocais[k]
    Object.assign(errosLocais, e ?? {})
  },
)

function enviar() {
  for (const k of Object.keys(errosLocais)) delete errosLocais[k]
  const codigo = normalizarCodigo(form.codigo_barras)
  // No MVP o código é obrigatório na API (decisão D7); produtos sem código ficam para o pós-MVP
  if (!codigo) errosLocais.codigo_barras = 'Informe o código de barras'
  else if (!codigoValido(codigo)) errosLocais.codigo_barras = 'Use apenas dígitos (8 a 14)'
  if (form.nome.trim().length < 2) errosLocais.nome = 'Informe ao menos 2 caracteres'
  if (!form.categoria_id) errosLocais.categoria_id = 'Selecione uma categoria'
  if (Object.keys(errosLocais).length) return

  emit('enviar', {
    codigo_barras: codigo,
    nome: form.nome.trim(),
    marca: form.marca.trim() || null,
    unidade: form.unidade.trim() || null,
    categoria_id: form.categoria_id,
  })
}
</script>

<template>
  <form class="produto-form" novalidate @submit.prevent="enviar">
    <label class="field">
      <span>Código de barras *</span>
      <input
        v-model="form.codigo_barras"
        class="mono"
        inputmode="numeric"
        autocomplete="off"
        maxlength="14"
        :readonly="codigoTravado"
        :aria-invalid="!!errosLocais.codigo_barras"
      />
      <small v-if="errosLocais.codigo_barras" class="erro">{{ errosLocais.codigo_barras }}</small>
    </label>

    <label class="field">
      <span>Nome *</span>
      <input v-model="form.nome" maxlength="120" placeholder="Ex.: Feijão carioca" :aria-invalid="!!errosLocais.nome" />
      <small v-if="errosLocais.nome" class="erro">{{ errosLocais.nome }}</small>
    </label>

    <label class="field">
      <span>Marca</span>
      <input v-model="form.marca" maxlength="80" placeholder="Ex.: Camil" />
    </label>

    <label class="field">
      <span>Unidade</span>
      <input v-model="form.unidade" maxlength="30" placeholder="Ex.: pacote 1 kg" />
      <small class="dica">Descritivo. O estoque conta embalagens.</small>
    </label>

    <label class="field">
      <span>Categoria *</span>
      <select v-model.number="form.categoria_id" :aria-invalid="!!errosLocais.categoria_id">
        <option :value="0" disabled>Selecione…</option>
        <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nome }}</option>
      </select>
      <small v-if="errosLocais.categoria_id" class="erro">{{ errosLocais.categoria_id }}</small>
    </label>

    <div class="botoes">
      <button type="submit" class="btn btn-primary" :disabled="enviando">
        {{ enviando ? 'Salvando…' : (rotuloEnviar ?? 'Salvar') }}
      </button>
      <button type="button" class="btn" @click="emit('cancelar')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.produto-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px 16px;
}
.botoes {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
