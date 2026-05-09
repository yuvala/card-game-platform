const { resolve } = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
    root: "html",
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
        outDir: "../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "html/index.html"),
                game: resolve(__dirname, "html/game.html"),
                table: resolve(__dirname, "html/rewrite.html"),
                player: resolve(__dirname, "html/player.html"),
                cardSandbox: resolve(__dirname, "html/card-sandbox.html")
            }
        }
    }
});
