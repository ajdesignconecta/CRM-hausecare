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

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn([command, ...args].join(" "), [], {
      cwd,
      stdio: "inherit",
      shell: true
    });
    child.on("exit", (code) => {
      if ((code ?? 0) === 0) {
        resolveRun(undefined);
      } else {
        rejectRun(new Error(`[prepare-backend] comando falhou: ${command} ${args.join(" ")}`));
      }
    });
  });
}

try {
  console.log("[prepare-backend] instalando dependencias do backend...");
  await run(npmCmd, ["install", "--include=dev"], backendDir);
  console.log("[prepare-backend] compilando backend...");
  await run(npmCmd, ["run", "build"], backendDir);
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
