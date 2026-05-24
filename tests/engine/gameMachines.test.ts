import { createActor } from "xstate";

import {
    frenchDeckDefinition,
    spanishDeckDefinition
} from "@engine/engine/cards/deckDefinitions";
import { createDeck } from "@engine/engine/cards/createDeck";
import type { CardInstance, DeckDefinition } from "@engine/engine/cards/types";
import { isMoveCardEffect } from "@engine/engine/game/effects";
import { getPileCards, setPileCards } from "@engine/engine/game/piles";
import { BRISCA_LITE_STOCK_PILE_ID, BRISCA_LITE_TRICK_PILE_ID, BRISCA_LITE_TRUMP_PILE_ID } from "@engine/games/briscaLite/types";
import { createBriscaLiteMachine } from "@engine/games/briscaLite/machine";
import { getBriscaLiteCapturePileId, getBriscaLiteHandPileId } from "@engine/games/briscaLite/types";
import { createPokerLiteMachine } from "@engine/games/pokerLite/machine";
import { getPokerLiteHandPileId } from "@engine/games/pokerLite/types";
import { createWarLiteMachine } from "@engine/games/warLite/machine";
import { warLiteGameDefinition } from "@engine/games/warLite/definition";
import { createInitialContext as createInitialWarLiteContext } from "@engine/games/warLite/setup";
import { recycleEmptyPlayerStacks } from "@engine/games/warLite/rules";
import { getWarLiteCapturePileId, getWarLiteHandPileId, WAR_LITE_BATTLE_PILE_ID, WAR_LITE_DISCARD_PILE_ID } from "@engine/games/warLite/types";
import type { WarLiteContext } from "@engine/games/warLite/types";

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

const warTieDeckDefinition: DeckDefinition = {
    id: "war-tie",
    name: "War Tie Test Deck",
    suits: [
        { id: "test", label: "Test", shortLabel: "T" }
    ],
    ranks: [
        { id: "low", label: "Low", shortLabel: "L", sortOrder: 2 },
        { id: "mid", label: "Mid", shortLabel: "M", sortOrder: 10 },
        { id: "high", label: "High", shortLabel: "H", sortOrder: 14 }
    ]
};

