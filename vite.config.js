const { resolve } = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
    root: "apps/client",
    envDir: __dirname,
    plugins: [react()],
    resolve: {
        alias: {
            "@engine": resolve(__dirname, "packages/engine/src")
        }
    },
    server: {
        host: "localhost",
        port: 8000
    },
    preview: {
        host: "localhost",
        port: 4173
    },
    build: {
        outDir: "../../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "apps/client/index.html")
            }
        }
    }
});
