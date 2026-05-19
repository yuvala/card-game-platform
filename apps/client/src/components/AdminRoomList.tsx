import React, { useEffect, useState } from 'react';
import { supabase } from '../lobby/supabase';

interface RoomRow {
    id: string;
    game_id: string;
    status: string;
    max_players: number;
    creator_nickname: string | null;
    player_count: number;
}

const GAME_LABELS: Record<string, string> = {
    'war-lite': 'War',
    'brisca-lite': 'Brisca',
    'poker-lite': 'Poker',
};

export function AdminRoomList() {
    const [rooms, setRooms] = useState<RoomRow[]>([]);

    useEffect(() => {
        fetchRooms();

        const sub = supabase
            .channel('admin-rooms-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchRooms)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    async function fetchRooms() {
        const { data } = await supabase
            .from('rooms')
            .select('id, game_id, status, max_players, creator_nickname, players(count)')
            .in('status', ['waiting', 'playing'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (!data) return;
        setRooms(data.map((r: any) => ({
            ...r,
            player_count: r.players[0]?.count ?? 0,
        })));
    }

    async function closeRoom(roomId: string) {
        await supabase.from('rooms').update({ status: 'done' }).eq('id', roomId);
        await fetchRooms();
    }

    return (
        <aside className="adminRoomSidebar">
            <h3 className="adminRoomSidebarTitle">Live Rooms</h3>
            {rooms.length === 0 && (
                <p className="adminRoomSidebarEmpty">No active rooms</p>
            )}
            {rooms.map((room) => (
                <div key={room.id} className={`adminRoomRow${room.status === 'playing' ? ' adminRoomRow--playing' : ''}`}>
                    <div className="adminRoomRowHeader">
                        <span className="adminRoomGame">{GAME_LABELS[room.game_id] ?? room.game_id}</span>
                        <button className="adminRoomClose" onClick={() => closeRoom(room.id)} title="Close room">✕</button>
                    </div>
                    <span className="adminRoomMeta">
                        {room.creator_nickname ?? '?'} · {room.player_count}/{room.max_players}
                    </span>
                    <span className="adminRoomStatus">{room.status}</span>
                </div>
            ))}
        </aside>
    );
}