function createWarTestCard(id: string, displayLabel: string, sortOrder: number): CardInstance {
    return {
        id,
        deckId: warTieDeckDefinition.id,
        suitId: "test",
        suitLabel: "Test",
        suitShortLabel: "T",
        rankId: id,
        rankLabel: displayLabel,
        rankShortLabel: displayLabel,
        sortOrder,
        displayLabel
    };
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
        battleSnapshot.context.lastEffects.filter((effect) => isMoveCardEffect(effect) && effect.reason === "play").length === 1,
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
        battleSnapshot.context.lastEffects.filter((effect) => isMoveCardEffect(effect) && effect.reason === "play").length === 1,
        "War Lite should emit one play effect when the second player reveals a battle card."
    );

    await waitFor(() => actor.getSnapshot().value === "resolvingBattle");
    battleSnapshot = actor.getSnapshot();
    assert(
        battleSnapshot.context.lastEffects.filter((effect) => isMoveCardEffect(effect) && effect.reason === "collect").length === 2,
        "War Lite should emit collect effects after both battle cards are revealed."
    );

    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" || snapshot.value === "gameOver";
    }, 5000);

    const afterBattle = actor.getSnapshot();
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
    const recycled = recycleEmptyPlayerStacks({
        ...afterBattle.context,
        piles: setPileCards(afterBattle.context.piles, winnerStackPileId, [])
    });
    assert(
        getPileCards(recycled.context.piles, winnerStackPileId).length === capturedCardCount,
        "War Lite should recycle a player's won pile into their stack when their stack is empty."
    );
    assert(
        getPileCards(recycled.context.piles, winnerCapturePileId).length === 0,
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
        snapshot.context.lastEffects.filter((effect) => isMoveCardEffect(effect) && effect.reason === "collect").length === 2,
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

function runWarLiteFullDeckAutoRunSmokeTest() {
    let state: WarLiteContext = warLiteGameDefinition.setup({
        playerNames: ["Avi", "Dany"],
        options: {
            deckDefinition: frenchDeckDefinition,
            random: createSeededRandom("war-full-smoke-1")
        }
    });
    let transition = warLiteGameDefinition.applyMove(state, {
        type: "prepare-shuffle",
        random: createSeededRandom("war-full-smoke-1")
    });
    state = transition.state;
    transition = warLiteGameDefinition.applyMove(state, { type: "deal-opening-hands" });
    state = transition.state;
    transition = warLiteGameDefinition.applyMove(state, { type: "prepare-battle" });
    state = transition.state;

    let stepCount = 0;
    const maxStepCount = 10000;

    while (!warLiteGameDefinition.isGameOver(state) && stepCount < maxStepCount) {
        const legalRevealMove = warLiteGameDefinition.getLegalMoves(state)[0];
        if (legalRevealMove) {
            transition = warLiteGameDefinition.applyMove(state, legalRevealMove);
            state = transition.state;
            transition = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" });
            state = transition.state;
        }

        const automaticMove = warLiteGameDefinition.getAutomaticMove?.(state);
        if (automaticMove) {
            transition = warLiteGameDefinition.applyMove(state, automaticMove);
            state = transition.state;
        }

        stepCount += 1;
    }

    assert(stepCount < maxStepCount, "War Lite full-deck smoke should finish before the safety step limit.");
    assert(warLiteGameDefinition.isGameOver(state), "War Lite full-deck smoke should reach game over.");
    assert(state.roundCards.length === 0, "War Lite full-deck smoke should not leave cards on the battle table.");
    assert(
        getPileCards(state.piles, WAR_LITE_BATTLE_PILE_ID).length === 0,
        "War Lite full-deck smoke should empty the battle pile at game over."
    );
    assert(
        state.winningPlayerIds.length >= 1,
        "War Lite full-deck smoke should expose at least one winner at game over."
    );
    assert(
        state.statusText.includes("wins War Lite") || state.statusText.includes("Tie"),
        "War Lite full-deck smoke should expose a final game-over status."
    );
}

async function runWarLiteManualWarSeedTest() {
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

    const beforeBattle = actor.getSnapshot();
    const firstPlayer = beforeBattle.context.players[0];
    const secondPlayer = beforeBattle.context.players[1];
    const firstPlayerCards = getPileCards(
        beforeBattle.context.piles,
        getWarLiteHandPileId(firstPlayer.id)
    );
    const secondPlayerCards = getPileCards(
        beforeBattle.context.piles,
        getWarLiteHandPileId(secondPlayer.id)
    );
    const firstPlayerTopCard = firstPlayerCards[firstPlayerCards.length - 1];
    const secondPlayerTopCard = secondPlayerCards[secondPlayerCards.length - 1];

    assert(
        firstPlayerTopCard?.sortOrder === secondPlayerTopCard?.sortOrder,
        "The documented war-manual-0 URL should start with a tied battle."
    );

    actor.send({ type: "PLAY_CARD" });
    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" && snapshot.context.comparisonCards.length === 1;
    }, 5000);
    actor.send({ type: "PLAY_CARD" });
    await waitFor(() => {
        const snapshot = actor.getSnapshot();
        return snapshot.value === "battleReady" && snapshot.context.warState?.stage === "face-down";
    }, 5000);

    const warSnapshot = actor.getSnapshot();
    assert(
        getPileCards(warSnapshot.context.piles, WAR_LITE_BATTLE_PILE_ID).length === 2,
        "The documented war-manual-0 URL should keep the tied cards in the battle pile."
    );
    assert(
        warSnapshot.context.statusText.includes("War!"),
        "The documented war-manual-0 URL should expose a War status after the first tie."
    );

    actor.stop();
}

