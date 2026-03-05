import { resolve } from "node:path";
import { spawn } from "node:child_process";

const port = process.env.PORT || "3010";
const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  stdio: "inherit",
  shell: false
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

