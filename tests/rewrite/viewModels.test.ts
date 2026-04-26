import { createActor } from "xstate";

import { frenchDeckDefinition } from "../../html/src/rewrite/engine/cards/deckDefinitions";
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
}

async function main() {
    await runWarLiteViewModelTest();
    console.log("viewModels.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