function runWarLiteWarTieRuleTest() {
    const context = createInitialWarLiteContext(["Avi", "Dany"], warTieDeckDefinition, 5);
    const firstPlayer = context.players[0];
    const secondPlayer = context.players[1];
    assert(firstPlayer && secondPlayer, "War tie test requires two players.");

    const firstPlayerCards = [
        createWarTestCard("p1-war-up", "H1", 14),
        createWarTestCard("p1-down-3", "D3", 3),
        createWarTestCard("p1-down-2", "D2", 3),
        createWarTestCard("p1-down-1", "D1", 3),
        createWarTestCard("p1-tie", "T1", 10)
    ];
    const secondPlayerCards = [
        createWarTestCard("p2-war-up", "L1", 2),
        createWarTestCard("p2-down-3", "E3", 4),
        createWarTestCard("p2-down-2", "E2", 4),
        createWarTestCard("p2-down-1", "E1", 4),
        createWarTestCard("p2-tie", "T2", 10)
    ];
    let state = {
        ...context,
        piles: setPileCards(
            setPileCards(context.piles, getWarLiteHandPileId(firstPlayer.id), firstPlayerCards),
            getWarLiteHandPileId(secondPlayer.id),
            secondPlayerCards
        )
    };

    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    let transition = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" });
    state = transition.state;

    assert(state.warState?.stage === "face-down", "War Lite should enter face-down war setup after a tied battle.");
    assert(getPileCards(state.piles, WAR_LITE_BATTLE_PILE_ID).length === 2, "The tied cards should stay in the battle pile.");
    assert(getPileCards(state.piles, WAR_LITE_DISCARD_PILE_ID).length === 0, "Tied battle cards should not move to discard.");

    transition = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" });
    state = transition.state;
    assert(
        (transition.effects ?? []).filter((effect) => {
            return isMoveCardEffect(effect) && effect.reason === "play" && effect.card.isFaceUp === false;
        }).length === 6,
        "War Lite should place three face-down cards from each tied player."
    );
    assert(state.warState?.stage === "reveal", "War Lite should ask for face-up war cards after face-down placement.");
    assert(state.roundCards.length === 8, "The battle pot should contain tied cards plus six face-down war cards.");
    assert(state.comparisonCards.length === 0, "Face-down war cards should not be comparison cards.");

    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    transition = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" });
    state = transition.state;

    assert(
        (transition.effects ?? []).filter((effect) => isMoveCardEffect(effect) && effect.reason === "collect").length === 10,
        "War Lite should collect the full war pot after the face-up war cards resolve."
    );
    assert(state.warState === null, "War Lite should clear war state after the war resolves.");
    assert(
        state.winningPlayerIds.length === 1 && state.winningPlayerIds[0] === firstPlayer.id,
        "The player with the higher face-up war card should win the war."
    );
    assert(
        getPileCards(state.piles, getWarLiteCapturePileId(firstPlayer.id)).length === 10,
        "The war winner should collect all tied, face-down, and face-up war cards."
    );
    assert(getPileCards(state.piles, WAR_LITE_BATTLE_PILE_ID).length === 0, "The battle pile should be empty after collection.");
}

function createWarStateWithPlayerStacks(input: {
    firstPlayerCards: CardInstance[];
    secondPlayerCards: CardInstance[];
}) {
    const context = createInitialWarLiteContext(["Avi", "Dany"], warTieDeckDefinition, input.firstPlayerCards.length);
    const firstPlayer = context.players[0];
    const secondPlayer = context.players[1];
    assert(firstPlayer && secondPlayer, "War edge-case test requires two players.");

    return {
        firstPlayer,
        secondPlayer,
        state: {
            ...context,
            piles: setPileCards(
                setPileCards(context.piles, getWarLiteHandPileId(firstPlayer.id), input.firstPlayerCards),
                getWarLiteHandPileId(secondPlayer.id),
                input.secondPlayerCards
            )
        }
    };
}

function playInitialTieToWarFaceDown(state: WarLiteContext): WarLiteContext {
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    return warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
}

function runWarLiteShortWarStackRuleTest() {
    const { state: initialState } = createWarStateWithPlayerStacks({
        firstPlayerCards: [
            createWarTestCard("p1-war-up", "H1", 14),
            createWarTestCard("p1-down-1", "D1", 3),
            createWarTestCard("p1-tie", "T1", 10)
        ],
        secondPlayerCards: [
            createWarTestCard("p2-war-up", "L1", 2),
            createWarTestCard("p2-down-1", "E1", 4),
            createWarTestCard("p2-tie", "T2", 10)
        ]
    });
    let state = playInitialTieToWarFaceDown(initialState);
    const transition = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" });
    state = transition.state;

    assert(state.warState?.stage === "reveal", "War Lite should continue to reveal when fewer than 3 face-down cards are available.");
    assert(
        (transition.effects ?? []).filter((effect) => {
            return isMoveCardEffect(effect) && effect.reason === "play" && effect.card.isFaceUp === false;
        }).length === 2,
        "War Lite should place only one face-down card per tied player when each has one spare card."
    );
    assert(state.roundCards.filter((card) => !card.isFaceUp).length === 2, "War Lite should expose only the available face-down war cards.");
}

function runWarLiteOneCardWarRuleTest() {
    const { firstPlayer, state: initialState } = createWarStateWithPlayerStacks({
        firstPlayerCards: [
            createWarTestCard("p1-war-up", "H1", 14),
            createWarTestCard("p1-tie", "T1", 10)
        ],
        secondPlayerCards: [
            createWarTestCard("p2-war-up", "L1", 2),
            createWarTestCard("p2-tie", "T2", 10)
        ]
    });
    let state = playInitialTieToWarFaceDown(initialState);
    let transition = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" });
    state = transition.state;

    assert(state.warState?.stage === "reveal", "War Lite should skip face-down cards when tied players have exactly one card left.");
    assert(
        (transition.effects ?? []).filter((effect) => isMoveCardEffect(effect) && effect.card.isFaceUp === false).length === 0,
        "War Lite should not emit face-down play effects when tied players only have the comparison card."
    );

    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    transition = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" });
    state = transition.state;

    assert(state.warState === null, "War Lite should resolve a one-card war after each tied player reveals the final card.");
    assert(
        state.winningPlayerIds.length === 1 && state.winningPlayerIds[0] === firstPlayer.id,
        "War Lite should award a one-card war to the higher revealed comparison card."
    );
    assert(
        (transition.effects ?? []).filter((effect) => isMoveCardEffect(effect) && effect.reason === "collect").length === 4,
        "War Lite should collect the two tied cards and two final comparison cards in a one-card war."
    );
}

