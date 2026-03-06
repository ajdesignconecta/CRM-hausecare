const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const port = process.env.PORT || "3000";
const frontendDir = resolve(__dirname, "frontend");
const nextBin = resolve(frontendDir, "node_modules", "next", "dist", "bin", "next");

if (!existsSync(nextBin)) {
  console.error("[server] Next.js nao encontrado em frontend/node_modules.");
  console.error("[server] Execute instalacao de dependencias antes de iniciar.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  cwd: frontendDir,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (error) => {
  console.error("[server] Falha ao iniciar app:", error);
  process.exit(1);
});
