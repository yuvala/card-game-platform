import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminToolbar } from '../components/AdminToolbar';
import { supabase } from '../lobby/supabase';

async function closeRoom(roomId: string) {
    await supabase.from('rooms').update({ status: 'done' }).eq('id', roomId);
}

interface RoomRow {
    id: string;
    game_id: string;
    status: string;
    max_players: number;
    creator_nickname: string | null;
    player_count: number;
    ws_url: string | null;
}

const GAME_LABELS: Record<string, string> = {
    'war-lite': 'War',
    'brisca-lite': 'Brisca',
    'poker-lite': 'Poker',
};

export function OperatorRoute() {
    const [rooms, setRooms] = useState<RoomRow[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchRooms();

        const sub = supabase
            .channel('operator-rooms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchRooms)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    async function fetchRooms() {
        const { data } = await supabase
            .from('rooms')
            .select('id, game_id, status, max_players, creator_nickname, ws_url, players(count)')
            .in('status', ['waiting', 'playing'])
            .order('created_at', { ascending: false })
            .limit(50);

        if (!data) return;
        setRooms(data.map((r: any) => ({
            ...r,
            player_count: r.players[0]?.count ?? 0,
        })));
    }

    function openTable(room: RoomRow) {
        const wsUrl = room.ws_url ?? (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8787';
        navigate(`/table?game=${room.game_id}&wsUrl=${encodeURIComponent(wsUrl)}&autostart=1`);
    }

    return (
        <div className="operatorShell">
            <AdminToolbar />
            <main className="operatorMain">
                <header className="operatorHeader">
                    <h1 className="operatorTitle">Operator</h1>
                    <span className="operatorSubtitle">{rooms.length} active room{rooms.length === 1 ? '' : 's'}</span>
                </header>

                {rooms.length === 0 && (
                    <div className="appRoot is-empty">
                        <div className="appEmptyState">
                            <p className="appEmptyEyebrow">No Active Rooms</p>
                            <h2 className="appEmptyTitle">Waiting for players</h2>
                            <p className="appEmptyCopy">Rooms will appear here when players open the lobby.</p>
                        </div>
                    </div>
                )}

                <div className="operatorRoomGrid">
                    {rooms.map((room) => (
                        <div key={room.id} className={`operatorRoomCard${room.status === 'playing' ? ' operatorRoomCard--playing' : ''}`}>
                            <div className="operatorRoomCardTop">
                                <span className="operatorRoomGame">{GAME_LABELS[room.game_id] ?? room.game_id}</span>
                                <span className={`operatorRoomBadge operatorRoomBadge--${room.status}`}>{room.status}</span>
                            </div>
                            <div className="operatorRoomInfo">
                                <span className="operatorRoomCreator">{room.creator_nickname ?? '?'}</span>
                                <span className="operatorRoomCount">{room.player_count}/{room.max_players} players</span>
                            </div>
                            <div className="operatorRoomActions">
                                <button
                                    className="operatorBtn operatorBtn--table"
                                    onClick={() => openTable(room)}
                                >
                                    Open Table
                                </button>
                                <button
                                    className="operatorBtn operatorBtn--close"
                                    onClick={() => closeRoom(room.id)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
