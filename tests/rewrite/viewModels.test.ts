import { createActor } from "xstate";

import { frenchDeckDefinition, spanishDeckDefinition } from "@rewrite-core/engine/cards/deckDefinitions";
import { createBriscaLiteMachine } from "@rewrite-core/games/briscaLite/machine";
import { getBriscaLiteHandPileId } from "@rewrite-core/games/briscaLite/types";
import { getBriscaLiteViewModel } from "@rewrite-core/games/briscaLite/viewModel";
import { getPileCards } from "@rewrite-core/engine/game/piles";
import { createPokerLiteMachine } from "@rewrite-core/games/pokerLite/machine";
import { getPokerLiteHandPileId } from "@rewrite-core/games/pokerLite/types";
import { getPokerLiteViewModel } from "@rewrite-core/games/pokerLite/viewModel";
import { createWarLiteMachine } from "@rewrite-core/games/warLite/machine";
import { getWarLiteViewModel } from "@rewrite-core/games/warLite/viewModel";
import { getTableCardDisplayState, getTrickSeatCardDisplayState } from "../../html/src/rewrite/phaser/scenes/layout/tableCardLayouts";

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

function createSeededRandom(seed: string): () => number {
    let state = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        state ^= seed.charCodeAt(index);
        state = Math.imul(state, 16777619);
    }

    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
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
            viewModel.piles.every((pile) => {
                return pile.role === "capture" && Boolean(pile.ownerId) && pile.presentation === "capture-pile";
            }),
        "War Lite should expose only per-player capture piles in the view model."
    );
    assert(
        viewModel.players.filter((player) => player.canInteract).length === 1,
        "War Lite should expose exactly one clickable player stack before each reveal."
    );
    assert(
        viewModel.primaryAction?.eventType === "PLAY_CARD" &&
            viewModel.primaryAction.target?.type === "player-hand" &&
            viewModel.primaryAction.target.playerId === viewModel.players.find((player) => player.canInteract)?.id,
        "War Lite should expose the next player stack as the primary action target."
    );
    assert(
        viewModel.players.every((player) => {
            return (
                player.handPresentation === "hidden-stack" &&
                player.hand.length <= 1 &&
                player.hand.every((card) => !card.isFaceUp && (card.stackCount ?? 0) > 0)
            );
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
        viewModel.tablePileIds?.length === 1 &&
        viewModel.tablePresentation === "table-row" &&
        viewModel.tableCards.length === 1 && viewModel.tableCards[0].playerId === firstPlayerId,
        "War Lite should keep the first revealed card visible while waiting for the next player."
    );

    actor.send({ type: "PLAY_CARD" });
    viewModel = getWarLiteViewModel(actor.getSnapshot());
    assert(
        viewModel.tablePileIds?.length === 1 &&
        viewModel.tablePresentation === "table-row" &&
        viewModel.tableCards.length === 2 && viewModel.tableCards.every((card) => card.isFaceUp),
        "War Lite should expose both revealed battle cards while resolving a complete battle."
    );
}

async function runWarLiteWarPotViewModelTest() {
    const machine = createWarLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: 5,
        random: createSeededRandom("war-manual-0")
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "battleReady");

    actor.send({ type: "PLAY_CARD" });
    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" && snapshot.context.comparisonCards.length === 1;
    });
    actor.send({ type: "PLAY_CARD" });
    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" && snapshot.context.warState?.stage === "face-down";
    });
    actor.send({ type: "PLAY_CARD" });
    let snapshot = actor.getSnapshot();
    let viewModel = getWarLiteViewModel(snapshot);
    let playerPovViewModel = getWarLiteViewModel(snapshot, snapshot.context.players[0].id);
    const faceDownEffects = viewModel.effects.filter((effect) => {
        return effect.type === "move-card" && effect.reason === "play" && effect.key.startsWith("war-down-");
    });
    const faceDownPovEffects = playerPovViewModel.effects.filter((effect) => {
        return effect.type === "move-card" && effect.reason === "play";
    });
    assert(faceDownEffects.length === 6, "War Lite should expose six war-down move effects for the full face-down stack.");
    assert(
        faceDownEffects.every((effect) => {
            return effect.type === "move-card" && effect.fromFaceUp === false && effect.card.isFaceUp === false;
        }),
        "War Lite war-down effects should move hidden cards without triggering a reveal flip."
    );
    assert(
        faceDownPovEffects.length === 6 &&
            faceDownPovEffects.every((effect) => {
                return effect.type === "move-card" &&
                    effect.key.startsWith("hidden-effect:") &&
                    effect.card.label === "Hidden card" &&
                    effect.card.id.startsWith("hidden:effect:");
            }),
        "War Lite player POV should not leak face-down war card ids or labels through hidden move effects."
    );
    await waitFor(() => {
        const nextSnapshot = actor.getSnapshot();
        return nextSnapshot.value === "battleReady" && nextSnapshot.context.warState?.stage === "reveal";
    });

    snapshot = actor.getSnapshot();
    viewModel = getWarLiteViewModel(snapshot);
    const firstPlayerId = snapshot.context.players[0].id;
    const secondPlayerId = snapshot.context.players[1].id;
    playerPovViewModel = getWarLiteViewModel(snapshot, firstPlayerId);
    const firstPlayerTableCards = viewModel.tableCards.filter((card) => card.playerId === firstPlayerId);
    const secondPlayerTableCards = viewModel.tableCards.filter((card) => card.playerId === secondPlayerId);
    const firstPlayerOpenCardIndex = viewModel.tableCards.findIndex((card) => {
        return card.playerId === firstPlayerId && card.isFaceUp;
    });
    const firstPlayerHiddenCardIndex = viewModel.tableCards.findIndex((card) => {
        return card.playerId === firstPlayerId && !card.isFaceUp;
    });
    assert(firstPlayerOpenCardIndex >= 0, "War Lite view model should expose the first player's open tied card.");
    assert(firstPlayerHiddenCardIndex >= 0, "War Lite view model should expose the first player's face-down war card.");
    const firstPlayerOpenCardLayout = getTableCardDisplayState(viewModel.tableCards, firstPlayerOpenCardIndex);
    const firstPlayerHiddenCardLayout = getTableCardDisplayState(viewModel.tableCards, firstPlayerHiddenCardIndex);

    assert(snapshot.context.roundCards.length === 8, "War Lite should keep all tied and face-down cards in the raw war pot.");
    assert(viewModel.tableCards.length === 8, "War Lite view model should expose each war-pot card for stacked table rendering.");
    assert(
        firstPlayerTableCards.length === 4 && secondPlayerTableCards.length === 4,
        "War Lite view model should expose one visible card and three face-down war cards per tied player."
    );
    assert(
        viewModel.tableCards.filter((card) => card.isFaceUp).length === 2,
        "War Lite view model should keep the tied comparison cards visible under each player's war stack."
    );
    assert(
        playerPovViewModel.tableCards.filter((card) => !card.isFaceUp).every((card) => {
            return card.label === "Hidden card" && card.id.startsWith("hidden:table:");
        }),
        "War Lite player POV should not leak face-down war table card ids or labels."
    );
    assert(
        firstPlayerTableCards.filter((card) => !card.isFaceUp).length === 3 &&
            secondPlayerTableCards.filter((card) => !card.isFaceUp).length === 3,
        "War Lite view model should expose three face-down war cards for each tied player."
    );
    assert(
        firstPlayerHiddenCardLayout.stackIndex === 1 &&
            (firstPlayerHiddenCardLayout.x !== firstPlayerOpenCardLayout.x ||
                firstPlayerHiddenCardLayout.y !== firstPlayerOpenCardLayout.y) &&
            firstPlayerHiddenCardLayout.angle !== firstPlayerOpenCardLayout.angle,
        "War Lite table layout should place face-down war cards on the player's open card with a slight offset and tilt."
    );
    assert(
        viewModel.primaryAction?.label === "Reveal War Card",
        "War Lite should ask for the face-up war reveal after placing the face-down stack."
    );

    actor.send({ type: "PLAY_CARD" });
    snapshot = actor.getSnapshot();
    viewModel = getWarLiteViewModel(snapshot);
    const revealEffects = viewModel.effects.filter((effect) => {
        return effect.type === "move-card" && effect.reason === "play" && effect.key.startsWith("war-reveal-");
    });
    assert(revealEffects.length === 1, "War Lite should expose one war-reveal move effect for the first face-up war card.");
    assert(
        revealEffects.every((effect) => {
            return effect.type === "move-card" && effect.fromFaceUp === false && effect.card.isFaceUp === true;
        }),
        "War Lite war-reveal effects should mark a hidden source moving into a face-up card for the reveal animation."
    );
    await waitFor(() => {
        const nextSnapshot = actor.getSnapshot();
        return nextSnapshot.value === "battleReady" && nextSnapshot.context.comparisonCards.length === 1;
    });

    actor.stop();
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
            viewModel.piles[0].presentation === "hidden-stack" &&
            viewModel.piles[1].role === "discard" &&
            viewModel.piles[1].presentation === "face-up-stack",
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
    assert(
        viewModel.primaryAction?.label === "Select Card" &&
            viewModel.primaryAction.target?.type === "player-hand",
        "Poker Lite should ask the current player to select a card before play is enabled."
    );

    const activePlayer = viewModel.players.find((player) => player.canInteract);
    const selectedCardId = activePlayer?.hand[0]?.id;
    assert(typeof selectedCardId === "string", "Poker Lite should expose a selectable card for the active player.");

    actor.send({ type: "SELECT_CARD", cardId: selectedCardId });
    viewModel = getPokerLiteViewModel(actor.getSnapshot());
    assert(viewModel.selectedCardId === selectedCardId, "Poker Lite should expose the selected card id.");
    assert(viewModel.controls.canPlay === true, "Poker Lite should allow Play Card after a card is selected.");
    assert(viewModel.primaryAction?.label === "Play Card", "Poker Lite should switch the primary action after selection.");

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

