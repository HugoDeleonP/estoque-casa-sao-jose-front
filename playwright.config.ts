import { randomBytes } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'

/**
 * Teste ponta a ponta (F5.2): sobe a API real com o build do front (`npm run build` antes)
 * num banco temporário. Rodar: `npm run test:e2e`.
 */
const PORTA = Number(process.env.E2E_PORT ?? 8790)
process.env.E2E_SENHA ??= `e2e-${randomBytes(9).toString('hex')}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bash e2e/servidor.sh',
    url: `http://127.0.0.1:${PORTA}/api/health`,
    env: { E2E_PORT: String(PORTA), E2E_SENHA: process.env.E2E_SENHA },
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
