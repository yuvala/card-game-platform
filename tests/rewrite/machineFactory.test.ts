import { createActor } from "xstate";

import type { GameDefinition } from "@rewrite-core/engine/game/definition";
import { createCardGameMachine } from "@rewrite-core/engine/game/machineFactory";
import type { CardGameEvent } from "@rewrite-core/engine/game/types";

declare const process: { exitCode?: number };

type TestMove =
    | { type: "prepare-shuffle" }
    | { type: "deal-opening-hands" }
    | { type: "begin-turn" }
    | { type: "select-card"; cardId: string }
    | { type: "queue-play" }
    | { type: "commit-play" }
    | { type: "finalize-turn" }
    | { type: "advance-next-round" }
    | { type: "finish-game" };

type TimedMove =
    | { type: "prepare-shuffle" }
    | { type: "deal-opening-hands" }
    | { type: "prepare-battle" }
    | { type: "reveal-battle" }
    | { type: "finalize-battle" }
    | { type: "advance-next-round" }
    | { type: "finish-game" };

interface TestContext {
    selectedCardId: string | null;
    roundsRemaining: number;
    log: string[];
}

interface TimedContext {
    roundsRemaining: number;
    log: string[];
}

type TestEvent = CardGameEvent;
type TestOptions = Record<string, never>;

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

async function waitFor(condition: () => boolean, timeoutMs = 250) {
    const startedAt = Date.now();

    while (!condition()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out while waiting for machine state.");
        }

        await wait(5);
    }
}

const eventDefinition: GameDefinition<TestContext, TestMove, unknown, never, TestOptions, string, unknown> = {
    id: "test-event-machine",
    name: "Test Event Machine",
    setup() {
        return {
            selectedCardId: null,
            roundsRemaining: 1,
            log: ["setup"]
        };
    },
    getLegalMoves(state) {
        const moves: TestMove[] = [];

        if (state.selectedCardId) {
            moves.push({ type: "queue-play" });
        }

        return moves;
    },
    applyMove(state, move) {
        switch (move.type) {
            case "prepare-shuffle":
                return { state: { ...state, log: state.log.concat("shuffle") } };
            case "deal-opening-hands":
                return { state: { ...state, log: state.log.concat("deal") } };
            case "begin-turn":
                return { state: { ...state, selectedCardId: null, log: state.log.concat("ready") } };
            case "select-card":
                return {
                    state: {
                        ...state,
                        selectedCardId: move.cardId,
                        log: state.log.concat(`select:${move.cardId}`)
                    }
                };
            case "queue-play":
                return { state: { ...state, log: state.log.concat("queue") } };
            case "commit-play":
                return { state: { ...state, log: state.log.concat(`commit:${state.selectedCardId ?? "none"}`) } };
            case "finalize-turn":
                return {
                    state: {
                        ...state,
                        selectedCardId: null,
                        log: state.log.concat("finalize")
                    }
                };
            case "advance-next-round":
                return {
                    state: {
                        ...state,
                        roundsRemaining: state.roundsRemaining - 1,
                        log: state.log.concat("advance")
                    }
                };
            case "finish-game":
                return {
                    state: {
                        ...state,
                        log: state.log.concat("finish")
                    }
                };
        }
    },
    isGameOver(state) {
        return state.roundsRemaining < 0;
    },
    getAutomaticMove(state) {
        if (state.roundsRemaining > 0) {
            return { type: "advance-next-round" };
        }

        return { type: "finish-game" };
    }
};

const timedDefinition: GameDefinition<TimedContext, TimedMove, unknown, never, TestOptions, string, unknown> = {
    id: "test-timed-machine",
    name: "Test Timed Machine",
    setup() {
        return {
            roundsRemaining: 0,
            log: ["setup"]
        };
    },
    getLegalMoves() {
        return [{ type: "reveal-battle" }];
    },
    applyMove(state, move) {
        switch (move.type) {
            case "prepare-shuffle":
                return { state: { ...state, log: state.log.concat("shuffle") } };
            case "deal-opening-hands":
                return { state: { ...state, log: state.log.concat("deal") } };
            case "prepare-battle":
                return { state: { ...state, log: state.log.concat("ready") } };
            case "reveal-battle":
                return { state: { ...state, log: state.log.concat("reveal") } };
            case "finalize-battle":
                return { state: { ...state, log: state.log.concat("finalize") } };
            case "advance-next-round":
                return { state: { ...state, roundsRemaining: state.roundsRemaining - 1, log: state.log.concat("advance") } };
            case "finish-game":
                return { state: { ...state, log: state.log.concat("finish") } };
        }
    },
    isGameOver(state) {
        return state.roundsRemaining < 0;
    },
    getAutomaticMove(state) {
        if (state.roundsRemaining > 0) {
            return { type: "advance-next-round" };
        }

        return { type: "finish-game" };
    }
};

