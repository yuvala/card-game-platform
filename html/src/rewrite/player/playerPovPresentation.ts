import type { CardGameViewModel, CardGameViewPile } from "@rewrite-core/engine/game/viewModel";

export type PlayerPovGameKind = "brisca" | "war" | "poker" | "generic";
export type PlayerPovInfoPanelKind = "none" | "trump" | "battle" | "pot";
export type PlayerPovCenterAreaKind = "trick" | "battle" | "showdown" | "row";
export type PlayerPovBottomDockKind = "none" | "stock-trump" | "deck";
export type PlayerPovActionStyle = "play-card" | "draw-card" | "battle";

export interface PlayerPovPresentation {
    gameKind: PlayerPovGameKind;
    gameTitle: string;
    infoPanel: PlayerPovInfoPanelKind;
    centerArea: PlayerPovCenterAreaKind;
    bottomDock: PlayerPovBottomDockKind;
    actionStyle: PlayerPovActionStyle;
    trumpLabel: string | null;
    infoPrimaryLabel: string;
    infoPrimaryValue: string;
    infoSecondaryLabel: string;
    infoSecondaryValue: string;
    centerLabel: string;
}

export function getPlayerPovPresentation(viewModel: CardGameViewModel): PlayerPovPresentation {
    const trumpPile = getPileByRole(viewModel, "trump");
    if (trumpPile) {
        return {
            gameKind: "brisca",
            gameTitle: "BRISCA",
            infoPanel: "trump",
            centerArea: "trick",
            bottomDock: "stock-trump",
            actionStyle: "play-card",
            trumpLabel: getTrumpLabel(viewModel, trumpPile),
            infoPrimaryLabel: "Trump",
            infoPrimaryValue: getTrumpLabel(viewModel, trumpPile),
            infoSecondaryLabel: "Round",
            infoSecondaryValue: viewModel.roundLabel,
            centerLabel: "Current trick"
        };
    }

    if (viewModel.tableCards.some((card) => (card.stackCount ?? 0) > 1) || viewModel.phaseLabel.toLowerCase().includes("battle")) {
        return {
            gameKind: "war",
            gameTitle: "WAR",
            infoPanel: "battle",
            centerArea: "battle",
            bottomDock: "none",
            actionStyle: "battle",
            trumpLabel: null,
            infoPrimaryLabel: "Battle",
            infoPrimaryValue: viewModel.roundLabel,
            infoSecondaryLabel: "In play",
            infoSecondaryValue: getDeckDetail(viewModel),
            centerLabel: "Battle area"
        };
    }

    if (viewModel.piles.some((pile) => pile.role === "discard") || viewModel.deckLabel.toLowerCase().includes("poker")) {
        return {
            gameKind: "poker",
            gameTitle: "POKER",
            infoPanel: "pot",
            centerArea: "showdown",
            bottomDock: "deck",
            actionStyle: "play-card",
            trumpLabel: null,
            infoPrimaryLabel: "Draw",
            infoPrimaryValue: getPileByRole(viewModel, "draw")?.countLabel ?? viewModel.drawPileLabel,
            infoSecondaryLabel: "Discard",
            infoSecondaryValue: getPileByRole(viewModel, "discard")?.countLabel ?? viewModel.discardPileLabel,
            centerLabel: "Table"
        };
    }

    return {
        gameKind: "generic",
        gameTitle: viewModel.phaseLabel,
        infoPanel: "none",
        centerArea: "row",
        bottomDock: "none",
        actionStyle: "play-card",
        trumpLabel: null,
        infoPrimaryLabel: "Round",
        infoPrimaryValue: viewModel.roundLabel,
        infoSecondaryLabel: "Deck",
        infoSecondaryValue: getDeckDetail(viewModel),
        centerLabel: "Table"
    };
}

export function getPileByRole(viewModel: CardGameViewModel, role: string): CardGameViewPile | null {
    return viewModel.piles.find((pile) => !pile.ownerId && pile.role === role) ?? null;
}

function getTrumpLabel(viewModel: CardGameViewModel, trumpPile: CardGameViewPile): string {
    if (trumpPile.countLabel && trumpPile.countLabel !== "spent") {
        const labelParts = trumpPile.countLabel.split(/\s+/);
        return labelParts[labelParts.length - 1] || trumpPile.countLabel;
    }

    const match = /\|\s*Trump:\s*(.+)$/i.exec(viewModel.deckLabel);
    return match?.[1] ?? "spent";
}

function getDeckDetail(viewModel: CardGameViewModel): string {
    const parts = viewModel.deckLabel.split("|").map((part) => part.trim()).filter(Boolean);
    return parts[1] ?? parts[0] ?? viewModel.deckLabel;
}
