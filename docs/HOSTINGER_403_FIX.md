# Correcao de Erro 403 no Dominio (Hostinger)

Se o dominio `hausecarecrm.com.br` mostra `403 Forbidden`, quase sempre a raiz `public_html` esta com publicacao incorreta para este projeto.

## Diagnostico rapido

1. Em `public_html`, confirme se existe um `index.html` de teste.
2. Se existir `.htaccess`, renomeie para `.htaccess-disabled` e teste novamente.
3. Se o `index.html` abrir, a pasta/DOMinio esta correta e o bloqueio era de regra.
4. Se ainda nao abrir, ajuste Document Root e WAF/ModSecurity no painel.

## Publicacao correta deste CRM

Este sistema roda como app Node.js (Next.js + backend), nao como site PHP estatico.

1. Hostinger -> `Advanced -> Node.js`.
2. Crie o app apontando para a pasta do projeto completo.
3. Node version: `22.x`.
4. Install: `npm install`.
5. Build: `npm run build`.
6. Start: `npm start`.
7. Vincule o dominio `hausecarecrm.com.br` ao app Node.

## Variaveis de ambiente minimas

### backend/.env

- `NODE_ENV=production`
- `PORT=4010`
- `DATABASE_URL=...`
- `JWT_SECRET=...`
- `COOKIE_NAME=crm_session`
- `CORS_ORIGIN=https://hausecarecrm.com.br`
- `APP_BASE_URL=https://hausecarecrm.com.br`
- `RESET_TOKEN_TTL_MINUTES=60`

### frontend/.env

- `NEXT_PUBLIC_API_URL=https://hausecarecrm.com.br/api`
- `PORT=3010`
