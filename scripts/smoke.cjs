const { spawnSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
function run(label, command, args, options = {}) {
    console.log("\n> " + label);
    const result = spawnSync(command, args, {
        cwd: rootDir,
        stdio: "inherit",
        shell: options.shell ?? false
    });

    if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        throw new Error(label + " failed.");
    }
}

try {
    run("engine tests", process.execPath, [path.join(rootDir, "scripts", "run-tests.cjs")]);
    run("production build", "npm.cmd", ["run", "build"], { shell: true });
    console.log("\nsmoke passed");
} catch (error) {
    console.error(error);
}
