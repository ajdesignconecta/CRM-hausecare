# Scalability and Route Contract

## Objetivo

Este documento consolida decisões de arquitetura para suportar picos de carga (meta: ~1000 usuários concorrentes) no fluxo:

- Frontend Next.js
- Backend Fastify
- Supabase Postgres

## Backend hardening aplicado

- Pool do Postgres configurável por ambiente:
  - `DB_POOL_MAX`
  - `DB_POOL_IDLE_TIMEOUT_MS`
  - `DB_POOL_CONNECTION_TIMEOUT_MS`
  - `DB_POOL_MAX_USES`
- Rate limit configurável por ambiente:
  - `RATE_LIMIT_MAX`
  - `RATE_LIMIT_WINDOW`
- `trustProxy` habilitado no Fastify para operação atrás de proxy.
- Patches de schema no startup protegidos por flag:
  - `RUN_STARTUP_PATCHES=false` em produção.

## Banco (Supabase)

- Criada migration de performance:
  - `sql/migrations/009_leads_performance_indexes.sql`
- Inclui:
  - índices compostos por `organization_id`
  - índices para filtros comuns (status, cidade, temperatura, datas, valor)
  - índices para deduplicação de importação (`email`, `whatsapp_digits`, `company+city`)
  - `pg_trgm` + GIN para acelerar `ILIKE` em `company` e `email`

## Recomendação de produção

1. Use `DATABASE_URL` do pooler (PgBouncer) do Supabase.
2. Aplique migrations SQL antes de subir backend.
3. Mantenha `RUN_STARTUP_PATCHES=false` em produção.
4. Ajuste pool conforme capacidade do plano Supabase.

## Verificação de contrato de rotas

Foi adicionado script para validar se paths `/api` usadas no frontend possuem rota correspondente no backend:

```bash
npm run verify:routes
```

Arquivo do script:

- `scripts/verify-route-contract.mjs`

## Checklist de deploy

1. `npm run check`
2. `npm run verify:routes`
3. `npm run build`
4. aplicar migrations pendentes no Supabase
