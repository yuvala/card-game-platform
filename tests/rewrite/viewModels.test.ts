import { createActor } from "xstate";

import { frenchDeckDefinition, spanishDeckDefinition } from "../../html/src/rewrite/engine/cards/deckDefinitions";
import { createBriscaLiteMachine } from "../../html/src/rewrite/games/briscaLite/machine";
import { getBriscaLiteViewModel } from "../../html/src/rewrite/games/briscaLite/viewModel";
import { createPokerLiteMachine } from "../../html/src/rewrite/games/pokerLite/machine";
import { getPokerLiteViewModel } from "../../html/src/rewrite/games/pokerLite/viewModel";
import { createWarLiteMachine } from "../../html/src/rewrite/games/warLite/machine";
import { getWarLiteViewModel } from "../../html/src/rewrite/games/warLite/viewModel";

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
            throw new Error("Timed out while waiting for a view-model test state.");
        }

        await wait(25);
    }
}

async function runWarLiteViewModelTest() {
    const machine = createWarLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "battleReady");

    let viewModel = getWarLiteViewModel(actor.getSnapshot());
    assert(viewModel.outcome === null, "War Lite should not expose an outcome before gameOver.");
    assert(viewModel.drawPileLabel === "", "War Lite should not expose a central draw-pile label.");
    assert(viewModel.discardPileLabel === "", "War Lite should not expose a central discard-pile label.");
    assert(
        viewModel.piles.length === viewModel.players.length &&
            viewModel.piles.every((pile) => pile.role === "capture" && Boolean(pile.ownerId)),
        "War Lite should expose only per-player capture piles in the view model."
    );
    assert(
        viewModel.players.filter((player) => player.canInteract).length === 1,
        "War Lite should expose exactly one clickable player stack before each reveal."
    );
    assert(
        viewModel.players.every((player) => {
            return player.hand.length <= 1 && player.hand.every((card) => !card.isFaceUp && (card.stackCount ?? 0) > 0);
        }),
        "War Lite should render each player stack as one hidden stack preview card."
    );

    const firstPlayerId = viewModel.players.find((player) => player.canInteract)?.id;
    actor.send({ type: "PLAY_CARD" });
    await waitFor(() => actor.getSnapshot().value === "battleReady" && actor.getSnapshot().context.roundCards.length === 1);

    viewModel = getWarLiteViewModel(actor.getSnapshot());
    const activePlayers = viewModel.players.filter((player) => player.canInteract);
    assert(activePlayers.length === 1, "War Lite should keep exactly one clickable stack after the first reveal.");
    assert(
        activePlayers[0].id !== firstPlayerId,
        "War Lite should move the clickable stack to the next player after the first reveal."
    );
    assert(
        viewModel.tableCards.length === 0,
        "War Lite should keep table-card visuals hidden while waiting for the next reveal."
    );

    actor.send({ type: "PLAY_CARD" });
    viewModel = getWarLiteViewModel(actor.getSnapshot());
    assert(
        viewModel.tableCards.length === 2 && viewModel.tableCards.every((card) => card.isFaceUp),
        "War Lite should expose both revealed battle cards while resolving a complete battle."
    );
}

async function runPokerLiteViewModelTest() {
    const machine = createPokerLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: 1,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    let viewModel = getPokerLiteViewModel(actor.getSnapshot());
    assert(viewModel.outcome === null, "Poker Lite should not expose an outcome during playerTurn.");
    assert(
        viewModel.piles.length === 2 &&
            viewModel.piles[0].role === "draw" &&
            viewModel.piles[1].role === "discard",
        "Poker Lite should expose one draw pile and one discard pile."
    );
    assert(
        viewModel.players.filter((player) => player.canInteract).length === 1,
        "Poker Lite should expose exactly one interactive player during playerTurn."
    );
    assert(
        viewModel.players.every((player) => {
            return player.hand.length === 1 && player.hand.every((card) => card.isFaceUp);
        }),
        "Poker Lite should expose all player hand cards face-up in the view model."
    );
    assert(
        viewModel.controls.canPlay === false,
        "Poker Lite should not allow Play Card before a card is selected."
    );

    const activePlayer = viewModel.players.find((player) => player.canInteract);
    const selectedCardId = activePlayer?.hand[0]?.id;
    assert(typeof selectedCardId === "string", "Poker Lite should expose a selectable card for the active player.");

    actor.send({ type: "SELECT_CARD", cardId: selectedCardId });
    viewModel = getPokerLiteViewModel(actor.getSnapshot());
    assert(viewModel.selectedCardId === selectedCardId, "Poker Lite should expose the selected card id.");
    assert(viewModel.controls.canPlay === true, "Poker Lite should allow Play Card after a card is selected.");

    actor.send({ type: "PLAY_CARD" });
    viewModel = getPokerLiteViewModel(actor.getSnapshot());
    assert(
        viewModel.effects.some((effect) => effect.type === "move-card" && effect.reason === "play"),
        "Poker Lite should expose a play effect after Play Card."
    );
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    viewModel = getPokerLiteViewModel(actor.getSnapshot());
    const secondActivePlayer = viewModel.players.find((player) => player.canInteract);
    const secondCardId = secondActivePlayer?.hand[0]?.id;
    assert(typeof secondCardId === "string", "Poker Lite should expose a selectable card for the second player.");
    actor.send({ type: "SELECT_CARD", cardId: secondCardId });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "gameOver");

    viewModel = getPokerLiteViewModel(actor.getSnapshot());
    assert(viewModel.controls.canRestart === true, "Poker Lite should enable Restart at gameOver.");
    assert(viewModel.controls.canPlay === false, "Poker Lite should not allow Play Card at gameOver.");
    assert(viewModel.outcome !== null, "Poker Lite should expose a generic outcome at gameOver.");
    assert(
        viewModel.outcome?.winnerPlayerIds.length === actor.getSnapshot().context.winningPlayerIds.length,
        "Poker Lite outcome should mirror the game winner ids."
    );
    assert(
        viewModel.players.every((player) => player.canInteract === false),
        "Poker Lite should not expose interactive players at gameOver."
    );
}

