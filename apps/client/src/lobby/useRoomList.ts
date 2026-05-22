import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { fetchRooms, isFull, type RoomRow } from './lobbyService';

export function useRoomList(userId: string) {
    const [rooms, setRooms] = useState<RoomRow[]>([]);

    useEffect(() => {
        load();
        const sub = supabase
            .channel(`rooms-list-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, load)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    async function load() {
        const data = await fetchRooms();
        setRooms(data);
    }

    return { rooms, isFull };
}
