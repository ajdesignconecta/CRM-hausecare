const http = require("node:http");
const next = require("next");

const port = Number(process.env.PORT || process.env.APP_PORT || process.env.WEB_PORT || 8081);
const host = process.env.HOST || "0.0.0.0";

const app = next({
  dev: false,
  dir: "./frontend"
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));
    server.listen(port, host, () => {
      console.log(`[server] Next iniciado em http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error("[server] Falha ao iniciar:", error);
    process.exit(1);
  });
