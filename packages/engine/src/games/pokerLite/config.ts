import type { SupportedDeckId } from '../../engine/cards/deckDefinitions';
import { defineCardGameConfig } from '../../engine/game/config';
import {
    POKER_LITE_DISCARD_PILE_ID,
    POKER_LITE_STOCK_PILE_ID,
    getPokerLiteHandPileId,
} from './types';

export const pokerLiteSupportedDeckIds = [
    'french',
    'spanish',
    'italian',
] as const satisfies readonly SupportedDeckId[];

export const pokerLiteConfig = defineCardGameConfig({
    id: 'poker-lite',
    label: 'Poker Lite',
    description:
        'Prototype high-card ruleset for the rewrite runtime. Every player reveals and plays a card each round.',
    minPlayers: 2,
    maxPlayers: 8,
    defaultPlayerCount: 3,
    supportedDeckIds: pokerLiteSupportedDeckIds,
    defaultDeckId: 'french',
    openingHandSize: 5,
    piles: [
        {
            id: POKER_LITE_STOCK_PILE_ID,
            role: 'stock',
            label: 'Draw Pile',
            owner: 'table',
            visibility: 'face-down',
        },
        {
            id: POKER_LITE_DISCARD_PILE_ID,
            role: 'discard',
            label: 'Discard',
            owner: 'table',
            visibility: 'face-up',
        },
        {
            id: 'hand',
            role: 'hand',
            label: 'Hand',
            owner: 'player',
            visibility: 'face-up',
            getPlayerPileId: getPokerLiteHandPileId,
            getPlayerPileLabel: (playerName) => playerName + ' Hand',
        },
    ],
});
