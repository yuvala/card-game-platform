import { createActor } from "xstate";

import {
    frenchDeckDefinition,
    spanishDeckDefinition
} from "../../html/src/rewrite/engine/cards/deckDefinitions";
import { createDeck } from "../../html/src/rewrite/engine/cards/createDeck";
import type { DeckDefinition } from "../../html/src/rewrite/engine/cards/types";
import { getPileCards, setPileCards } from "../../html/src/rewrite/engine/game/piles";
import { BRISCA_LITE_STOCK_PILE_ID, BRISCA_LITE_TRICK_PILE_ID, BRISCA_LITE_TRUMP_PILE_ID } from "../../html/src/rewrite/games/briscaLite/types";
import { createBriscaLiteMachine } from "../../html/src/rewrite/games/briscaLite/machine";
import { getBriscaLiteCapturePileId, getBriscaLiteHandPileId } from "../../html/src/rewrite/games/briscaLite/types";
import { createPokerLiteMachine } from "../../html/src/rewrite/games/pokerLite/machine";
import { getPokerLiteHandPileId } from "../../html/src/rewrite/games/pokerLite/types";
import { createWarLiteMachine } from "../../html/src/rewrite/games/warLite/machine";
import { warLiteGameDefinition } from "../../html/src/rewrite/games/warLite/definition";
import { createInitialContext as createInitialWarLiteContext } from "../../html/src/rewrite/games/warLite/setup";
import { recycleEmptyPlayerStacks } from "../../html/src/rewrite/games/warLite/rules";
import { getWarLiteCapturePileId, getWarLiteHandPileId, WAR_LITE_BATTLE_PILE_ID, WAR_LITE_DISCARD_PILE_ID } from "../../html/src/rewrite/games/warLite/types";

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

const tinyWarDeckDefinition: DeckDefinition = {
    id: "tiny-war",
    name: "Tiny War Deck",
    suits: [
        { id: "test", label: "Test", shortLabel: "T" }
    ],
    ranks: [
        { id: "low", label: "Low", shortLabel: "L", sortOrder: 2 },
        { id: "high", label: "High", shortLabel: "H", sortOrder: 14 }
    ]
};

async function waitFor(condition: () => boolean, timeoutMs = 4000) {
    const startedAt = Date.now();

    while (!condition()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out while waiting for a concrete game machine state.");
        }

        await wait(25);
    }
}

