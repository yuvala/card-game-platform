import { createActor } from "xstate";

import playersData from "../../data/players.json";
import { createRewriteGameMachine } from "./games/drawPoker/machine";
import { createRewriteGame } from "./phaser/createRewriteGame";

const playerNames = playersData.players.map((player) => player.playerName);
const rewriteActor = createActor(createRewriteGameMachine(playerNames));

rewriteActor.start();
createRewriteGame("rewrite-root", rewriteActor);
