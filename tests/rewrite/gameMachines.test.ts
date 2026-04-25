import { createActor } from "xstate";

import {
    frenchDeckDefinition,
    spanishDeckDefinition
} from "../../html/src/rewrite/engine/cards/deckDefinitions";
import { getPileCards } from "../../html/src/rewrite/engine/game/piles";
import { createBriscaLiteMachine } from "../../html/src/rewrite/games/briscaLite/machine";
import { getBriscaLiteHandPileId } from "../../html/src/rewrite/games/briscaLite/types";
import { createRewriteGameMachine } from "../../html/src/rewrite/games/drawPoker/machine";
import { getDrawPokerHandPileId } from "../../html/src/rewrite/games/drawPoker/types";
import { createWarLiteMachine } from "../../html/src/rewrite/games/warLite/machine";
import { getWarLiteHandPileId } from "../../html/src/rewrite/games/warLite/types";

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function wait(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function waitFor(condition: () => boolean, timeoutMs = 4000) {
    const startedAt = Date.now();

    while (!condition()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out while waiting for a concrete game machine state.");
        }

        await wait(25);
    }
}

async function runDrawPokerMachineTest() {
    const machine = createRewriteGameMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: 1,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    let snapshot = actor.getSnapshot();
    const currentPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const currentHand = getPileCards(snapshot.context.piles, getDrawPokerHandPileId(currentPlayer.id));
    assert(currentHand.length === 1, "Draw Poker should deal one card to the current player in the short test setup.");

    actor.send({ type: "SELECT_CARD", cardId: currentHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => {
        const nextSnapshot = actor.getSnapshot();
        return nextSnapshot.value === "playerTurn" && nextSnapshot.context.turnIndex === 1;
    });

    snapshot = actor.getSnapshot();
    assert(snapshot.context.roundCards.length === 1, "Draw Poker should keep one played card after the first turn resolves.");

    const secondPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const secondHand = getPileCards(snapshot.context.piles, getDrawPokerHandPileId(secondPlayer.id));
    assert(secondHand.length === 1, "Draw Poker second player should still have one card before playing.");

    actor.send({ type: "SELECT_CARD", cardId: secondHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().value === "gameOver");
    snapshot = actor.getSnapshot();

    assert(snapshot.value === "gameOver", "Draw Poker should finish after both one-card turns.");
    assert(snapshot.context.roundCards.length === 2, "Draw Poker should keep both played cards in the last round.");
    assert(
        snapshot.context.players.every((player) => {
            return getPileCards(snapshot.context.piles, getDrawPokerHandPileId(player.id)).length === 0;
        }),
        "Draw Poker hands should be empty when the short test reaches game over."
    );
}

async function runWarLiteMachineTest() {
    const machine = createWarLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "battleReady");

    const beforeBattle = actor.getSnapshot();
    assert(
        beforeBattle.context.players.every((player) => {
            return getPileCards(beforeBattle.context.piles, getWarLiteHandPileId(player.id)).length > 0;
        }),
        "War Lite should have cards in both player stacks before the first battle."
    );

    actor.send({ type: "PLAY_CARD" });

    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" || snapshot.value === "gameOver";
    }, 5000);

    const afterBattle = actor.getSnapshot();
    assert(
        afterBattle.context.discardPile.length === 2,
        "War Lite should move both revealed cards into discard history after one battle."
    );
    assert(
        afterBattle.context.players.every((player) => {
            return getPileCards(afterBattle.context.piles, getWarLiteHandPileId(player.id)).length >= 0;
        }),
        "War Lite should keep valid stack piles after resolving the battle."
    );
    assert(
        afterBattle.context.round === 2 || afterBattle.value === "gameOver",
        "War Lite should advance to the next battle or finish after resolving one battle."
    );
}

async function runBriscaLiteMachineTest() {
    const machine = createBriscaLiteMachine(["Avi", "Dany"], {
        deckDefinition: spanishDeckDefinition,
        cardsPerPlayer: 1,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    let snapshot = actor.getSnapshot();
    const currentPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const currentHand = getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(currentPlayer.id));
    assert(currentHand.length === 1, "Brisca-lite should deal one card to the active player in the short test setup.");
    assert(snapshot.context.trumpCard !== null, "Brisca-lite should expose a trump card after setup.");

    actor.send({ type: "SELECT_CARD", cardId: currentHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => {
        const nextSnapshot = actor.getSnapshot();
        return nextSnapshot.value === "playerTurn" && nextSnapshot.context.turnIndex === 1;
    });

    snapshot = actor.getSnapshot();
    assert(snapshot.context.roundCards.length === 1, "Brisca-lite should keep one card in the current trick after the first play.");
    assert(
        getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(currentPlayer.id)).length === 0,
        "Brisca-lite should remove the played card from the first player's hand pile."
    );
}

async function main() {
    await runDrawPokerMachineTest();
    await runWarLiteMachineTest();
    await runBriscaLiteMachineTest();
    console.log("gameMachines.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
