<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useCategorias } from '@/composables/useCategorias'
import { useUnidades } from '@/composables/useUnidades'
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
const { unidades } = useUnidades()

// Lembra a última unidade usada: no cadastro por bip o voluntário só digita o número
const CHAVE_UNIDADE = 'csj.ultima-unidade'
function ultimaUnidade(): number {
  try {
    return Number(localStorage.getItem(CHAVE_UNIDADE)) || 0
  } catch {
    return 0
  }
}

const form = reactive({
  codigo_barras: props.inicial?.codigo_barras ?? '',
  nome: props.inicial?.nome ?? '',
  marca: props.inicial?.marca ?? '',
  conteudo_valor: (props.inicial?.conteudo_valor ?? '') as number | '',
  unidade_medida_id: props.inicial?.unidade_medida?.id ?? ultimaUnidade(),
  categoria_id: props.inicial?.categoria?.id ?? 0,
})

// Sem unidade lembrada (ou excluída): cai em "un" quando a lista chegar
watch(
  unidades,
  (lista) => {
    if (lista.length && !lista.some((u) => u.id === form.unidade_medida_id)) {
      form.unidade_medida_id = lista.find((u) => u.sigla === 'un')?.id ?? lista[0]!.id
    }
  },
  { immediate: true },
)

const GRUPO: Record<string, string> = { MASSA: 'Peso', VOLUME: 'Volume', CONTAGEM: 'Contagem' }
const unidadesPorGrandeza = computed(() =>
  Object.entries(GRUPO)
    .map(([g, rotulo]) => ({ rotulo, itens: unidades.value.filter((u) => u.grandeza === g) }))
    .filter((g) => g.itens.length),
)
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
  // D5: conteúdo obrigatório e maior que zero
  if (form.conteudo_valor === '' || !(Number(form.conteudo_valor) > 0)) {
    errosLocais.conteudo_valor = 'Informe quanto vem em cada embalagem (maior que zero)'
  }
  if (!form.unidade_medida_id) errosLocais.unidade_medida_id = 'Selecione a unidade'
  if (!form.categoria_id) errosLocais.categoria_id = 'Selecione uma categoria'
  if (Object.keys(errosLocais).length) return

  emit('enviar', {
    codigo_barras: codigo,
    nome: form.nome.trim(),
    marca: form.marca.trim() || null,
    conteudo_valor: Number(form.conteudo_valor),
    unidade_medida_id: form.unidade_medida_id,
    categoria_id: form.categoria_id,
  })
  try {
    localStorage.setItem(CHAVE_UNIDADE, String(form.unidade_medida_id))
  } catch {
    // armazenamento indisponível: só não lembra a unidade
  }
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

    <div class="field conteudo">
      <span id="rotulo-conteudo">Conteúdo da embalagem *</span>
      <div class="par" role="group" aria-labelledby="rotulo-conteudo">
        <input
          v-model.number="form.conteudo_valor"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="Ex.: 5"
          aria-label="Quantidade em cada embalagem"
          :aria-invalid="!!errosLocais.conteudo_valor"
        />
        <select
          v-model.number="form.unidade_medida_id"
          aria-label="Unidade de medida"
          :aria-invalid="!!errosLocais.unidade_medida_id"
        >
          <option :value="0" disabled>Unidade…</option>
          <optgroup v-for="g in unidadesPorGrandeza" :key="g.rotulo" :label="g.rotulo">
            <option v-for="u in g.itens" :key="u.id" :value="u.id">{{ u.sigla }} ({{ u.nome }})</option>
          </optgroup>
        </select>
      </div>
      <small v-if="errosLocais.conteudo_valor" class="erro">{{ errosLocais.conteudo_valor }}</small>
      <small v-else-if="errosLocais.unidade_medida_id" class="erro">{{ errosLocais.unidade_medida_id }}</small>
      <small v-else class="dica">Ex.: pacote de arroz = 5 kg. O estoque conta embalagens.</small>
    </div>

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
.par {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 8px;
}
.botoes {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
