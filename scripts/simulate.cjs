const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, ".tmp-simulate");
const isWindows = process.platform === "win32";
const tscPath = path.join(repoRoot, "node_modules", ".bin", isWindows ? "tsc.cmd" : "tsc");
const aliasResolverPath = path.join(repoRoot, "scripts", "resolve-engine-aliases.cjs");
const args = process.argv.slice(2);

function run(command, runArgs) {
    const result = spawnSync(command, runArgs, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: isWindows && command.toLowerCase().endsWith(".cmd")
    });
    if (result.error) { throw result.error; }
    if (result.status !== 0) { process.exit(result.status ?? 1); }
}

try {
    fs.rmSync(outDir, { recursive: true, force: true });
    run(tscPath, ["-p", "tsconfig.simulate.json"]);
    run(process.execPath, [aliasResolverPath, outDir]);
    run(process.execPath, [path.join(outDir, "scripts", "simulate.js"), ...args]);
} finally {
    fs.rmSync(outDir, { recursive: true, force: true });
}
