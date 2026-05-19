import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getGameCatalogEntryById } from '@engine/games/catalog';

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
    readonly onLogout: () => void;
}

async function startRoom(roomId: string): Promise<{ wsUrl: string; bots: number; playerNames: string[] }> {
    const wsUrl = (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8787';
    const { data: players } = await supabase
        .from('players')
        .select('nickname')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

    const { data: room } = await supabase
        .from('rooms')
        .select('max_players')
        .eq('id', roomId)
        .single();

    const playerNames = players?.map((p: any) => p.nickname as string) ?? [];
    const bots = Math.max(0, (room?.max_players ?? 2) - playerNames.length);

    await supabase
        .from('rooms')
        .update({ status: 'playing', ws_url: wsUrl })
        .eq('id', roomId)
        .eq('status', 'waiting');

    return { wsUrl, bots, playerNames };
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

export function RoomList({ userId, nickname, onLogout }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [creating, setCreating] = useState(false);
    const [myRoom, setMyRoom] = useState<{ id: string; gameId: string; maxPlayers: number; minPlayers: number; isCreator: boolean } | null>(
        null,
    );
    const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
    const [leftMessage, setLeftMessage] = useState<string | null>(null);
    const [pendingGame, setPendingGame] = useState<{ id: string; options: number[] } | null>(null);
    const [botCount, setBotCount] = useState(0);

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
                const entry = getGameCatalogEntryById(room.game_id);
                setMyRoom({ id: data.room_id, gameId: room.game_id, maxPlayers: room.max_players, minPlayers: entry?.minPlayers ?? 2, isCreator: room.creator_nickname === nickname });
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

    // Fetch and subscribe to players in my room
    useEffect(() => {
        if (!myRoom) { setRoomPlayers([]); return; }

        let prev: string[] = [];

        async function fetchPlayers() {
            const { data } = await supabase
                .from('players')
                .select('nickname')
                .eq('room_id', myRoom!.id)
                .order('joined_at', { ascending: true });
            const next = data?.map((p: any) => p.nickname as string) ?? [];
            const left = prev.filter((n) => !next.includes(n));
            if (left.length > 0) {
                setLeftMessage(`${left[0]} left the room`);
                setTimeout(() => setLeftMessage(null), 3000);
            }
            prev = next;
            if (prev.length > 0 && !next.includes(nickname)) {
                setMyRoom(null);
                return;
            }
            setRoomPlayers(next);
        }

        fetchPlayers();

        const sub = supabase
            .channel(`room-players-${myRoom.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${myRoom.id}` }, fetchPlayers)
            .subscribe();

        const handleUnload = () => {
            const roomId = myRoom.id;
            const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/players?room_id=eq.${roomId}&user_id=eq.${userId}`;
            navigator.sendBeacon(url, '');
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            supabase.removeChannel(sub);
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [myRoom]);

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
            .eq('status', 'waiting')
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

    function selectGame(gameId: string) {
        const entry = getGameCatalogEntryById(gameId);
        const options = entry?.playerCountOptions ?? [entry?.maxPlayers ?? 2];
        if (options.length === 1) {
            createRoom(gameId, options[0]).catch(() => {});
        } else {
            setPendingGame({ id: gameId, options: [...options] });
        }
    }

    async function createRoom(gameId: string, playerCount: number) {
        setCreating(true);
        setPendingGame(null);
        const { data: room } = await supabase
            .from('rooms')
            .insert({ game_id: gameId, max_players: playerCount, creator_nickname: nickname, creator_user_id: userId })
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

        const entry = getGameCatalogEntryById(gameId);
        setBotCount(0);
        setMyRoom({ id: roomId, gameId, maxPlayers: room?.max_players ?? 2, minPlayers: entry?.minPlayers ?? 2, isCreator });
    }

    async function leaveRoom() {
        if (!myRoom) return;
        await supabase.from('players').delete().eq('room_id', myRoom.id).eq('user_id', userId);
        if (myRoom.isCreator) {
            await supabase.from('rooms').update({ status: 'done' }).eq('id', myRoom.id);
        }
        setMyRoom(null);
        await fetchRooms();
    }

    async function kickPlayer(playerNickname: string) {
        if (!myRoom) return;
        await supabase
            .from('players')
            .delete()
            .eq('room_id', myRoom.id)
            .eq('nickname', playerNickname);
    }

    async function launchGame() {
        if (!myRoom) return;
        const { wsUrl, playerNames } = await startRoom(myRoom.id);
        redirectToGame(myRoom.id, myRoom.gameId, wsUrl, nickname, botCount, playerNames);
    }

    if (myRoom) {
        return (
            <div className="lobby-center">
                <h1>{GAME_LABELS[myRoom.gameId] ?? myRoom.gameId}</h1>
                {leftMessage && <p className="waiting-left-msg">{leftMessage}</p>}
                <div className="waiting-players">
                    {roomPlayers.map((name) => (
                        <div key={name} className="waiting-player">
                            <span className="waiting-player-suit">♠</span>{' '}{name}
                            {myRoom.isCreator && name !== nickname && (
                                <button className="waiting-player-kick" onClick={() => kickPlayer(name)} title="Kick player">✕</button>
                            )}
                        </div>
                    ))}
                    {Array.from({ length: myRoom.maxPlayers - roomPlayers.length }, (_, i) => (
                        <div key={`empty-slot-${roomPlayers.length + i}`} className={`waiting-player waiting-player--empty${i < botCount ? ' waiting-player--bot' : ''}`}>
                            <span className="waiting-player-suit">{i < botCount ? '⚙' : '·'}</span>{' '}
                            {i < botCount ? 'Bot' : 'Waiting…'}
                        </div>
                    ))}
                </div>
                {myRoom.isCreator && (
                    <div className="bot-controls">
                        <button
                            className="bot-btn"
                            onClick={() => setBotCount((n) => Math.max(0, n - 1))}
                            disabled={botCount === 0}
                        >−</button>
                        <span className="bot-label">{botCount} {botCount === 1 ? 'Bot' : 'Bots'}</span>
                        <button
                            className="bot-btn"
                            onClick={() => setBotCount((n) => Math.min(myRoom.maxPlayers - roomPlayers.length, n + 1))}
                            disabled={botCount >= myRoom.maxPlayers - roomPlayers.length}
                        >+</button>
                    </div>
                )}
                {myRoom.isCreator && (
                    <button onClick={launchGame} disabled={roomPlayers.length + botCount < myRoom.minPlayers}>
                        Launch Game
                    </button>
                )}
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
                <span className="lobby-nick">
                    <span className="lobby-nick-suit">♠</span>
                    {nickname}
                    <button className="lobby-nick-logout" onClick={onLogout} title="Switch user">✕</button>
                </span>
            </header>

            <section>
                <h2>New Room</h2>
                {pendingGame ? (
                    <div className="game-player-count">
                        <p className="game-player-count-label">Players:</p>
                        <div className="game-buttons">
                            {pendingGame.options.map((count) => (
                                <button key={count} onClick={() => createRoom(pendingGame.id, count)} disabled={creating}>
                                    {count}
                                </button>
                            ))}
                            <button
                                onClick={() => setPendingGame(null)}
                                style={{ background: 'none', border: '1px solid #6b4f28', color: '#a08860' }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="game-buttons">
                        {Object.entries(GAME_LABELS).map(([id, label]) => (
                            <button key={id} onClick={() => selectGame(id)} disabled={creating}>
                                {label}
                            </button>
                        ))}
                    </div>
                )}
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