function runWarLiteRepeatedTieWarRuleTest() {
    const { state: initialState } = createWarStateWithPlayerStacks({
        firstPlayerCards: [
            createWarTestCard("p1-extra", "H1", 14),
            createWarTestCard("p1-war-tie", "W1", 9),
            createWarTestCard("p1-down-3", "D3", 3),
            createWarTestCard("p1-down-2", "D2", 3),
            createWarTestCard("p1-down-1", "D1", 3),
            createWarTestCard("p1-tie", "T1", 10)
        ],
        secondPlayerCards: [
            createWarTestCard("p2-extra", "L1", 2),
            createWarTestCard("p2-war-tie", "W2", 9),
            createWarTestCard("p2-down-3", "E3", 4),
            createWarTestCard("p2-down-2", "E2", 4),
            createWarTestCard("p2-down-1", "E1", 4),
            createWarTestCard("p2-tie", "T2", 10)
        ]
    });
    let state = playInitialTieToWarFaceDown(initialState);
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    const transition = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" });
    state = transition.state;

    assert(state.warState?.stage === "face-down", "War Lite should start a second war when war reveal cards tie.");
    assert(state.warState.depth === 2, "War Lite should increment war depth after a tie inside War.");
    assert(getPileCards(state.piles, WAR_LITE_BATTLE_PILE_ID).length === 10, "War Lite should keep the full first war pot for the next war.");
    assert((transition.effects ?? []).length === 0, "War Lite should not collect cards when a tie inside War starts another war.");
}

function runWarLiteUnresolvedWarRuleTest() {
    const { state: initialState } = createWarStateWithPlayerStacks({
        firstPlayerCards: [
            createWarTestCard("p1-tie", "T1", 10)
        ],
        secondPlayerCards: [
            createWarTestCard("p2-tie", "T2", 10)
        ]
    });
    let state = warLiteGameDefinition.applyMove(initialState, { type: "reveal-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" }).state;
    state = warLiteGameDefinition.applyMove(state, { type: "reveal-battle" }).state;
    const transition = warLiteGameDefinition.applyMove(state, { type: "finalize-battle" });
    state = transition.state;

    assert(state.warState === null, "War Lite should clear war state when no tied player can continue.");
    assert(state.winningPlayerIds.length === 0, "War Lite unresolved war should not award a winner.");
    assert(
        getPileCards(state.piles, WAR_LITE_DISCARD_PILE_ID).length === 2,
        "War Lite unresolved war should move tied cards to the discard pile."
    );
    assert(
        getPileCards(state.piles, WAR_LITE_BATTLE_PILE_ID).length === 0,
        "War Lite unresolved war should clear the battle pile."
    );
    assert(
        (transition.effects ?? []).filter((effect) => isMoveCardEffect(effect) && effect.reason === "collect").length === 2,
        "War Lite unresolved war should emit collect effects for the unresolved pot."
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
        getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(currentPlayer.id)).length === 1,
        "Brisca-lite first player should have drawn one card after playing (sequential draw rule)."
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
        snapshot.context.lastEffects.filter((effect) => isMoveCardEffect(effect) && effect.reason === "collect").length === 2,
        "Brisca-lite should emit collect effects when moving trick cards to the winner capture pile."
    );
    assert(
        snapshot.context.lastEffects.filter((effect) => isMoveCardEffect(effect) && effect.reason === "draw").length === 1,
        "Brisca-lite advance-next-trick should emit one draw effect (last player; first player drew earlier in advance-next-player)."
    );
    assert(snapshot.context.roundCards.length === 0, "Brisca-lite should clear the trick cards after the trick resolves.");
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
    runWarLiteFullDeckAutoRunSmokeTest();
    await runWarLiteManualWarSeedTest();
    runWarLiteWarTieRuleTest();
    runWarLiteShortWarStackRuleTest();
    runWarLiteOneCardWarRuleTest();
    runWarLiteRepeatedTieWarRuleTest();
    runWarLiteUnresolvedWarRuleTest();
    await runBriscaLiteMachineTest();
    console.log("gameMachines.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