async function runPokerLiteMachineTest() {
    const machine = createPokerLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: 1,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });

    await waitFor(() => actor.getSnapshot().value === "dealing");
    let snapshot = actor.getSnapshot();
    assert(snapshot.context.lastEffects.length === 2, "Poker Lite should emit one deal effect per dealt card in the short test.");
    assert(
        snapshot.context.lastEffects.every((effect) => effect.type === "move-card" && effect.reason === "deal"),
        "Poker Lite dealing effects should describe deal-card moves."
    );
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    snapshot = actor.getSnapshot();
    const currentPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const currentHand = getPileCards(snapshot.context.piles, getPokerLiteHandPileId(currentPlayer.id));
    assert(currentHand.length === 1, "Poker Lite should deal one card to the current player in the short test setup.");

    actor.send({ type: "SELECT_CARD", cardId: currentHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    snapshot = actor.getSnapshot();
    assert(
        snapshot.context.lastEffects.length === 1 &&
        snapshot.context.lastEffects[0].type === "move-card" &&
        snapshot.context.lastEffects[0].reason === "play",
        "Poker Lite should emit a play effect before committing the selected card."
    );
    assert(
        snapshot.context.lastEffects[0].type === "move-card" &&
            snapshot.context.lastEffects[0].fromFaceUp === true,
        "Poker Lite play effects should start from a face-up hand card."
    );
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => {
        const nextSnapshot = actor.getSnapshot();
        return nextSnapshot.value === "playerTurn" && nextSnapshot.context.turnIndex === 1;
    });

    snapshot = actor.getSnapshot();
    assert(snapshot.context.roundCards.length === 1, "Poker Lite should keep one played card after the first turn resolves.");

    const secondPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const secondHand = getPileCards(snapshot.context.piles, getPokerLiteHandPileId(secondPlayer.id));
    assert(secondHand.length === 1, "Poker Lite second player should still have one card before playing.");

    actor.send({ type: "SELECT_CARD", cardId: secondHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().value === "gameOver");
    snapshot = actor.getSnapshot();

    assert(snapshot.value === "gameOver", "Poker Lite should finish after both one-card turns.");
    assert(snapshot.context.roundCards.length === 2, "Poker Lite should keep both played cards in the last round.");
    assert(snapshot.context.playedCardHistory.length === 2, "Poker Lite should record both plays in played-card history.");
    assert(
        getPileCards(snapshot.context.piles, "discard").length === 2,
        "Poker Lite discard pile should contain both played cards."
    );
    assert(
        snapshot.context.players.every((player) => {
            return getPileCards(snapshot.context.piles, getPokerLiteHandPileId(player.id)).length === 0;
        }),
        "Poker Lite hands should be empty when the short test reaches game over."
    );
    const highestScore = Math.max(...snapshot.context.players.map((player) => player.score));
    assert(highestScore === 1, "Poker Lite short test should award exactly one point.");
    assert(snapshot.context.winningPlayerIds.length === 1, "Poker Lite short test should resolve to a single winner.");
    assert(
        snapshot.context.statusText.includes("finished"),
        "Poker Lite should expose a finished status message at game over."
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
    await waitFor(() => actor.getSnapshot().value === "dealing");
    let beforeBattle = actor.getSnapshot();
    assert(
        beforeBattle.context.lastEffects.length > 0,
        "War Lite should emit deal effects while splitting the opening stacks."
    );
    assert(
        beforeBattle.context.lastEffects.every((effect) => effect.type === "move-card" && effect.reason === "deal"),
        "War Lite dealing effects should describe deal-card moves."
    );
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().value === "battleReady");

    beforeBattle = actor.getSnapshot();
    assert(
        beforeBattle.context.players.every((player) => {
            return getPileCards(beforeBattle.context.piles, getWarLiteHandPileId(player.id)).length > 0;
        }),
        "War Lite should have cards in both player stacks before the first battle."
    );

    actor.send({ type: "PLAY_CARD" });
    let battleSnapshot = actor.getSnapshot();
    assert(
        battleSnapshot.context.lastEffects.filter((effect) => effect.reason === "play").length === 1,
        "War Lite should emit one play effect when the next player reveals a battle card."
    );

    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" && snapshot.context.roundCards.length === 1;
    });
    battleSnapshot = actor.getSnapshot();
    assert(
        battleSnapshot.context.roundCards.length === 1,
        "War Lite should wait after the first player reveals one battle card."
    );

    actor.send({ type: "PLAY_CARD" });
    battleSnapshot = actor.getSnapshot();
    assert(
        battleSnapshot.context.lastEffects.filter((effect) => effect.reason === "play").length === 1,
        "War Lite should emit one play effect when the second player reveals a battle card."
    );

    await waitFor(() => actor.getSnapshot().value === "resolvingBattle");
    battleSnapshot = actor.getSnapshot();
    assert(
        battleSnapshot.context.lastEffects.filter((effect) => effect.reason === "collect").length === 2,
        "War Lite should emit collect effects after both battle cards are revealed."
    );

    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" || snapshot.value === "gameOver";
    }, 5000);

    const afterBattle = actor.getSnapshot();
    assert(
        afterBattle.context.playedCardHistory.length === 2,
        "War Lite should move both revealed cards into played-card history after one battle."
    );
    assert(
        afterBattle.context.players.some((player) => {
            return getPileCards(afterBattle.context.piles, getWarLiteCapturePileId(player.id)).length === 2;
        }),
        "War Lite should move won battle cards into the winner capture pile."
    );
    assert(
        getPileCards(afterBattle.context.piles, WAR_LITE_DISCARD_PILE_ID).length === 0,
        "War Lite discard pile should remain empty when the battle has a single winner."
    );
    assert(
        getPileCards(afterBattle.context.piles, WAR_LITE_BATTLE_PILE_ID).length === 0,
        "War Lite battle pile should be empty after battle resolution."
    );
    assert(afterBattle.context.roundCards.length === 0, "War Lite should clear roundCards before the next battle.");
    assert(
        afterBattle.context.players.reduce((sum, player) => sum + player.score, 0) === 1,
        "War Lite short test should award one battle win after the first reveal."
    );
    assert(
        afterBattle.context.players.every((player) => {
            return getPileCards(afterBattle.context.piles, getWarLiteHandPileId(player.id)).length === 25;
        }),
        "War Lite should reduce each player stack by exactly one card after the first battle."
    );
    assert(
        afterBattle.context.round === 2 || afterBattle.value === "gameOver",
        "War Lite should advance to the next battle or finish after resolving one battle."
    );
    assert(
        afterBattle.context.statusText.includes("Battle 2"),
        "War Lite should announce the next battle after resolving the first one."
    );

    const winnerWithCapturedCards = afterBattle.context.players.find((player) => {
        return getPileCards(afterBattle.context.piles, getWarLiteCapturePileId(player.id)).length > 0;
    });
    assert(winnerWithCapturedCards, "War Lite should have a player with won cards after one resolved battle.");
    const winnerStackPileId = getWarLiteHandPileId(winnerWithCapturedCards.id);
    const winnerCapturePileId = getWarLiteCapturePileId(winnerWithCapturedCards.id);
    const capturedCardCount = getPileCards(afterBattle.context.piles, winnerCapturePileId).length;
    const recycledContext = recycleEmptyPlayerStacks({
        ...afterBattle.context,
        piles: setPileCards(afterBattle.context.piles, winnerStackPileId, [])
    });
    assert(
        getPileCards(recycledContext.piles, winnerStackPileId).length === capturedCardCount,
        "War Lite should recycle a player's won pile into their stack when their stack is empty."
    );
    assert(
        getPileCards(recycledContext.piles, winnerCapturePileId).length === 0,
        "War Lite should clear the won pile after recycling it into the player stack."
    );
}

