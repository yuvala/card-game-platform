import type { SupportedDeckId } from '../cards/deckDefinitions';
import type { CardInstance } from '../cards/types';
import type { CardPileMap, CardPileRole, CardGamePlayer } from './types';
import { createCardPile } from './piles';

export interface CardGameConfig {
    id: string;
    label: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    defaultPlayerCount: number;
    playerCountOptions?: readonly number[];
    supportedDeckIds: readonly SupportedDeckId[];
    defaultDeckId: SupportedDeckId;
    openingHandSize: number;
    piles: readonly CardPileConfig[];
}

export type CardPileOwner = 'table' | 'player';

export type CardPileVisibility = 'face-up' | 'face-down' | 'owner-only';

export interface CardPileConfig {
    id: string;
    role: CardPileRole;
    label: string;
    owner: CardPileOwner;
    visibility: CardPileVisibility;
    getPlayerPileId?: (playerId: string) => string;
    getPlayerPileLabel?: (playerName: string) => string;
}

export function defineCardGameConfig<TConfig extends CardGameConfig>(config: TConfig): TConfig {
    return config;
}

function resolveVisibility(
    visibility: CardPileVisibility,
): Pick<CardPileConfigResult, 'isFaceUp' | 'isVisibleToAll'> {
    switch (visibility) {
        case 'face-up':
            return {
                isFaceUp: true,
                isVisibleToAll: true,
            };
        case 'owner-only':
            return {
                isFaceUp: true,
                isVisibleToAll: false,
            };
        case 'face-down':
            return {
                isFaceUp: false,
                isVisibleToAll: false,
            };
    }
}

interface CardPileConfigResult {
    isFaceUp: boolean;
    isVisibleToAll: boolean;
}

export function createConfiguredPiles<TPlayer extends CardGamePlayer<CardInstance>>(
    config: Pick<CardGameConfig, 'piles'>,
    players: readonly TPlayer[],
): CardPileMap<CardInstance> {
    return config.piles.reduce<CardPileMap<CardInstance>>((piles, pileConfig) => {
        const visibility = resolveVisibility(pileConfig.visibility);

        if (pileConfig.owner === 'table') {
            return {
                ...piles,
                [pileConfig.id]: createCardPile<CardInstance>({
                    id: pileConfig.id,
                    role: pileConfig.role,
                    label: pileConfig.label,
                    isFaceUp: visibility.isFaceUp,
                    isVisibleToAll: visibility.isVisibleToAll,
                }),
            };
        }

        return players.reduce<CardPileMap<CardInstance>>((nextPiles, player) => {
            const pileId =
                pileConfig.getPlayerPileId?.(player.id) ?? pileConfig.id + ':' + player.id;
            const pileLabel =
                pileConfig.getPlayerPileLabel?.(player.name) ??
                player.name + ' ' + pileConfig.label;

            return {
                ...nextPiles,
                [pileId]: createCardPile<CardInstance>({
                    id: pileId,
                    role: pileConfig.role,
                    ownerId: player.id,
                    label: pileLabel,
                    isFaceUp: visibility.isFaceUp,
                    isVisibleToAll: visibility.isVisibleToAll,
                }),
            };
        }, piles);
    }, {});
}
