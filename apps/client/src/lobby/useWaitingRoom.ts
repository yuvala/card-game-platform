import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { getGameCatalogEntryById } from '@engine/games/catalog';
import * as lobbyService from './lobbyService';

export interface WaitingRoomState {
    id: string;
    gameId: string;
    maxPlayers: number;
    minPlayers: number;
    playerCountOptions: number[];
    botCount: number;
}

export interface PlayerEntry {
    nickname: string;
    userId: string;
}

export function useWaitingRoom(userId: string, nickname: string) {
    const [myRoom, setMyRoom] = useState<WaitingRoomState | null>(null);
    const [players, setPlayers] = useState<PlayerEntry[]>([]);
    const [isOwner, setIsOwner] = useState(false);
    const [leftMessage, setLeftMessage] = useState<string | null>(null);
    const playersRef = useRef<PlayerEntry[]>([]);
    useEffect(() => { playersRef.current = players; }, [players]);

    useEffect(() => { restore(); }, [userId]);

    async function restore() {
        const savedRoomId = sessionStorage.getItem('lobby-room-id');
        if (!savedRoomId) return;

        const { data } = await supabase
            .from('players')
            .select('room_id, rooms(game_id, max_players, bot_count, status, owner_user_id)')
            .eq('user_id', userId)
            .eq('room_id', savedRoomId)
            .maybeSingle();

        if (!data) { sessionStorage.removeItem('lobby-room-id'); return; }
        const room = (data.rooms as any);
        if (room?.status === 'waiting') {
            enterRoom(data.room_id, room.game_id, room.max_players, room.bot_count ?? 0, room.owner_user_id === userId);
        } else {
            sessionStorage.removeItem('lobby-room-id');
        }
    }

    function enterRoom(roomId: string, gameId: string, maxPlayers: number, botCount: number, ownerFlag: boolean) {
        const entry = getGameCatalogEntryById(gameId);
        setMyRoom({
            id: roomId,
            gameId,
            maxPlayers,
            minPlayers: entry?.minPlayers ?? 2,
            playerCountOptions: entry?.playerCountOptions ? [...entry.playerCountOptions] : [],
            botCount,
        });
        setIsOwner(ownerFlag);
        sessionStorage.setItem('lobby-room-id', roomId);
    }

    // Subscribe to players in room
    useEffect(() => {
        if (!myRoom) { setPlayers([]); return; }

        let seq = 0;
        let prevPlayers: PlayerEntry[] = [];

        async function fetchPlayers() {
            const mySeq = ++seq;
            const { data } = await supabase
                .from('players')
                .select('nickname, user_id')
                .eq('room_id', myRoom!.id)
                .order('joined_at', { ascending: true });
            if (mySeq !== seq) return;
            const next: PlayerEntry[] = data?.map((p: any) => ({ nickname: p.nickname as string, userId: p.user_id as string })) ?? [];
            const left = prevPlayers.filter(p => !next.some(n => n.userId === p.userId));
            if (left.length > 0) {
                setLeftMessage(`${left[0].nickname} left the room`);
                setTimeout(() => setLeftMessage(null), 3000);
            }
            prevPlayers = next;
            if (next.length > 0 && !next.some(p => p.userId === userId)) {
                sessionStorage.removeItem('lobby-room-id');
                setMyRoom(null);
                return;
            }
            setPlayers(next);
        }

        const sub = supabase
            .channel(`room-players-${myRoom.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${myRoom.id}` }, fetchPlayers)
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') fetchPlayers();
            });

        let accessToken = '';
        supabase.auth.getSession().then(({ data: { session } }) => {
            accessToken = session?.access_token ?? '';
        });

        const handleUnload = () => {
            const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/players?room_id=eq.${myRoom.id}&user_id=eq.${userId}`;
            fetch(url, {
                method: 'DELETE',
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                    Authorization: `Bearer ${accessToken}`,
                },
                keepalive: true,
            });
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            supabase.removeChannel(sub);
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [myRoom?.id]);

    // Subscribe to room status, bot_count, ownership changes
    useEffect(() => {
        if (!myRoom) return;

        const sub = supabase
            .channel(`my-room-${myRoom.id}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${myRoom.id}` },
                async (payload: any) => {
                    const updated = payload.new;
                    if (updated.status === 'done') {
                        sessionStorage.removeItem('lobby-room-id');
                        setMyRoom(null);
                        return;
                    }
                    if (updated.status === 'playing' && updated.ws_url) {
                        const allPlayerNames = playersRef.current.map(p => p.nickname);
                        lobbyService.redirectToGame(myRoom.id, myRoom.gameId, updated.ws_url, nickname, 0, allPlayerNames);
                        return;
                    }
                    setMyRoom(prev => prev ? { ...prev, botCount: updated.bot_count ?? prev.botCount } : prev);
                    setIsOwner(updated.owner_user_id === userId);
                }
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${myRoom.id}` },
                () => { sessionStorage.removeItem('lobby-room-id'); setMyRoom(null); }
            )
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [myRoom?.id]);

    async function join(roomId: string, gameId: string): Promise<{ error?: string }> {
        const { error } = await lobbyService.joinRoom(roomId, userId, nickname);
        if (error) return { error };

        const { data: room } = await supabase
            .from('rooms')
            .select('max_players, bot_count, owner_user_id')
            .eq('id', roomId)
            .single();

        enterRoom(roomId, gameId, room?.max_players ?? 2, room?.bot_count ?? 0, room?.owner_user_id === userId);
        return {};
    }

    async function leave(): Promise<void> {
        if (!myRoom) return;
        await lobbyService.leaveRoom(myRoom.id, userId, isOwner);
        sessionStorage.removeItem('lobby-room-id');
        setMyRoom(null);
    }

    async function kick(playerUserId: string): Promise<void> {
        if (!myRoom) return;
        setPlayers(prev => prev.filter(p => p.userId !== playerUserId));
        await lobbyService.kickPlayer(myRoom.id, playerUserId);
    }

    async function updateBotCount(delta: number): Promise<void> {
        if (!myRoom) return;
        const emptySlots = myRoom.maxPlayers - players.length;
        const next = Math.max(0, Math.min(emptySlots, myRoom.botCount + delta));
        setMyRoom(prev => prev ? { ...prev, botCount: next } : prev);
        await lobbyService.setBotCount(myRoom.id, next);
    }

    async function launch(): Promise<void> {
        if (!myRoom) return;
        await lobbyService.launchGame(myRoom.id, myRoom.gameId, myRoom.botCount, players.map(p => p.nickname), nickname);
    }

    return { myRoom, players, isOwner, leftMessage, join, leave, kick, updateBotCount, launch };
}
