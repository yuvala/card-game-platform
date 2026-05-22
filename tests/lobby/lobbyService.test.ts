import { isFull } from '../../apps/client/src/lobby/lobbyTypes';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function makeRoom(player_count: number, bot_count: number, max_players: number) {
    return { id: 'r1', game_id: 'war-lite', status: 'waiting', max_players, bot_count, player_count, creator_nickname: 'Alice', owner_user_id: 'u1' };
}

// isFull
assert(!isFull(makeRoom(0, 0, 4)), 'empty room is not full');
assert(!isFull(makeRoom(2, 0, 4)), '2 players, no bots, max 4 — not full');
assert(!isFull(makeRoom(2, 1, 4)), '2 players, 1 bot, max 4 — not full');
assert( isFull(makeRoom(2, 2, 4)), '2 players + 2 bots = max 4 — full');
assert( isFull(makeRoom(4, 0, 4)), '4 players, no bots, max 4 — full');
assert( isFull(makeRoom(1, 3, 4)), '1 player + 3 bots = max 4 — full');
assert(!isFull(makeRoom(0, 0, 2)), 'empty 2-player room is not full');
assert( isFull(makeRoom(1, 1, 2)), '1 player + 1 bot = max 2 — full');

console.log('lobbyService.test.ts passed');
