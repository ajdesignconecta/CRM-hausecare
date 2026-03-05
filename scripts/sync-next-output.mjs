import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const source = resolve(rootDir, "frontend", ".next");
const target = resolve(rootDir, ".next");

if (!existsSync(source)) {
  console.error("[sync-next-output] frontend/.next nao encontrado.");
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

console.log("[sync-next-output] .next sincronizado para a raiz.");

