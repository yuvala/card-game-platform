import type { CardGameEffect } from './effects';
import type {
    CardGameViewCard,
    CardGameViewModel,
    CardGameViewPile,
    CardGameViewTableCard,
} from './viewModel';

function createHiddenCard(card: CardGameViewCard, scope: string, index: number): CardGameViewCard {
    return {
        ...card,
        id: 'hidden:' + scope + ':' + String(index),
        label: 'Hidden card',
        isFaceUp: false,
    };
}

function sanitizeTableCards(cards: readonly CardGameViewTableCard[]): CardGameViewTableCard[] {
    return cards.map((card, index) => {
        if (card.isFaceUp) {
            return card;
        }

        return {
            ...card,
            id: 'hidden:table:' + (card.playerId ?? 'shared') + ':' + String(index),
            label: 'Hidden card',
            isFaceUp: false,
        };
    });
}

function sanitizePiles(piles: readonly CardGameViewPile[]): CardGameViewPile[] {
    return piles.map((pile) => {
        if (!pile.topCard || pile.topCard.isFaceUp) {
            return pile;
        }

        return {
            ...pile,
            topCard: createHiddenCard(pile.topCard, 'pile:' + pile.id, 0),
        };
    });
}

function sanitizeEffects(effects: readonly CardGameEffect[]): CardGameEffect[] {
    return effects.map((effect, index) => {
        if (effect.type !== 'move-card' || effect.card.isFaceUp) {
            return effect;
        }

        return {
            ...effect,
            key: 'hidden-effect:' + effect.reason + ':' + String(index),
            card: {
                ...effect.card,
                id: 'hidden:effect:' + String(index),
                label: 'Hidden card',
                isFaceUp: false,
            },
        };
    });
}

export function applyPlayerPovViewModel(
    viewModel: CardGameViewModel,
    viewerId?: string | null,
): CardGameViewModel {
    if (!viewerId) {
        return viewModel;
    }

    const viewerIndex = viewModel.players.findIndex((player) => player.id === viewerId);
    if (viewerIndex < 0) {
        return viewModel;
    }

    const orderedPlayers = [
        ...viewModel.players.slice(viewerIndex),
        ...viewModel.players.slice(0, viewerIndex),
    ];
    const povPlayers = orderedPlayers.map((player) => {
        if (player.id === viewerId) {
            return player;
        }

        return {
            ...player,
            hand: player.hand.map((card, cardIndex) =>
                createHiddenCard(card, 'hand:' + player.id, cardIndex),
            ),
            canInteract: false,
            cardClickAction: undefined,
        };
    });
    const viewer = povPlayers.find((player) => player.id === viewerId);
    const canViewerAct = Boolean(viewer?.canInteract);

    return {
        ...viewModel,
        players: povPlayers,
        selectedCardId: canViewerAct ? viewModel.selectedCardId : null,
        tableCards: sanitizeTableCards(viewModel.tableCards),
        piles: sanitizePiles(viewModel.piles),
        controls: {
            ...viewModel.controls,
            canPlay: viewModel.controls.canPlay && canViewerAct,
        },
        primaryAction: canViewerAct ? viewModel.primaryAction : null,
        effects: sanitizeEffects(viewModel.effects),
    };
}
