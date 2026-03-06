# Correção de Erro 403 no Domínio (Hostinger)

Se o domínio `hausecarecrm.com.br` mostra `403 Forbidden`, normalmente o domínio está apontando para uma pasta sem `index` executável do app Node.

## Diagnóstico rápido

1. Se abrir esta tela de fallback (`index.php`), o domínio está servindo arquivos estáticos via Apache.
2. O CRM deste repositório não é PHP; ele roda como Node.js.

## Publicação correta

1. No painel da Hostinger, abra `Advanced -> Node.js`.
2. Crie a aplicação Node apontando para a pasta deste projeto.
3. Defina versão Node `22.x`.
4. Instale dependências.
5. Rode build:

```bash
npm run build
```

6. Configure start command:

```bash
npm start
```

7. Em seguida, vincule o domínio ao app Node criado.

## Variáveis de ambiente mínimas

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

## Observação

O fallback (`index.php` e `.htaccess`) existe apenas para impedir 403 quando o domínio estiver apontado para pasta errada. O funcionamento final do CRM depende do app Node ativo.
