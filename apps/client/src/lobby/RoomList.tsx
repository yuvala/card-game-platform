import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface Room {
    id: string;
    game_id: string;
    status: string;
    max_players: number;
    player_count: number;
    creator_nickname: string;
}

interface Props {
    readonly userId: string;
    readonly nickname: string;
}

async function tryStartGame(roomId: string) {
    const [{ count }, { data: room }] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('room_id', roomId),
        supabase.from('rooms').select('max_players, status').eq('id', roomId).single(),
    ]);

    if (!room || count === null || room.status !== 'waiting') return;
    if (count < room.max_players) return;

    const wsUrl = (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8787';
    await supabase
        .from('rooms')
        .update({ status: 'playing', ws_url: wsUrl })
        .eq('id', roomId)
        .eq('status', 'waiting');
}

function redirectToGame(
    roomId: string,
    gameId: string,
    wsUrl: string,
    nickname: string,
    bots = 0,
    allPlayerNames: string[] = [],
) {
    const botsParam = bots > 0 ? `&bots=${bots}` : '';
    const playersParam =
        allPlayerNames.length > 0
            ? `&players=${encodeURIComponent(JSON.stringify(allPlayerNames))}`
            : '';
    globalThis.location.href = `/player?room=${roomId}&game=${gameId}&wsUrl=${encodeURIComponent(wsUrl)}&nickname=${encodeURIComponent(nickname)}${botsParam}${playersParam}`;
}

const GAME_LABELS: Record<string, string> = {
    'war-lite': 'War',
    'brisca-lite': 'Brisca',
    'poker-lite': 'Poker',
};

export function RoomList({ userId, nickname }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [creating, setCreating] = useState(false);
    const [myRoom, setMyRoom] = useState<{ id: string; gameId: string; maxPlayers: number; isCreator: boolean } | null>(
        null,
    );

    // Restore room state after page refresh
    useEffect(() => {
        async function restoreRoom() {
            const { data } = await supabase
                .from('players')
                .select('room_id, rooms(game_id, max_players, status, creator_nickname)')
                .eq('user_id', userId)
                .maybeSingle();

            if (!data) return;
            const room = (data.rooms as any);
            if (room?.status === 'waiting') {
                setMyRoom({ id: data.room_id, gameId: room.game_id, maxPlayers: room.max_players, isCreator: room.creator_nickname === nickname });
            }
        }
        restoreRoom();
    }, [userId]);

    // Main room list subscription
    useEffect(() => {
        fetchRooms();

        const channelName = `rooms-list-${userId}`;
        const sub = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchRooms)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    // Subscribe to my specific room once joined
    useEffect(() => {
        if (!myRoom) return;

        const sub = supabase
            .channel(`my-room-${myRoom.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${myRoom.id}` },
                async (payload: any) => {
                    if (payload.new.status === 'done') {
                        setMyRoom(null);
                        return;
                    }
                    if (payload.new.status === 'playing' && payload.new.ws_url) {
                        const { data: players } = await supabase
                            .from('players')
                            .select('nickname')
                            .eq('room_id', myRoom.id)
                            .order('joined_at', { ascending: true });
                        const allPlayerNames = players?.map((p: any) => p.nickname as string) ?? [];
                        redirectToGame(myRoom.id, myRoom.gameId, payload.new.ws_url, nickname, 0, allPlayerNames);
                    }
                },
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${myRoom.id}` },
                () => { setMyRoom(null); },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [myRoom]);

    async function fetchRooms() {
        const { data } = await supabase
            .from('rooms')
            .select('id, game_id, status, max_players, creator_nickname, players(count)')
            .in('status', ['waiting', 'playing'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (!data) return;
        setRooms(
            data.map((r: any) => ({
                ...r,
                player_count: r.players[0]?.count ?? 0,
                creator_nickname: r.creator_nickname ?? '?',
            })),
        );
    }

    async function createRoom(gameId: string) {
        setCreating(true);
        const maxPlayers = gameId === 'poker-lite' ? 4 : 2;
        const { data: room } = await supabase
            .from('rooms')
            .insert({ game_id: gameId, max_players: maxPlayers, creator_nickname: nickname })
            .select()
            .single();
        if (room) await joinRoom(room.id, room.game_id, true);
        setCreating(false);
    }

    async function joinRoom(roomId: string, gameId: string, isCreator = false) {
        const { error } = await supabase
            .from('players')
            .insert({ room_id: roomId, nickname, user_id: userId });
        if (error) return;

        const { data: room } = await supabase
            .from('rooms')
            .select('max_players')
            .eq('id', roomId)
            .single();

        setMyRoom({ id: roomId, gameId, maxPlayers: room?.max_players ?? 2, isCreator });
        await tryStartGame(roomId);
    }

    async function leaveRoom() {
        if (!myRoom) return;
        if (myRoom.isCreator) {
            await supabase.from('rooms').update({ status: 'done' }).eq('id', myRoom.id);
        } else {
            await supabase.from('players').delete().eq('room_id', myRoom.id).eq('user_id', userId);
        }
        setMyRoom(null);
        await fetchRooms();
    }

    async function playWithBots() {
        if (!myRoom) return;
        const wsUrl = (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8787';
        await supabase
            .from('rooms')
            .update({ status: 'playing', ws_url: wsUrl })
            .eq('id', myRoom.id)
            .eq('status', 'waiting');
        const bots = myRoom.maxPlayers - 1;
        redirectToGame(myRoom.id, myRoom.gameId, wsUrl, nickname, bots, [nickname]);
    }

    if (myRoom) {
        return (
            <div className="lobby-center">
                <h1>Lobby</h1>
                <p
                    style={{
                        color: '#d4b896',
                        fontStyle: 'italic',
                        fontSize: '1.2rem',
                        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                    }}
                >
                    Waiting for players…
                </p>
                <button onClick={playWithBots}>Play vs Computer</button>
                <button
                    onClick={leaveRoom}
                    style={{
                        background: 'none',
                        border: '1px solid #6b4f28',
                        color: '#a08860',
                        fontSize: '0.8rem',
                    }}
                >
                    Leave Room
                </button>
            </div>
        );
    }

    return (
        <div className="lobby-wrap">
            <header className="lobby-header">
                <h1>Lobby</h1>
                <span className="lobby-nick">👤 {nickname}</span>
            </header>

            <section>
                <h2>New Room</h2>
                <div className="game-buttons">
                    {Object.entries(GAME_LABELS).map(([id, label]) => (
                        <button key={id} onClick={() => createRoom(id)} disabled={creating}>
                            {label}
                        </button>
                    ))}
                </div>
            </section>

            <div className="ornament">· · ·</div>

            <section>
                <h2>Open Rooms</h2>
                <div className="room-list">
                    {rooms.length === 0 && (
                        <p className="empty">No open rooms — create one above</p>
                    )}
                    {rooms.map((room) => {
                        const playing = room.status === 'playing';
                        return (
                            <div
                                key={room.id}
                                className={`room-row${playing ? ' room-row--playing' : ''}`}
                            >
                                <span className="room-game">
                                    {GAME_LABELS[room.game_id] ?? room.game_id}
                                </span>
                                <span className="room-host">{room.creator_nickname}</span>
                                <span className="room-count">
                                    {room.player_count}/{room.max_players}
                                </span>
                                {playing ? (
                                    <span className="room-badge">In game</span>
                                ) : (
                                    <button
                                        onClick={() => joinRoom(room.id, room.game_id)}
                                        disabled={room.player_count >= room.max_players}
                                    >
                                        Join
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
