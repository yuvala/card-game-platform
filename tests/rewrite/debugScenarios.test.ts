import { createActor } from "xstate";

import { frenchDeckDefinition } from "@rewrite-core/engine/cards/deckDefinitions";
import { createWarLiteMachine } from "@rewrite-core/games/warLite/machine";
import { getRewriteDebugScenarioById } from "../../html/src/rewrite/app/debugScenarios";

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
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

async function runWarAnimationDebugScenarioTest() {
    const scenario = getRewriteDebugScenarioById("war-animation");
    assert(scenario, "war-animation debug scenario should be registered.");
    assert(scenario.selection.gameId === "war-lite", "war-animation should target War Lite.");
    assert(scenario.cardsPerPlayer === 5, "war-animation should deal enough cards to place three face-down war cards.");
    assert(typeof scenario.seed === "string", "war-animation should use a deterministic seed.");
    assert(scenario.run, "war-animation should expose a scenario runner.");

    const machine = createWarLiteMachine(["Avi", "Dany"], {
        deckDefinition: frenchDeckDefinition,
        cardsPerPlayer: scenario.cardsPerPlayer,
        random: createSeededRandom(scenario.seed)
    });
    const actor = createActor(machine);

    actor.start();
    actor.send({ type: "START" });
    await scenario.run(actor);

    const snapshot = actor.getSnapshot();
    assert(snapshot.value === "battleReady", "war-animation should leave the actor ready for the next War action.");
    assert(snapshot.context.warState?.stage === "face-down", "war-animation should pause before placing face-down war cards.");
    assert(snapshot.context.roundCards.length === 2, "war-animation should keep the two tied cards on the table.");
    assert(
        snapshot.context.roundCards.every((playedCard) => playedCard.isFaceUp),
        "war-animation should pause with only the tied comparison cards face-up."
    );

    actor.stop();
}

async function main() {
    await runWarAnimationDebugScenarioTest();
    console.log("debugScenarios.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
