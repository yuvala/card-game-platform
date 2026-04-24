import { createActor } from "xstate";

import playersData from "../../data/players.json";
import { DEFAULT_DECK_ID, getDeckDefinitionById, supportedDeckDefinitions } from "./engine/cards/deckDefinitions";
import { createRewriteGameMachine } from "./games/drawPoker/machine";
import { createRewriteGame } from "./phaser/createRewriteGame";

const playerNames = playersData.players.map((player) => player.playerName);
const requestedDeckId = new URLSearchParams(window.location.search).get("deck");
const deckDefinition =
    getDeckDefinitionById(requestedDeckId) ??
    supportedDeckDefinitions[DEFAULT_DECK_ID];
const rewriteActor = createActor(createRewriteGameMachine(playerNames, {
    deckDefinition
}));

rewriteActor.start();
createRewriteGame("rewrite-root", rewriteActor);
