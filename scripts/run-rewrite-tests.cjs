const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, ".tmp-rewrite-tests");
const isWindows = process.platform === "win32";
const tscPath = path.join(repoRoot, "node_modules", ".bin", isWindows ? "tsc.cmd" : "tsc");

const testEntries = [
    "tests/rewrite/piles.test.ts",
    "tests/rewrite/gameConfig.test.ts",
    "tests/rewrite/gameSession.test.ts",
    "tests/rewrite/rewriteSessionHost.test.ts",
    "tests/rewrite/machineFactory.test.ts",
    "tests/rewrite/debugScenarios.test.ts",
    "tests/rewrite/gameMachines.test.ts",
    "tests/rewrite/viewModels.test.ts"
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
    fs.rmSync(outDir, {
        recursive: true,
        force: true
    });

    run(tscPath, [
        "--ignoreConfig",
        "--target",
        "ES2020",
        "--module",
        "commonjs",
        "--moduleResolution",
        "node",
        "--ignoreDeprecations",
        "6.0",
        "--esModuleInterop",
        "--resolveJsonModule",
        "--skipLibCheck",
        "--outDir",
        outDir,
        "--rootDir",
        ".",
        ...testEntries
    ]);

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
