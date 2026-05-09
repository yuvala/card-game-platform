const fs = require("node:fs");
const path = require("node:path");

const outDir = path.resolve(process.argv[2] || "");
const aliasPrefix = "@engine/";

if (!outDir || !fs.existsSync(outDir)) {
    console.error("Usage: node scripts/resolve-engine-aliases.cjs <compiled-out-dir>");
    process.exit(1);
}

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return walk(fullPath);
        }

        return entry.isFile() && fullPath.endsWith(".js") ? [fullPath] : [];
    });
}

function toRequirePath(fromFile, aliasPath) {
    const targetBase = path.join(outDir, "packages", "engine", "src", aliasPath);
    const target = fs.existsSync(targetBase + ".js")
        ? targetBase + ".js"
        : path.join(targetBase, "index.js");
    let relative = path.relative(path.dirname(fromFile), target).replace(/\\/g, "/");
    if (!relative.startsWith(".")) {
        relative = "./" + relative;
    }

    return relative;
}

for (const file of walk(outDir)) {
    const source = fs.readFileSync(file, "utf8");
    const next = source.replace(
        /require\(["']@engine\/([^"']+)["']\)/g,
        (_match, aliasPath) => {
            return `require("${toRequirePath(file, aliasPath)}")`;
        }
    );

    if (next !== source) {
        fs.writeFileSync(file, next);
    }
}
