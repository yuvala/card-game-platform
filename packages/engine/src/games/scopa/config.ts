import type { SupportedDeckId } from '../../engine/cards/deckDefinitions';
import { defineCardGameConfig } from '../../engine/game/config';
import {
    SCOPA_STOCK_PILE_ID,
    SCOPA_TABLE_PILE_ID,
    getScopaCapturePileId,
    getScopaHandPileId,
} from './types';

export const scopaSupportedDeckIds = ['spanish', 'italian'] as const satisfies readonly SupportedDeckId[];

export const scopaConfig = defineCardGameConfig({
    id: 'scopa-lite',
    label: 'Scopa',
    description:
        'Classic Italian fishing card game. Capture table cards by matching their sum. Scopa (sweep) scores bonus points!',
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayerCount: 2,
    playerCountOptions: [2, 3, 4],
    supportedDeckIds: scopaSupportedDeckIds,
    defaultDeckId: 'spanish',
    openingHandSize: 3,
    piles: [
        {
            id: SCOPA_STOCK_PILE_ID,
            role: 'stock',
            label: 'Stock',
            owner: 'table',
            visibility: 'face-down',
        },
        {
            id: SCOPA_TABLE_PILE_ID,
            role: 'table',
            label: 'Table',
            owner: 'table',
            visibility: 'face-up',
        },
        {
            id: 'hand',
            role: 'hand',
            label: 'Hand',
            owner: 'player',
            visibility: 'face-up',
            getPlayerPileId: getScopaHandPileId,
            getPlayerPileLabel: (playerName) => playerName + ' Hand',
        },
        {
            id: 'capture',
            role: 'capture',
            label: 'Capture',
            owner: 'player',
            visibility: 'owner-only',
            getPlayerPileId: getScopaCapturePileId,
            getPlayerPileLabel: (playerName) => playerName + ' Capture',
        },
    ],
});
