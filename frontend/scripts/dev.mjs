import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const nextCacheDir = resolve(process.cwd(), ".next");
const shouldClean = process.argv.includes("--clean") || process.env.CLEAN_NEXT === "1";

if (shouldClean) {
  try {
    rmSync(nextCacheDir, { recursive: true, force: true });
    console.log("[dev] cache .next limpo");
  } catch (error) {
    console.warn("[dev] falha ao limpar .next:", error);
  }
}

const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", "-p", "3010"], {
  stdio: "inherit",
  shell: false
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
