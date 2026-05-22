import { supabase } from './supabase';
import type { RoomRow } from './lobbyTypes';
export type { RoomRow } from './lobbyTypes';
export { isFull } from './lobbyTypes';

export async function fetchRooms(): Promise<RoomRow[]> {
    const { data } = await supabase
        .from('rooms')
        .select('id, game_id, status, max_players, bot_count, creator_nickname, owner_user_id, players(count)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(20);

    if (!data) return [];
    return data.map((r: any) => ({
        ...r,
        player_count: r.players[0]?.count ?? 0,
        creator_nickname: r.creator_nickname ?? '?',
        bot_count: r.bot_count ?? 0,
    }));
}

export async function createRoom(gameId: string, playerCount: number, userId: string, nickname: string): Promise<string | null> {
    const { data } = await supabase
        .from('rooms')
        .insert({
            game_id: gameId,
            max_players: playerCount,
            creator_nickname: nickname,
            creator_user_id: userId,
            owner_user_id: userId,
        })
        .select()
        .single();
    return data?.id ?? null;
}

export async function joinRoom(roomId: string, userId: string, nickname: string): Promise<{ error?: string }> {
    const { data: existing } = await supabase
        .from('players')
        .select('id, nickname')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!existing) {
        const { error } = await supabase
            .from('players')
            .insert({ room_id: roomId, nickname, user_id: userId });
        if (error) return { error: error.message };
    } else if ((existing as any).nickname !== nickname) {
        await supabase
            .from('players')
            .update({ nickname })
            .eq('id', (existing as any).id);
    }
    return {};
}

export async function leaveRoom(roomId: string, userId: string, isOwner: boolean): Promise<void> {
    await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', userId);

    if (!isOwner) return;

    const { data: next } = await supabase
        .from('players')
        .select('user_id')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (next?.user_id) {
        await supabase.from('rooms').update({ owner_user_id: next.user_id }).eq('id', roomId);
    } else {
        await supabase.from('rooms').update({ status: 'done' }).eq('id', roomId);
    }
}

export async function kickPlayer(roomId: string, userId: string): Promise<void> {
    await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', userId);
}

export async function setBotCount(roomId: string, count: number): Promise<void> {
    await supabase.from('rooms').update({ bot_count: count }).eq('id', roomId);
}

export async function launchGame(roomId: string, gameId: string, botCount: number, players: string[], nickname: string): Promise<void> {
    const wsUrl = (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8787';
    await supabase
        .from('rooms')
        .update({ status: 'playing', ws_url: wsUrl })
        .eq('id', roomId)
        .eq('status', 'waiting');
    redirectToGame(roomId, gameId, wsUrl, nickname, botCount, players);
}

export function redirectToGame(
    roomId: string,
    gameId: string,
    wsUrl: string,
    nickname: string,
    bots = 0,
    allPlayerNames: string[] = [],
): void {
    const botsParam = bots > 0 ? `&bots=${bots}` : '';
    const playersParam =
        allPlayerNames.length > 0
            ? `&players=${encodeURIComponent(JSON.stringify(allPlayerNames))}`
            : '';
    globalThis.location.href = `/player?room=${roomId}&game=${gameId}&wsUrl=${encodeURIComponent(wsUrl)}&nickname=${encodeURIComponent(nickname)}${botsParam}${playersParam}`;
}
