#!/usr/bin/env node
/**
 * Bootstrap một lần: Node deps + tải Python (qua uv) + venv AI service.
 * Sau đó mở 3 terminal riêng để xem log.
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import { ensureEnvFiles } from "./lib/ensure-env.mjs";
import { ensureSpeakingPython } from "./lib/ensure-python.mjs";
import { root } from "./lib/paths.mjs";

function log(msg) {
  console.log(`[run] ${msg}`);
}

function run(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

log("Cài dependencies Node…");
run("npm install");
run("npm install", join(root, "FE"));
run("npm install", join(root, "BE"));

ensureEnvFiles();
await ensureSpeakingPython();

console.log(`
══════════════════════════════════════════════════════════
  Sẵn sàng. Mở 3 terminal (log tách riêng):

    npm run dev:fe
    npm run dev:be
    npm run dev:speaking

  Lần đầu: điền MONGO_URI (BE/.env) và API keys (services/speaking-practice/.env)
══════════════════════════════════════════════════════════
`);
