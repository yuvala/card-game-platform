import { z } from 'zod';

export const SessionPlayerSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
});
export type SessionPlayerSummary = z.infer<typeof SessionPlayerSummarySchema>;

export const RewriteProtocolGameEventSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('START') }),
    z.object({ type: z.literal('SELECT_CARD'), cardId: z.string() }),
    z.object({ type: z.literal('PLAY_CARD') }),
    z.object({ type: z.literal('ANIMATION_DONE') }),
    z.object({ type: z.literal('RESTART') }),
]);
export type RewriteProtocolGameEvent = z.infer<typeof RewriteProtocolGameEventSchema>;

export const SessionConfigSchema = z
    .object({
        gameId: z.string(),
        playerCount: z.number().int().min(1).max(8),
        playerNames: z.array(z.string()).optional(),
        deckId: z.string(),
        cardsPerPlayer: z.number().int().positive().optional(),
        seed: z.string().optional(),
        debugScenarioId: z.string().optional(),
        botSeats: z.array(z.number().int().min(0)).optional(),
    })
    .refine(
        (c) => c.playerNames === undefined || c.playerNames.length === c.playerCount,
        { message: 'playerNames length must equal playerCount', path: ['playerNames'] },
    )
    .refine(
        (c) => c.botSeats === undefined || c.botSeats.every((s) => s < c.playerCount),
        { message: 'botSeats must be valid seat indices within playerCount', path: ['botSeats'] },
    );
export type SessionConfig = z.infer<typeof SessionConfigSchema>;

export const ClientRoleSchema = z.enum(['operator', 'player', 'spectator']);
export type ClientRole = z.infer<typeof ClientRoleSchema>;

export const ROLE_CAN_CONFIGURE: ReadonlySet<ClientRole> = new Set(['operator']);
export const ROLE_CAN_TABLE_EVENTS: ReadonlySet<ClientRole> = new Set(['operator']);
export const ROLE_CAN_GAME_EVENTS: ReadonlySet<ClientRole> = new Set(['operator', 'player']);

export const ClientMessageSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('watch-session'),
        sessionId: z.string().optional(),
        role: ClientRoleSchema.optional(),
    }),
    z.object({
        type: z.literal('configure-session'),
        config: SessionConfigSchema,
    }),
    z.object({
        type: z.literal('set-viewer'),
        playerId: z.string().nullable(),
    }),
    z.object({
        type: z.literal('game-event'),
        expectedSequence: z.number().optional(),
        event: RewriteProtocolGameEventSchema,
    }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('session-view'),
        sessionId: z.string(),
        gameId: z.string(),
        sequence: z.number(),
        players: z.array(SessionPlayerSummarySchema),
        viewerId: z.string().nullable(),
        viewModel: z.unknown(),
    }),
    z.object({ type: z.literal('error'), message: z.string() }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export function isClientMessage(value: unknown): value is ClientMessage {
    return ClientMessageSchema.safeParse(value).success;
}

export function isServerMessage(value: unknown): value is ServerMessage {
    return ServerMessageSchema.safeParse(value).success;
}
