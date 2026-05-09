import type { CardGameViewModel } from "@engine/engine/game/viewModel";
import { getPlayerPovPresentation } from "../../html/src/app/player/playerPovPresentation";

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function createBaseViewModel(input?: Partial<CardGameViewModel>): CardGameViewModel {
    return {
        phaseLabel: "PLAYER_TURN",
        roundLabel: "Round 1",
        deckId: "french",
        cardSkinId: "vintage-european",
        deckLabel: "French Deck",
        drawPileLabel: "",
        discardPileLabel: "",
        discardCardLabel: null,
        scoreLines: [],
        statusText: "",
        selectedCardId: null,
        players: [],
        tableCards: [],
        tablePresentation: "table-row",
        tablePileIds: [],
        piles: [],
        controls: {
            canStart: false,
            canPlay: false,
            canRestart: false
        },
        outcome: null,
        primaryAction: null,
        animation: null,
        effects: [],
        ...input
    };
}

function runBriscaPresentationTest(): void {
    const presentation = getPlayerPovPresentation(createBaseViewModel({
        deckLabel: "Spanish Deck | Trump: Oros",
        roundLabel: "Trick 1 / 8",
        piles: [
            {
                id: "stock",
                role: "draw",
                label: "Stock",
                cardCount: 24,
                countLabel: "24 + trump",
                topCard: null,
                presentation: "hidden-stack"
            },
            {
                id: "trump",
                role: "trump",
                label: "Trump",
                cardCount: 1,
                countLabel: "7 Oros",
                topCard: {
                    id: "oros-7",
                    label: "7 Oros",
                    isFaceUp: true
                },
                presentation: "single-card"
            }
        ]
    }));

    assert(presentation.gameKind === "brisca", "Brisca presentation should be selected when a trump pile exists.");
    assert(presentation.centerArea === "trick", "Brisca should use trick-seat center presentation.");
    assert(presentation.bottomDock === "stock-trump", "Brisca should use the stock/trump bottom dock.");
    assert(presentation.trumpLabel === "Oros", "Brisca should expose a concise trump label.");
}

function runWarPresentationTest(): void {
    const presentation = getPlayerPovPresentation(createBaseViewModel({
        phaseLabel: "BATTLEREADY",
        roundLabel: "Battle 3 | War 1",
        deckLabel: "French Deck | 10 cards still in play",
        tableCards: [
            {
                id: "hidden-war-stack",
                label: "Hidden card",
                isFaceUp: false,
                stackCount: 3,
                playerId: "p1"
            }
        ]
    }));

    assert(presentation.gameKind === "war", "War presentation should be selected for battle table stacks.");
    assert(presentation.infoPanel === "battle", "War should expose a battle info panel.");
    assert(presentation.centerArea === "battle", "War should use a battle center area.");
    assert(presentation.bottomDock === "none", "War should not use a shared deck dock.");
}

function runPokerPresentationTest(): void {
    const presentation = getPlayerPovPresentation(createBaseViewModel({
        deckLabel: "French Deck | 30 cards left in draw pile",
        piles: [
            {
                id: "draw-pile",
                role: "draw",
                label: "Draw Pile",
                cardCount: 30,
                countLabel: "30 cards",
                topCard: null,
                presentation: "hidden-stack"
            },
            {
                id: "discard-pile",
                role: "discard",
                label: "Discard",
                cardCount: 2,
                countLabel: "2 cards",
                topCard: {
                    id: "discard-top",
                    label: "10 Hearts",
                    isFaceUp: true
                },
                presentation: "face-up-stack"
            }
        ]
    }));

    assert(presentation.gameKind === "poker", "Poker presentation should be selected when draw/discard piles exist.");
    assert(presentation.infoPanel === "pot", "Poker should expose a draw/discard info panel.");
    assert(presentation.centerArea === "showdown", "Poker should use a table/showdown center area.");
    assert(presentation.bottomDock === "deck", "Poker should expose a deck bottom dock.");
}

async function main() {
    runBriscaPresentationTest();
    runWarPresentationTest();
    runPokerPresentationTest();
    console.log("playerPovPresentation.test.ts passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