async function runBriscaLiteViewModelTest() {
    const machine = createBriscaLiteMachine(["Avi", "Dany"], {
        deckDefinition: spanishDeckDefinition,
        cardsPerPlayer: 2,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    let viewModel = getBriscaLiteViewModel(actor.getSnapshot());
    assert(viewModel.outcome === null, "Brisca-lite should not expose an outcome during playerTurn.");
    const currentPlayer = viewModel.players.find((player) => player.isCurrentTurn);
    const waitingPlayers = viewModel.players.filter((player) => !player.isCurrentTurn);

    assert(
        viewModel.piles.some((pile) => pile.role === "draw") &&
            viewModel.piles.some((pile) => pile.role === "trump") &&
            viewModel.piles.filter((pile) => pile.role === "capture" && Boolean(pile.ownerId)).length === viewModel.players.length,
        "Brisca-lite should expose stock, trump, and one capture pile per player."
    );
    assert(Boolean(currentPlayer), "Brisca-lite should mark one current player during playerTurn.");
    assert(
        viewModel.players.filter((player) => player.canInteract).length === 1,
        "Brisca-lite should expose exactly one interactive player during playerTurn."
    );
    assert(
        currentPlayer?.hand.every((card) => card.isFaceUp),
        "Brisca-lite should reveal the current player's hand."
    );
    assert(
        waitingPlayers.every((player) => {
            return player.hand.every((card) => !card.isFaceUp);
        }),
        "Brisca-lite should keep non-current player hands hidden."
    );
    assert(
        viewModel.piles.find((pile) => pile.role === "trump")?.topCard?.isFaceUp === true,
        "Brisca-lite should expose the trump card face-up while trump exists."
    );

    const selectedCardId = currentPlayer?.hand[0]?.id;
    assert(typeof selectedCardId === "string", "Brisca-lite should expose a selectable card for the current player.");
    actor.send({ type: "SELECT_CARD", cardId: selectedCardId });
    actor.send({ type: "PLAY_CARD" });
    viewModel = getBriscaLiteViewModel(actor.getSnapshot());
    assert(
        viewModel.effects.some((effect) => effect.type === "move-card" && effect.reason === "play"),
        "Brisca-lite should expose a play effect after Play Card."
    );
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn" && actor.getSnapshot().context.roundCards.length === 1);

    viewModel = getBriscaLiteViewModel(actor.getSnapshot());
    assert(
        viewModel.tableCards.length === 1 && viewModel.tableCards[0].isFaceUp,
        "Brisca-lite should expose the first trick card on the table after the first play."
    );

    const respondingPlayer = viewModel.players.find((player) => player.canInteract);
    const responseCardId = respondingPlayer?.hand[0]?.id;
    assert(typeof responseCardId === "string", "Brisca-lite should expose a selectable response card.");
    actor.send({ type: "SELECT_CARD", cardId: responseCardId });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().context.round === 2);

    viewModel = getBriscaLiteViewModel(actor.getSnapshot());
    assert(viewModel.tableCards.length === 0, "Brisca-lite should clear table cards after resolving a trick.");
    assert(
        viewModel.piles.some((pile) => pile.role === "capture" && pile.cardCount === 2 && pile.topCard?.isFaceUp),
        "Brisca-lite should expose the won trick in one capture pile after resolution."
    );
}

async function main() {
    await runPokerLiteViewModelTest();
    await runBriscaLiteViewModelTest();
    await runWarLiteViewModelTest();
    console.log("viewModels.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
