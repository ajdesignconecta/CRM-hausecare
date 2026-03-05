import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const backendDir = resolve(process.cwd(), "..", "backend");
const backendPkg = resolve(backendDir, "package.json");

if (!existsSync(backendPkg)) {
  console.warn("[prepare-backend] backend nao encontrado; seguindo sem bridge local.");
  process.exit(0);
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const child = spawn(npmCmd, ["run", "build"], {
  cwd: backendDir,
  stdio: "inherit",
  shell: false
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
