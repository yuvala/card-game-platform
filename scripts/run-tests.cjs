const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, `.tmp-tests-${Date.now()}`);

// Clean up any leftover runs from previous sessions
try {
    for (const entry of fs.readdirSync(repoRoot)) {
        if (/^\.tmp-tests(-\d+)?$/.test(entry)) {
            fs.rmSync(path.join(repoRoot, entry), { recursive: true, force: true });
        }
    }
} catch {
    // ignore — a locked dir from a previous run is not a blocker
}
const isWindows = process.platform === "win32";
const tscPath = path.join(repoRoot, "node_modules", ".bin", isWindows ? "tsc.cmd" : "tsc");
const aliasResolverPath = path.join(repoRoot, "scripts", "resolve-engine-aliases.cjs");
const testEntries = [
    "tests/engine/piles.test.ts",
    "tests/engine/gameConfig.test.ts",
    "tests/engine/gameSession.test.ts",
    "tests/engine/gameSessionHost.test.ts",
    "tests/engine/gameWebSocketServer.test.ts",
    "tests/engine/machineFactory.test.ts",
    "tests/engine/debugScenarios.test.ts",
    "tests/engine/playerPovPresentation.test.ts",
    "tests/engine/gameMachines.test.ts",
    "tests/engine/viewModels.test.ts",
    "tests/engine/simulation.test.ts",
    "tests/engine/batch.test.ts",
    "tests/engine/briscaLite.test.ts",
    "tests/engine/pokerLite.test.ts",
    "tests/engine/playerPovLayout.test.ts",
    "tests/lobby/lobbyService.test.ts"
];

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: isWindows && command.toLowerCase().endsWith(".cmd")
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

try {
    run(tscPath, ["-p", "tsconfig.tests.json", "--outDir", outDir]);
    run(process.execPath, [aliasResolverPath, outDir]);

    for (const entry of testEntries) {
        const compiledPath = path.join(
            outDir,
            entry.replace(/\.ts$/, ".js")
        );

        run(process.execPath, [compiledPath]);
    }
} finally {
    fs.rmSync(outDir, {
        recursive: true,
        force: true
    });
}