function runWarLiteGameOverRuleTest() {
    const deck = createDeck(frenchDeckDefinition);
    const context = createInitialWarLiteContext(["Avi", "Dany"], frenchDeckDefinition);
    const firstPlayer = context.players[0];
    const secondPlayer = context.players[1];
    assert(firstPlayer && secondPlayer, "War Lite game-over test requires two players.");

    const exhaustedContext = {
        ...context,
        piles: setPileCards(
            setPileCards(
                setPileCards(
                    setPileCards(context.piles, getWarLiteHandPileId(firstPlayer.id), []),
                    getWarLiteCapturePileId(firstPlayer.id),
                    []
                ),
                getWarLiteHandPileId(secondPlayer.id),
                [deck[0]]
            ),
            getWarLiteCapturePileId(secondPlayer.id),
            []
        ),
        roundCards: []
    };

    assert(
        warLiteGameDefinition.isGameOver(exhaustedContext),
        "War Lite should be over when one player has no stack cards and no won cards."
    );
    assert(
        warLiteGameDefinition.getAutomaticMove?.(exhaustedContext)?.type === "finish-game",
        "War Lite should request finish-game when fewer than two players still have cards."
    );

    const finishedContext = warLiteGameDefinition.applyMove(exhaustedContext, { type: "finish-game" }).state;
    assert(
        finishedContext.winningPlayerIds.length === 1 &&
            finishedContext.winningPlayerIds[0] === secondPlayer.id,
        "War Lite should mark the remaining player as the winner when the opponent has no cards."
    );
    assert(
        finishedContext.statusText.includes(secondPlayer.name) &&
            finishedContext.statusText.includes("wins War Lite"),
        "War Lite should expose a clear winner status at game over."
    );
}

async function runWarLiteMachineGameOverTest() {
    const machine = createWarLiteMachine(["Avi", "Dany"], {
        deckDefinition: tinyWarDeckDefinition,
        random: () => 0
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });

    await waitFor(() => actor.getSnapshot().value === "dealing");
    let snapshot = actor.getSnapshot();
    assert(
        snapshot.context.lastEffects.length === 2,
        "War Lite tiny deck should emit one deal effect per card."
    );
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().value === "battleReady");
    actor.send({ type: "PLAY_CARD" });

    await waitFor(() => {
        const nextSnapshot = actor.getSnapshot();
        return nextSnapshot.value === "battleReady" && nextSnapshot.context.roundCards.length === 1;
    });
    snapshot = actor.getSnapshot();
    assert(
        snapshot.context.roundCards.length === 1 &&
            getPileCards(snapshot.context.piles, WAR_LITE_BATTLE_PILE_ID).length === 1,
        "War Lite should keep the first revealed card on the battle pile while waiting for the second player."
    );

    actor.send({ type: "PLAY_CARD" });
    await waitFor(() => actor.getSnapshot().value === "resolvingBattle");
    snapshot = actor.getSnapshot();
    assert(
        snapshot.context.lastEffects.filter((effect) => effect.reason === "collect").length === 2,
        "War Lite tiny deck should collect both revealed cards after the battle resolves."
    );

    await waitFor(() => actor.getSnapshot().value === "gameOver", 5000);
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "gameOver", "War Lite tiny deck should reach game over after the only battle.");
    assert(
        snapshot.context.winningPlayerIds.length === 1,
        "War Lite tiny deck should produce one winner at game over."
    );
    assert(
        snapshot.context.statusText.includes("wins War Lite"),
        "War Lite machine should expose a clear winner status when it reaches game over."
    );
    actor.stop();
}

