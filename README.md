# Frontend — Estoque de Doações (Casa São José)

Vue 3 + Vite + TypeScript, vue-router e Chart.js.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173 — usa dados fictícios por padrão
npm run build    # gera dist/, servido pelo FastAPI em produção
```

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `VITE_API_MOCK` | `true` em dev, `false` no build | `true` = dados em memória (`src/mocks`), sem backend |
| `VITE_API_BASE_URL` | `/api` | Prefixo das rotas |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Para onde o Vite repassa `/api` em dev (sem CORS) |
| `VITE_API_TIMEOUT_MS` | `8000` | Tempo máximo por requisição |

**Conectar à API real:** crie `.env.development.local` com `VITE_API_MOCK=false` e suba o backend
(`uv run estoque-doacoes`). Nenhum código muda.

## Estrutura

```
src/
├── config/          # ← ponto único de integração com a API
│   ├── env.ts         variáveis de ambiente tipadas
│   ├── api-routes.ts  TODAS as rotas (método + caminho); `pendente: true` = ainda não existe no backend
│   └── http.ts        fetch + timeout + ApiError (formato ErroResposta do backend)
├── types/api.ts     # espelho dos DTOs do backend
├── services/        # uma função por rota: produtoService.buscarPorCodigo(...)
├── mocks/           # mesmas rotas e regras (404/409/422) em memória
├── router/          # telas, com meta.area = operacao | admin | dashboard (pronto para RBAC)
├── composables/     # useToast (alertas não bloqueantes), useCategorias
├── components/      # ProdutoForm, SaldoBadge, TipoBadge, KpiCard, ToastContainer
└── views/
    ├── operacao/    Bancada (leitor), Catálogo, Cadastrar produto, Histórico
    ├── admin/       Ajuste de estoque, Editar/Excluir produto
    └── dashboard/   Indicadores (KPIs, gráfico, pendências de saldo negativo)
```

Fluxo: **view → service → `request(API_ROUTES.x.y)` → API ou mock**. Uma view nunca escreve um caminho HTTP.

## Rotas que o front já usa e o backend ainda não tem

| Rota | Uso |
| --- | --- |
| `GET /api/produtos/excluidos/codigo/{codigo}` | Bancada: detectar produto excluído e oferecer reativação (RN09) |
| `POST /api/produtos/{id}/reativar` | Desfazer o soft delete (RF08) |
| `GET /api/dashboard/resumo?categoria_id=&dias=` | KPIs (RF04) |
| `GET /api/dashboard/pendencias?categoria_id=` | Produtos com saldo negativo (RN07) |
| `GET /api/dashboard/serie?categoria_id=&dias=` | Entradas/saídas por dia |

Contratos de resposta em `src/types/api.ts`; a implementação de referência está em `src/mocks/adapter.ts`.
