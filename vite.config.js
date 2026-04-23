const { resolve } = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
    root: "html",
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
                game: resolve(__dirname, "html/game.html")
            }
        }
    }
});