async function runWarLiteShortDeckOptionTest() {
    const machine = createWarLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: 3,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    const snapshot = actor.getSnapshot();

    assert(
        snapshot.context.lastEffects.length === 6,
        "War Lite should deal only the requested short-test card count when cardsPerPlayer is provided."
    );
    assert(
        snapshot.context.players.every((player) => {
            return getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id)).length === 3;
        }),
        "War Lite should put the requested short-test card count into each player stack."
    );

    actor.stop();
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
    await waitFor(() => actor.getSnapshot().value === "dealing");
    let snapshot = actor.getSnapshot();
    assert(
        snapshot.context.lastEffects.length === 3,
        "Brisca-lite should emit two hand deal effects and one trump deal effect in the short test."
    );
    assert(
        snapshot.context.lastEffects.every((effect) => effect.type === "move-card" && effect.reason === "deal"),
        "Brisca-lite dealing effects should describe deal-card moves."
    );
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().value === "playerTurn");
    snapshot = actor.getSnapshot();
    const currentPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const currentHand = getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(currentPlayer.id));
    assert(currentHand.length === 1, "Brisca-lite should deal one card to the active player in the short test setup.");
    assert(snapshot.context.trumpCard !== null, "Brisca-lite should expose a trump card after setup.");

    actor.send({ type: "SELECT_CARD", cardId: currentHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    snapshot = actor.getSnapshot();
    assert(
        snapshot.context.lastEffects.length === 1 &&
        snapshot.context.lastEffects[0].type === "move-card" &&
        snapshot.context.lastEffects[0].reason === "play",
        "Brisca-lite should emit a play effect before committing the selected card."
    );
    assert(
        snapshot.context.lastEffects[0].type === "move-card" &&
            snapshot.context.lastEffects[0].fromFaceUp === true,
        "Brisca-lite play effects should start from a face-up hand card."
    );
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

    const secondPlayer = snapshot.context.players[snapshot.context.turnIndex];
    const secondHand = getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(secondPlayer.id));
    assert(secondHand.length === 1, "Brisca-lite second player should still have one card before responding.");

    actor.send({ type: "SELECT_CARD", cardId: secondHand[0].id });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });

    await waitFor(() => actor.getSnapshot().context.round === 2);
    snapshot = actor.getSnapshot();

    assert(
        snapshot.context.lastEffects.filter((effect) => effect.reason === "collect").length === 2,
        "Brisca-lite should emit collect effects when moving trick cards to the winner capture pile."
    );
    assert(
        snapshot.context.lastEffects.filter((effect) => effect.reason === "draw").length === 2,
        "Brisca-lite should emit draw effects when refilling both players after a trick."
    );
    assert(snapshot.context.roundCards.length === 0, "Brisca-lite should clear the trick cards after the trick resolves.");
    assert(snapshot.context.playedCardHistory.length === 2, "Brisca-lite should record both played cards in played-card history.");
    assert(
        getPileCards(snapshot.context.piles, BRISCA_LITE_TRICK_PILE_ID).length === 0,
        "Brisca-lite trick pile should be empty after the trick is collected."
    );
    assert(
        snapshot.context.players.reduce((sum, player) => sum + player.score, 0) === 1,
        "Brisca-lite short test should award one trick point after the first trick."
    );
    assert(
        snapshot.context.players.some((player) => {
            return getPileCards(snapshot.context.piles, getBriscaLiteCapturePileId(player.id)).length === 2;
        }),
        "Brisca-lite should move the resolved trick into one capture pile."
    );
    assert(
        snapshot.context.players.every((player) => {
            return getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(player.id)).length === 1;
        }),
        "Brisca-lite should refill both hands after the first trick while stock remains."
    );
    assert(
        getPileCards(snapshot.context.piles, BRISCA_LITE_STOCK_PILE_ID).length === 35,
        "Brisca-lite stock should drop by two cards after refilling both players."
    );
    assert(
        getPileCards(snapshot.context.piles, BRISCA_LITE_TRUMP_PILE_ID).length === 1,
        "Brisca-lite should keep the trump pile until the stock is exhausted."
    );
    assert(snapshot.context.trickWinnerId === null, "Brisca-lite should clear trickWinnerId before the next trick begins.");
    assert(snapshot.context.leadPlayerId !== null, "Brisca-lite should keep the next lead player after resolving the trick.");
    assert(
        snapshot.context.statusText.includes("Trick 2"),
        "Brisca-lite should announce the next trick after resolving the current one."
    );
}

async function main() {
    await runPokerLiteMachineTest();
    await runWarLiteMachineTest();
    runWarLiteGameOverRuleTest();
    await runWarLiteMachineGameOverTest();
    await runWarLiteShortDeckOptionTest();
    await runBriscaLiteMachineTest();
    console.log("gameMachines.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