async function runPlayerPovViewModelTest() {
    const machine = createPokerLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: 2,
        random: () => 0.5
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    const snapshot = actor.getSnapshot();
    const secondPlayerId = snapshot.context.players[1].id;
    const firstPlayerId = snapshot.context.players[0].id;
    const firstPlayerRawCardIds = new Set(
        getPileCards(snapshot.context.piles, getPokerLiteHandPileId(firstPlayerId)).map((card) => card.id)
    );
    const viewModel = getPokerLiteViewModel(snapshot, secondPlayerId);

    assert(
        viewModel.players[0].id === secondPlayerId,
        "Player POV should rotate the selected viewer to the bottom/player-zero seat."
    );
    assert(
        viewModel.players[0].hand.length === 2 && viewModel.players[0].hand.every((card) => card.isFaceUp),
        "Player POV should reveal the selected viewer's own hand."
    );
    assert(
        viewModel.players.slice(1).every((player) => {
            return player.hand.every((card) => !card.isFaceUp) && !player.canInteract;
        }),
        "Player POV should hide opponent hands and disable opponent card interaction."
    );
    assert(
        viewModel.players.slice(1).every((player) => {
            return player.hand.every((card) => card.label === "Hidden card" && !firstPlayerRawCardIds.has(card.id));
        }),
        "Player POV should not leak opponent card ids or labels in hidden hand payloads."
    );
    assert(
        viewModel.controls.canPlay === false && viewModel.primaryAction === null,
        "Player POV should not expose a play action when it is another player's turn."
    );

    actor.stop();
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
            viewModel.piles.some((pile) => pile.role === "draw" && pile.presentation === "hidden-stack") &&
            viewModel.piles.some((pile) => pile.role === "trump" && pile.presentation === "single-card") &&
            viewModel.piles.filter((pile) => {
                return pile.role === "capture" && Boolean(pile.ownerId) && pile.presentation === "capture-pile";
            }).length === viewModel.players.length,
        "Brisca-lite should expose stock, trump, and one capture pile per player."
    );
    assert(Boolean(currentPlayer), "Brisca-lite should mark one current player during playerTurn.");
    assert(
        viewModel.players.filter((player) => player.canInteract).length === 1,
        "Brisca-lite should expose exactly one interactive player during playerTurn."
    );
    assert(
        viewModel.primaryAction?.label === "Select Card" &&
            viewModel.primaryAction.target?.type === "player-hand",
        "Brisca-lite should ask the current player to select a card before play is enabled."
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
    if (currentPlayer) {
        const povViewModel = getBriscaLiteViewModel(actor.getSnapshot(), currentPlayer.id);
        assert(
            povViewModel.players.slice(1).every((player) => {
                const rawIds = new Set(
                    getPileCards(actor.getSnapshot().context.piles, getBriscaLiteHandPileId(player.id)).map((card) => card.id)
                );
                return player.hand.every((card) => card.label === "Hidden card" && !rawIds.has(card.id));
            }),
            "Brisca-lite player POV should not leak opponent card ids or labels in hidden hand payloads."
        );
    }
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
        viewModel.tablePileIds?.length === 1 &&
        viewModel.tableCards.length === 1 && viewModel.tableCards[0].isFaceUp &&
            viewModel.tablePresentation === "trick-seats",
        "Brisca-lite should expose the first trick card on the table after the first play."
    );
    const firstTrickCardPosition = getTrickSeatCardDisplayState({
        cards: viewModel.tableCards,
        players: viewModel.players,
        index: 0
    });
    assert(
        firstTrickCardPosition.y > 360,
        "Brisca-lite should place the first player's trick card near that player's table side."
    );

    const respondingPlayer = viewModel.players.find((player) => player.canInteract);
    const responseCardId = respondingPlayer?.hand[0]?.id;
    assert(typeof responseCardId === "string", "Brisca-lite should expose a selectable response card.");
    actor.send({ type: "SELECT_CARD", cardId: responseCardId });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });
    viewModel = getBriscaLiteViewModel(actor.getSnapshot());
    assert(viewModel.tableCards.length === 2, "Brisca-lite should expose both trick cards before animation completes.");
    const secondTrickCardPosition = getTrickSeatCardDisplayState({
        cards: viewModel.tableCards,
        players: viewModel.players,
        index: 1
    });
    assert(
        firstTrickCardPosition.y !== secondTrickCardPosition.y ||
            firstTrickCardPosition.x !== secondTrickCardPosition.x,
        "Brisca-lite trick-seat layout should give different players different trick-card slots."
    );
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
    await runPlayerPovViewModelTest();
    await runBriscaLiteViewModelTest();
    await runWarLiteViewModelTest();
    await runWarLiteWarPotViewModelTest();
    console.log("viewModels.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
