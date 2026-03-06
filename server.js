const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const port = process.env.PORT || "3000";
const frontendDir = resolve(__dirname, "frontend");
const frontendNextBin = resolve(frontendDir, "node_modules", "next", "dist", "bin", "next");
const rootNextBin = resolve(__dirname, "node_modules", "next", "dist", "bin", "next");
const frontendBuildDir = resolve(frontendDir, ".next");
const rootBuildDir = resolve(__dirname, ".next");

const nextBin = existsSync(frontendNextBin) ? frontendNextBin : rootNextBin;
const runDir = existsSync(frontendBuildDir)
  ? frontendDir
  : existsSync(rootBuildDir)
    ? __dirname
    : frontendDir;

if (!existsSync(nextBin)) {
  console.error("[server] Next.js nao encontrado.");
  console.error("[server] Verifique se a instalacao de dependencias foi executada.");
  process.exit(1);
}

if (!existsSync(frontendBuildDir) && !existsSync(rootBuildDir)) {
  console.error("[server] Build .next nao encontrado.");
  console.error("[server] Verifique se o comando de build da implantacao esta configurado.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  cwd: runDir,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (error) => {
  console.error("[server] Falha ao iniciar app:", error);
  process.exit(1);
});
