import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

interface Room {
    id: string;
    game_id: string;
    status: string;
    max_players: number;
    player_count: number;
}

interface Props {
    userId: string;
    nickname: string;
}

const GAME_LABELS: Record<string, string> = {
    "war-lite": "War",
    "brisca-lite": "Brisca",
    "poker-lite": "Poker"
};

export function RoomList({ userId, nickname }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchRooms();

        const sub = supabase
            .channel("rooms")
            .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, fetchRooms)
            .on("postgres_changes", { event: "*", schema: "public", table: "players" }, fetchRooms)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    async function fetchRooms() {
        const { data } = await supabase
            .from("rooms")
            .select("id, game_id, status, max_players, players(count)")
            .eq("status", "waiting")
            .order("created_at", { ascending: false });

        if (!data) return;
        setRooms(data.map((r: any) => ({
            ...r,
            player_count: r.players[0]?.count ?? 0
        })));
    }

    async function createRoom(gameId: string) {
        setCreating(true);
        const maxPlayers = gameId === "poker-lite" ? 4 : 2;
        const { data: room } = await supabase
            .from("rooms")
            .insert({ game_id: gameId, max_players: maxPlayers })
            .select()
            .single();
        if (room) await joinRoom(room.id, room.game_id);
        setCreating(false);
    }

    async function joinRoom(roomId: string, gameId: string) {
        await supabase.from("players").insert({ room_id: roomId, nickname, user_id: userId });
        window.location.href = `player.html?room=${roomId}&game=${gameId}`;
    }

    return (
        <div className="lobby-wrap">
            <header className="lobby-header">
                <span className="lobby-nick">👤 {nickname}</span>
                <h1>Lobby</h1>
            </header>

            <section className="new-room">
                <h2>New Room</h2>
                <div className="game-buttons">
                    {Object.entries(GAME_LABELS).map(([id, label]) => (
                        <button key={id} onClick={() => createRoom(id)} disabled={creating}>
                            {label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="room-list">
                <h2>Open Rooms</h2>
                {rooms.length === 0 && <p className="empty">No open rooms — create one!</p>}
                {rooms.map(room => (
                    <div key={room.id} className="room-row">
                        <span className="room-game">{GAME_LABELS[room.game_id] ?? room.game_id}</span>
                        <span className="room-count">{room.player_count}/{room.max_players}</span>
                        <button
                            onClick={() => joinRoom(room.id, room.game_id)}
                            disabled={room.player_count >= room.max_players}
                        >
                            Join
                        </button>
                    </div>
                ))}
            </section>
        </div>
    );
}