async function runEventAnimationMachineTest() {
    const machine = createCardGameMachine<TestContext, TestEvent, TestMove, TestOptions>({
        definition: eventDefinition,
        playerNames: ["Avi", "Dany"],
        definitionOptions: {},
        prepareShuffleMove: { type: "prepare-shuffle" },
        prepareDealMove: { type: "deal-opening-hands" },
        flow: {
            readyState: "playerTurn",
            resolvingState: "resolvingTurn",
            shuffleDelayMs: 1,
            dealDelayMs: 1,
            resolveDelayMs: 1,
            prepareReadyMove: { type: "begin-turn" },
            selectCardMove: (cardId) => ({ type: "select-card", cardId }),
            playMove: { type: "queue-play" },
            playGuardMoveType: "queue-play",
            animation: {
                kind: "event",
                state: "animatingPlay",
                commitMove: { type: "commit-play" }
            },
            finalizeMove: { type: "finalize-turn" },
            resolutionTargets: [
                {
                    automaticMoveType: "advance-next-round",
                    target: "playerTurn"
                }
            ]
        }
    });

    const actor = createActor(machine);
    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");

    let snapshot = actor.getSnapshot();
    assert(snapshot.value === "playerTurn", "Machine should reach the ready state after start.");
    assert(
        !snapshot.context.log.includes("queue"),
        "Machine should not queue a play before a legal move exists."
    );

    actor.send({ type: "PLAY_CARD" });
    await wait(5);
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "playerTurn", "Illegal PLAY_CARD should keep the machine in the ready state.");

    actor.send({ type: "SELECT_CARD", cardId: "card-1" });
    snapshot = actor.getSnapshot();
    assert(
        snapshot.context.selectedCardId === "card-1",
        "SELECT_CARD should update the selected card through the definition."
    );

    actor.send({ type: "PLAY_CARD" });
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "animatingPlay", "Legal PLAY_CARD should move to the animation state.");

    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "playerTurn");
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "playerTurn", "First resolve should loop back to the ready state.");
    assert(
        snapshot.context.log.includes("advance"),
        "Resolution target should apply the automatic move before returning to ready."
    );

    actor.send({ type: "SELECT_CARD", cardId: "card-2" });
    actor.send({ type: "PLAY_CARD" });
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "gameOver");
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "gameOver", "Fallback resolution should end the machine in gameOver.");
    assert(snapshot.context.log.includes("finish"), "Fallback resolution should apply the game-over move.");

    actor.send({ type: "RESTART" });
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "idle", "RESTART should return the machine to idle.");
    assert(snapshot.context.log[0] === "setup", "RESTART should rebuild the initial context.");
}

async function runTimedAnimationMachineTest() {
    const machine = createCardGameMachine<TimedContext, TestEvent, TimedMove, TestOptions>({
        definition: timedDefinition,
        playerNames: ["Avi", "Dany"],
        definitionOptions: {},
        prepareShuffleMove: { type: "prepare-shuffle" },
        prepareDealMove: { type: "deal-opening-hands" },
        flow: {
            readyState: "battleReady",
            resolvingState: "resolvingBattle",
            shuffleDelayMs: 1,
            dealDelayMs: 1,
            resolveDelayMs: 1,
            prepareReadyMove: { type: "prepare-battle" },
            playMove: { type: "reveal-battle" },
            playGuardMoveType: "reveal-battle",
            animation: {
                kind: "timed",
                state: "revealingBattle",
                delayMs: 1
            },
            finalizeMove: { type: "finalize-battle" },
            resolutionTargets: [
                {
                    automaticMoveType: "advance-next-round",
                    target: "battleReady"
                }
            ]
        }
    });

    const actor = createActor(machine);
    actor.start();
    actor.send({ type: "START" });
    await waitFor(() => actor.getSnapshot().value === "dealing");
    actor.send({ type: "ANIMATION_DONE" });
    await waitFor(() => actor.getSnapshot().value === "battleReady");

    let snapshot = actor.getSnapshot();
    assert(snapshot.value === "battleReady", "Timed machine should reach its ready state.");

    actor.send({ type: "PLAY_CARD" });
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "revealingBattle", "Timed animation machine should enter the timed animation state.");

    await waitFor(() => actor.getSnapshot().value === "gameOver");
    snapshot = actor.getSnapshot();
    assert(snapshot.value === "gameOver", "Timed animation flow should finish after auto-resolution.");
    assert(snapshot.context.log.includes("reveal"), "Timed animation flow should still apply the play move.");
    assert(snapshot.context.log.includes("finalize"), "Timed animation flow should finalize after the delay.");
}

async function main() {
    await runEventAnimationMachineTest();
    await runTimedAnimationMachineTest();
    console.log("machineFactory.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
