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
        host: "127.0.0.1",
        port: 8000
    },
    preview: {
        host: "127.0.0.1",
        port: 4173
    },
    build: {
        outDir: "../../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                table: resolve(__dirname, "apps/client/table-admin.html"),
                player: resolve(__dirname, "apps/client/player.html"),
                cardSandbox: resolve(__dirname, "apps/client/card-sandbox.html"),
                lobby: resolve(__dirname, "apps/client/lobby.html")
            }
        }
    }
});
