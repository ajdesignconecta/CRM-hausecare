# CRM-Hausecare

CRM para gestï¿½o de clï¿½nicas/empresas de Home Care, com frontend Next.js 15 e backend Fastify (TypeScript), usando Supabase somente como Postgres (o frontend nunca acessa o Supabase).

## Arquitetura

- `frontend` (Next.js 15 + TypeScript + Tailwind): UI em PT-BR, autenticaï¿½ï¿½o, dashboard, leads, importaï¿½ï¿½o CSV.
- `backend` (Fastify + TypeScript): autenticaï¿½ï¿½o JWT em cookie httpOnly, validaï¿½ï¿½es, CRUD, importaï¿½ï¿½o, alertas follow-up.
- `sql/migrations`: SQL para criar schema completo no Supabase Postgres.

## Estrutura

- `/backend`
- `/frontend`
- `/sql/migrations/001_init.sql`

## Requisitos

- Node.js 22+
- npm 10+
- Banco Supabase Postgres criado

## Rodar tudo com um comando (raiz)

Na raiz do projeto:

```bash
npm install
npm run dev
```

Isso sobe simultaneamente:
- Backend em `http://localhost:4010`
- Frontend em `http://localhost:3010`

Scripts úteis na raiz:

```bash
npm run dev:backend
npm run dev:frontend
npm run check
npm run build
```
## 1) Banco no Supabase

1. No Supabase, abra SQL Editor.
2. Execute `sql/migrations/001_init.sql`.
3. Pegue a string de conexï¿½o Postgres (Connection string) no painel Supabase.

## 2) Backend

1. Copie `backend/.env.example` para `backend/.env`.
2. Configure:

```env
PORT=4010
DATABASE_URL=postgresql://...
JWT_SECRET=...
COOKIE_NAME=crm_session
CORS_ORIGIN=http://localhost:3010
APP_BASE_URL=http://localhost:3010
RESET_TOKEN_TTL_MINUTES=60
```

3. Instale e rode:

```bash
cd backend
npm install
npm run dev
```

API base: `http://localhost:4010`

## 3) Frontend

1. Copie `frontend/.env.example` para `frontend/.env`.
2. Configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:4010
```

3. Instale e rode:

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3010`

## Rotas implementadas

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login` (rate limit aplicado)
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PUT /api/auth/change-password`
- `GET /api/auth/me`

Leads:
- `GET /api/leads?search=&status=&city=&lead_level=&had_response=&page=&pageSize=`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PUT /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/import` (multipart CSV)
- `GET /api/leads/export.csv`

Alertas:
- `GET /api/alerts/followups?days=7`

## CSV de importaï¿½ï¿½o

Tela: `/leads/import`

Colunas esperadas:
- `Lead #, Empresa, Cidade, Telefone, WhatsApp, Email, Site, Link Google Maps, Decisor, Status do Contato, Data Primeiro Contato, Follow-up 1, Follow-up 2, Follow-up 3, Observaï¿½ï¿½es, Teve resposta, Nï¿½vel do lead`

Regras implementadas:
- ignora linhas vazias
- normaliza telefone/whatsapp (somente dï¿½gitos + salva formato)
- dedup por `email` ou `whatsapp`; sem eles, usa `company+city`
- opï¿½ï¿½o `skipDuplicates=true/false`
- relatï¿½rio final de importaï¿½ï¿½o

## Seguranï¿½a

- Sessï¿½o via JWT assinada no backend em cookie `httpOnly`.
- Middleware de proteï¿½ï¿½o no Next.js via cookie de sessï¿½o.
- Validaï¿½ï¿½o com Zod em todas entradas sensï¿½veis.
- `service_role` do Supabase nï¿½o ï¿½ usado no frontend.

## Deploy Hostinger (Node.js Web App)

Estratï¿½gia recomendada:
1. Subir `backend` e `frontend` como apps Node separados (ou front estï¿½tico com proxy para backend).
2. Configurar variï¿½veis de ambiente de produï¿½ï¿½o em cada app.
3. `DATABASE_URL` deve apontar para o Supabase Postgres externo (SSL habilitado).
4. Ajustar `CORS_ORIGIN` para domï¿½nio do frontend em produï¿½ï¿½o.
5. Usar proxy reverso (Nginx/Hostinger) para manter HTTPS e cookies `Secure`.

Observaï¿½ï¿½es:
- Supabase funciona normalmente como banco externo em hospedagem Node da Hostinger.
- Se frontend e backend estiverem em domï¿½nios diferentes, revise polï¿½tica de cookie (`sameSite`, domï¿½nio, HTTPS).

## Design

A UI segue direï¿½ï¿½o visual da Hausecare:
- paleta `#00c3a5` / `#0b4b3f`
- cards claros premium
- tipografia Figtree
- layout limpo e comercial

## Prï¿½ximos passos sugeridos

- Integrar envio real de email para reset de senha (ex: Resend/SMTP).
- Adicionar worker/cron para notificaï¿½ï¿½es por email de follow-up.
- Adicionar testes automatizados (unit + integraï¿½ï¿½o).


