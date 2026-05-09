import type { CardGameSession } from "@engine/engine/game/session";

interface DebugSnapshot {
    value: unknown;
    context?: {
        comparisonCards?: unknown[];
        warState?: {
            stage?: string;
        } | null;
    };
}

export function runDebugScenario(
    scenarioId: string | undefined,
    session: CardGameSession<any>
): void {
    if (scenarioId !== "war-animation") {
        return;
    }

    runWarAnimationScenario(session as CardGameSession<DebugSnapshot>).catch((error) => {
        console.error("Rewrite server debug scenario failed:", error);
    });
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function waitForSessionSnapshot(
    session: CardGameSession<DebugSnapshot>,
    condition: (snapshot: DebugSnapshot) => boolean,
    timeoutMs = 15000
): Promise<void> {
    const startedAt = Date.now();

    while (!condition(session.getSnapshot())) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out while running server debug scenario.");
        }

        await wait(25);
    }
}

async function settleDealing(session: CardGameSession<DebugSnapshot>): Promise<void> {
    await waitForSessionSnapshot(session, (snapshot) => snapshot.value === "dealing");
    await wait(650);
    if (session.getSnapshot().value === "dealing") {
        session.send({ type: "ANIMATION_DONE" });
    }
    await waitForSessionSnapshot(session, (snapshot) => snapshot.value === "battleReady");
}

async function runWarAnimationScenario(session: CardGameSession<DebugSnapshot>): Promise<void> {
    await settleDealing(session);

    session.send({ type: "PLAY_CARD" });
    await waitForSessionSnapshot(session, (snapshot) => {
        return snapshot.value === "battleReady" && (snapshot.context?.comparisonCards?.length ?? 0) === 1;
    });

    session.send({ type: "PLAY_CARD" });
    await waitForSessionSnapshot(session, (snapshot) => {
        return snapshot.value === "battleReady" && snapshot.context?.warState?.stage === "face-down";
    });
}
