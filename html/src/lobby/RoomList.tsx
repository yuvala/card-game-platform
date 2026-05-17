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
    readonly userId: string;
    readonly nickname: string;
}

async function tryStartGame(roomId: string) {
    const [{ count }, { data: room }] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }).eq("room_id", roomId),
        supabase.from("rooms").select("max_players, status").eq("id", roomId).single()
    ]);

    if (!room || count === null || room.status !== "waiting") return;
    if (count < room.max_players) return;

    const wsUrl = (import.meta.env.VITE_WS_URL as string) ?? "ws://localhost:8787";
    await supabase
        .from("rooms")
        .update({ status: "playing", ws_url: wsUrl })
        .eq("id", roomId)
        .eq("status", "waiting");
}

function redirectToGame(roomId: string, gameId: string, wsUrl: string) {
    globalThis.location.href = `player.html?room=${roomId}&game=${gameId}&wsUrl=${encodeURIComponent(wsUrl)}`;
}

const GAME_LABELS: Record<string, string> = {
    "war-lite": "War",
    "brisca-lite": "Brisca",
    "poker-lite": "Poker"
};

export function RoomList({ userId, nickname }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [creating, setCreating] = useState(false);
    const [myRoom, setMyRoom] = useState<{ id: string; gameId: string } | null>(null);

    // Main room list subscription
    useEffect(() => {
        fetchRooms();

        const sub = supabase
            .channel("rooms-list")
            .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, fetchRooms)
            .on("postgres_changes", { event: "*", schema: "public", table: "players" }, fetchRooms)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    // Subscribe to my specific room once joined
    useEffect(() => {
        if (!myRoom) return;

        const sub = supabase
            .channel(`my-room-${myRoom.id}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${myRoom.id}` },
                (payload: any) => {
                    if (payload.new.status === "playing" && payload.new.ws_url) {
                        redirectToGame(myRoom.id, myRoom.gameId, payload.new.ws_url);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [myRoom]);

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
        const { error } = await supabase
            .from("players")
            .insert({ room_id: roomId, nickname, user_id: userId });
        if (error) return;

        setMyRoom({ id: roomId, gameId });
        await tryStartGame(roomId);
    }

    if (myRoom) {
        return (
            <div className="lobby-center">
                <h1>Lobby</h1>
                <p style={{ color: "#7a6040", fontStyle: "italic", fontSize: "1.2rem" }}>
                    Waiting for players…
                </p>
                <button onClick={() => setMyRoom(null)} style={{ background: "none", border: "1px solid #6b4f28", color: "#7a6040", fontSize: "0.8rem" }}>
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
                    {rooms.length === 0 && <p className="empty">No open rooms — create one above</p>}
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
                </div>
            </section>
        </div>
    );
}
