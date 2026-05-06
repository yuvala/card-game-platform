import { createRewriteWebSocketServer } from "./RewriteWebSocketServer";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const rewriteServer = createRewriteWebSocketServer({
    gameId: process.env.GAME_ID,
    playerCount: Number(process.env.PLAYERS || 2),
    deckId: process.env.DECK_ID,
    cardsPerPlayer: process.env.CARDS ? Number(process.env.CARDS) : undefined
});

rewriteServer.server.listen(port, host, () => {
    console.log(`Rewrite WebSocket server running at ws://${host}:${port}/`);
});

process.on("SIGINT", () => {
    rewriteServer.close()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
});
