import { expect, type Page, test } from '@playwright/test'

const SENHA = process.env.E2E_SENHA!
const CODIGO = '7891000315507'

/** O leitor HID "digita" os 13 dígitos em poucos milissegundos e envia Enter. */
async function bipar(page: Page, codigo: string) {
  await page.keyboard.type(codigo, { delay: 5 })
  await page.keyboard.press('Enter')
}

async function entrar(page: Page, email: string) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/bancada/)
}

test('login → bip de produto novo → cadastro → entrada → dashboard', async ({ page }) => {
  await entrar(page, 'chefe@e2e.local')
  const leitor = page.getByPlaceholder('Aguardando leitura…')
  await expect(leitor).toBeFocused()

  // 1º bip: produto desconhecido abre o cadastro
  await bipar(page, CODIGO)
  await expect(page.getByRole('heading', { name: 'Produto novo' })).toBeVisible()
  await page.getByPlaceholder('Ex.: Feijão carioca').fill('Feijão carioca')
  await page.getByLabel('Quantidade em cada embalagem').fill('1')
  await page.getByLabel('Unidade de medida').selectOption({ label: 'kg (quilograma)' })
  await page.locator('select').filter({ hasText: 'Selecione…' }).selectOption({ label: 'Alimentos' })
  await page.getByRole('button', { name: 'Cadastrar e registrar' }).click()

  const sessao = page.locator('section', { hasText: 'Leituras desta sessão' })
  await expect(sessao.getByRole('row')).toHaveCount(2) // cabeçalho + 1 leitura

  // Foco volta ao leitor sozinho; 2º bip registra direto. Bip duplo (< 300 ms) é descartado.
  await expect(leitor).toBeFocused()
  await bipar(page, CODIGO)
  await bipar(page, CODIGO)
  await expect(sessao.getByRole('row')).toHaveCount(3)
  await page.waitForTimeout(400)
  await expect(sessao.getByRole('row')).toHaveCount(3)
  await expect(sessao.getByRole('row').nth(1)).toContainText('+1')

  // RNF03: bip → tela medido no navegador
  const tempos = await page.evaluate(() => (window as unknown as { __medicoesBancada: number[] }).__medicoesBancada)
  console.log(`Tempo bip → tela (ms): ${tempos.join(', ')}`)
  expect(Math.max(...tempos)).toBeLessThan(2000)

  // Dashboard com os dados reais: 2 embalagens de 1 kg
  await page.getByRole('link', { name: 'Indicadores' }).click()
  const saldo = page.locator('.kpi', { hasText: 'Saldo em estoque' })
  await expect(saldo).toContainText('2')
  await expect(page.locator('.kpi', { hasText: 'Peso em estoque' })).toContainText('2kg')
  await expect(page.locator('.kpi', { hasText: 'Entradas (doações)' })).toContainText('2')
})

test('perfil COMUM não vê nem acessa o dashboard', async ({ page }) => {
  await entrar(page, 'bancada@e2e.local')
  await expect(page.getByRole('link', { name: 'Indicadores' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/bancada/)
  expect((await page.request.get('/api/dashboard/resumo')).status()).toBe(403)
})

test('falha de rede mostra "Não registrado — leia novamente"', async ({ page }) => {
  await entrar(page, 'bancada@e2e.local')
  await page.route('**/api/produtos/codigo/**', (r) => r.abort('internetdisconnected'))
  await bipar(page, CODIGO)
  await expect(page.getByRole('alert')).toContainText('Não registrado — leia novamente')
})

test('medição RNF03: 20 bips seguidos (bip → tela)', async ({ page }) => {
  await entrar(page, 'chefe@e2e.local')
  await expect(page.getByPlaceholder('Aguardando leitura…')).toBeFocused()
  for (let i = 0; i < 20; i++) {
    await bipar(page, CODIGO)
    await page.waitForTimeout(350) // acima da janela de bip duplicado (300 ms)
  }
  const sessao = page.locator('section', { hasText: 'Leituras desta sessão' })
  await expect(sessao.getByRole('row')).toHaveCount(16) // a tabela mostra as 15 últimas
  const t = await page.evaluate(() => (window as unknown as { __medicoesBancada: number[] }).__medicoesBancada)
  const ord = [...t].sort((a, b) => a - b)
  const mediana = ord[Math.floor(ord.length / 2)]!
  const p95 = ord[Math.ceil(ord.length * 0.95) - 1]!
  console.log(`RNF03 — ${t.length} bips: mín ${ord[0]} ms · mediana ${mediana} ms · p95 ${p95} ms · máx ${ord.at(-1)} ms`)
  expect(t).toHaveLength(20)
  expect(p95).toBeLessThan(2000)
})
