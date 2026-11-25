# Frontend — Estoque de Doações (Casa São José)

Telas do sistema de gestão e rastreabilidade de doações da Casa São José: bancada com leitor
óptico, catálogo, histórico, ajustes e, para o voluntário chefe, dashboard, unidades de
medida e usuários.

Vue 3 + Vite + TypeScript, vue-router e Chart.js. API:
[estoque-casa-sao-jose-backend](https://github.com/HugoDeleonP/estoque-casa-sao-jose-backend)
— **a documentação completa (arquitetura, API, deploy, manual do usuário) está em
[`docs/` do backend](https://github.com/HugoDeleonP/estoque-casa-sao-jose-backend/tree/main/docs).**

## Rodar localmente

Requer o backend rodando em `http://127.0.0.1:8000` (ver README do backend) e um usuário
criado com `criar_admin`.

```bash
npm ci
npm run dev      # http://localhost:5173 — o Vite repassa /api para o backend (sem CORS)
npm run build    # gera dist/ (servido pelo Caddy em produção)
```

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Prefixo das rotas; relativo de propósito (mesmo domínio = cookie de sessão) |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Para onde o Vite repassa `/api` em dev |
| `VITE_API_TIMEOUT_MS` | `8000` | Tempo máximo por requisição |

Não há mais modo de dados fictícios: todas as telas usam a API real.

## Testar

```bash
npx vue-tsc -b                         # tipos
npm run build && npm run test:e2e      # ponta a ponta (Playwright)
```

O teste ponta a ponta sobe a API real (repositório do backend ao lado, `../estoque-casa-sao-jose-backend`)
num banco temporário e simula o leitor: digita 13 dígitos rapidamente + `Enter`. Cobre login →
bip de produto novo → cadastro → entrada → bip duplo descartado → dashboard, o bloqueio do
perfil COMUM e a mensagem de falha de rede. Também mede o tempo bip → tela (RNF03). Na
primeira vez: `npx playwright install --with-deps chromium`.

## Implantação

O build pronto é publicado na branch **`deploy`** deste repositório (só o `dist/`); a EC2
clona essa branch e não precisa de Node. Para publicar uma versão nova:

```bash
npm ci && npm run build
# publicar dist/ na branch deploy (ver docs/deploy-aws.md no backend)
```

## Estrutura

```
src/
├── config/          # ← ponto único de integração com a API
│   ├── env.ts         variáveis de ambiente tipadas
│   ├── api-routes.ts  TODAS as rotas (método + caminho)
│   └── http.ts        fetch + timeout + ApiError; 401 → login e volta à tela
├── types/api.ts     # espelho dos DTOs do backend
├── services/        # uma função por rota
├── router/          # rotas com meta.perfis; guarda de login e de perfil
├── composables/     # useAuth, useCategorias, useUnidades, useToast
├── components/      # ProdutoForm, SaldoBadge, TipoBadge, KpiCard, ToastContainer
├── assets/          # logos (roxo e branco)
└── views/
    ├── LoginView.vue
    ├── operacao/    Bancada (leitor), Catálogo, Cadastrar produto, Histórico, Ajuste
    ├── admin/       Editar produto, Unidades de medida, Usuários (ADMIN)
    └── dashboard/   Indicadores (ADMIN)
```

Fluxo: **view → service → `request(API_ROUTES.x.y)` → API**. Uma view nunca escreve um caminho HTTP.
O backend confere o perfil em toda rota; o front só esconde o que o perfil não usa.

## Identidade visual

Roxo `#482583` (amostrado do logo), lilás `#E9E2F3` em fundos, magenta só em destaques e na
série "saídas". Alertas usam verde/âmbar/vermelho, independentes da marca. Montserrat
empacotada (sem CDN). Caixa alta só em títulos, menus, rótulos e botões. Tokens em
`src/style.css`. Logo atual: Hospital São José (pendente: logo próprio da Casa, se existir).
