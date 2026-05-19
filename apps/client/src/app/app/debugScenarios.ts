import type { SupportedDeckId } from "@engine/engine/cards/deckDefinitions";
import type { CardGameActor } from "@engine/engine/game/viewModel";
import type { GameSelection } from "./createGamePanel";

interface DebugSnapshot {
    value: unknown;
    context?: {
        comparisonCards?: unknown[];
        roundCards?: unknown[];
        warState?: {
            stage?: string;
        } | null;
    };
}

export interface DebugScenario {
    id: string;
    label: string;
    description: string;
    selection: GameSelection;
    cardsPerPlayer?: number;
    seed?: string;
    autostart: boolean;
    run?: (actor: CardGameActor<DebugSnapshot>) => Promise<void>;
}

const WAR_ANIMATION_SCENARIO_ID = "war-animation";

export const DebugScenarios: readonly DebugScenario[] = [
    {
        id: WAR_ANIMATION_SCENARIO_ID,
        label: "War Animation",
        description: "Starts War Lite and pauses on War 1 before the face-down war cards are placed.",
        selection: {
            gameId: "war-lite",
            playerCount: 2,
            deckId: "french" as SupportedDeckId
        },
        cardsPerPlayer: 5,
        seed: "war-manual-0",
        autostart: true,
        run: runWarAnimationScenario
    }
];

export function getDebugScenarioById(id: string | null | undefined): DebugScenario | null {
    if (!id) {
        return null;
    }

    return DebugScenarios.find((scenario) => scenario.id === id) ?? null;
}

function getSnapshotValue(actor: CardGameActor<DebugSnapshot>): string {
    return String(actor.getSnapshot().value);
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        globalThis.setTimeout(resolve, ms);
    });
}

function waitForActorSnapshot(
    actor: CardGameActor<DebugSnapshot>,
    condition: (snapshot: DebugSnapshot) => boolean,
    timeoutMs = 15000
): Promise<void> {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        let subscription: { unsubscribe(): void } | null = null;
        let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

        const finish = (error?: Error) => {
            if (timeoutId) {
                globalThis.clearTimeout(timeoutId);
            }
            subscription?.unsubscribe();
            if (error) {
                reject(error);
                return;
            }

            resolve();
        };

        const check = (snapshot: DebugSnapshot) => {
            if (condition(snapshot)) {
                finish();
                return;
            }

            if (Date.now() - startedAt > timeoutMs) {
                finish(new Error("Timed out while running debug scenario."));
            }
        };

        subscription = actor.subscribe(check);
        timeoutId = globalThis.setTimeout(() => {
            finish(new Error("Timed out while running debug scenario."));
        }, timeoutMs);
        check(actor.getSnapshot());
    });
}

async function settleDealing(actor: CardGameActor<DebugSnapshot>): Promise<void> {
    await waitForActorSnapshot(actor, (snapshot) => snapshot.value === "dealing");
    await delay(650);
    if (getSnapshotValue(actor) === "dealing") {
        actor.send({ type: "ANIMATION_DONE" });
    }
    await waitForActorSnapshot(actor, (snapshot) => snapshot.value === "battleReady");
}

async function runWarAnimationScenario(actor: CardGameActor<DebugSnapshot>): Promise<void> {
    await settleDealing(actor);

    actor.send({ type: "PLAY_CARD" });
    await waitForActorSnapshot(actor, (snapshot) => {
        return snapshot.value === "battleReady" && (snapshot.context?.comparisonCards?.length ?? 0) === 1;
    });

    actor.send({ type: "PLAY_CARD" });
    await waitForActorSnapshot(actor, (snapshot) => {
        return snapshot.value === "battleReady" && snapshot.context?.warState?.stage === "face-down";
    });
}
