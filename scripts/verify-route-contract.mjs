import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const FRONTEND_DIR = join(ROOT, "frontend");
const BACKEND_DIR = join(ROOT, "backend", "src", "modules");

const walkFiles = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkFiles(fullPath, acc);
      continue;
    }
    if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const normalizeFrontendPath = (raw) => {
  const noQuery = raw.split("?")[0];
  return noQuery.replace(/\$\{[^}]+\}/g, ":param");
};

const frontendFiles = walkFiles(FRONTEND_DIR);
const backendFiles = walkFiles(BACKEND_DIR);

const frontendPathRegex = /["'`](\/api\/[^"'`\n]+)["'`]/g;
const backendRouteRegex = /app\.(get|post|put|delete)\(\s*["'`]([^"'`]+)["'`]/g;

const frontendPaths = new Set();
for (const file of frontendFiles) {
  const content = readFileSync(file, "utf-8");
  let match = frontendPathRegex.exec(content);
  while (match) {
    const route = normalizeFrontendPath(match[1]);
    frontendPaths.add(route);
    match = frontendPathRegex.exec(content);
  }
}

const backendRoutes = [];
for (const file of backendFiles) {
  const content = readFileSync(file, "utf-8");
  let match = backendRouteRegex.exec(content);
  while (match) {
    backendRoutes.push({ method: match[1].toUpperCase(), path: match[2] });
    match = backendRouteRegex.exec(content);
  }
}

const pathMatches = (frontendPath, backendPath) => {
  const f = frontendPath.split("/").filter(Boolean);
  const b = backendPath.split("/").filter(Boolean);
  if (f.length !== b.length) return false;
  for (let i = 0; i < f.length; i += 1) {
    if (b[i].startsWith(":")) continue;
    if (f[i] !== b[i]) return false;
  }
  return true;
};

const frontendOnly = [...frontendPaths].filter(
  (path) => !backendRoutes.some((route) => pathMatches(path, route.path))
);

console.log(`Frontend API paths found: ${frontendPaths.size}`);
console.log(`Backend routes found: ${backendRoutes.length}`);

if (frontendOnly.length > 0) {
  console.log("\nPaths no frontend sem rota correspondente no backend:");
  for (const path of frontendOnly) {
    console.log(`- ${path}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nContrato de rotas OK: todas as paths do frontend possuem rota correspondente no backend.");
}
