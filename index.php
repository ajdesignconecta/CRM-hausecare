<?php
http_response_code(200);
header('Content-Type: text/html; charset=UTF-8');
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CRM Hausecare - Configuração de Hospedagem</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 2rem; color: #1f2937; }
    .card { max-width: 760px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
    h1 { margin-top: 0; }
    ul { line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>CRM Hausecare</h1>
    <p>O domínio está apontando para a pasta de arquivos, mas este sistema roda como aplicação <strong>Node.js</strong> (Next.js + backend).</p>
    <p>Para publicar corretamente na Hostinger:</p>
    <ul>
      <li>Crie um app em <code>Advanced - Node.js</code>.</li>
      <li>Selecione a pasta do projeto e instale dependências.</li>
      <li>Build: <code>npm run build</code></li>
      <li>Start: <code>npm start</code></li>
      <li>Aponte o domínio para esse app Node no painel.</li>
    </ul>
    <p>Depois disso, esta página de fallback não será usada.</p>
  </div>
</body>
</html>
