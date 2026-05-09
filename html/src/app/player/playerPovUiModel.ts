import type { CardGameViewModel, CardGameViewPlayer } from "@engine/engine/game/viewModel";

import { getOpponentSeatLayouts, type PlayerPovSeatLayout, type PlayerPovSeatSide } from "./playerPovLayout";

export interface PlayerPovPlayerCounters {
    cards: number;
    score: number;
}

export interface PlayerPovOpponentSeat {
    player: CardGameViewPlayer;
    layout: PlayerPovSeatLayout;
    counters: PlayerPovPlayerCounters;
}

export function getPlayerPovOpponentSeats(viewModel: CardGameViewModel): PlayerPovOpponentSeat[] {
    const opponents = viewModel.players.slice(1);
    const layouts = getOpponentSeatLayouts(opponents.length);

    return opponents.flatMap((player, index) => {
        const layout = layouts[index];
        if (!layout) {
            return [];
        }

        return [{
            player,
            layout,
            counters: parsePlayerCounters(player.metaLabel)
        }];
    });
}

export function getPlayerPovSeatSide(viewModel: CardGameViewModel, playerId?: string): PlayerPovSeatSide {
    if (!playerId) {
        return "top";
    }

    const playerIndex = viewModel.players.findIndex((player) => player.id === playerId);
    if (playerIndex <= 0) {
        return "bottom";
    }

    const opponentLayout = getOpponentSeatLayouts(Math.max(viewModel.players.length - 1, 0))[playerIndex - 1];
    return opponentLayout?.side ?? "top";
}

export function getPrimaryPileText(viewModel: CardGameViewModel): string {
    const drawPile = viewModel.piles.find((pile) => pile.role === "draw");
    const trumpPile = viewModel.piles.find((pile) => pile.role === "trump");
    if (drawPile && trumpPile) {
        return drawPile.countLabel;
    }

    return drawPile?.countLabel ?? viewModel.roundLabel;
}

export function getLeadPlayerName(viewModel: CardGameViewModel): string | null {
    const leadPlayerId = viewModel.tableCards[0]?.playerId;
    if (!leadPlayerId) {
        return null;
    }

    return viewModel.players.find((player) => player.id === leadPlayerId)?.nameLabel ?? null;
}

export function parsePlayerCounters(metaLabel: string): PlayerPovPlayerCounters {
    const numbers = metaLabel.match(/\d+/g)?.map((value) => Number(value)) ?? [];
    return {
        cards: numbers[0] ?? 0,
        score: numbers[1] ?? 0
    };
}

export function normalizeActionLabel(label: string): string {
    if (label.toLowerCase() === "play card") {
        return "PLAY SELECTED CARD";
    }

    return label;
}
