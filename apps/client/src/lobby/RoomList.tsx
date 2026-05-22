import { useState } from 'react';
import { getGameCatalogEntryById } from '@engine/games/catalog';
import * as lobbyService from './lobbyService';
import { useRoomList } from './useRoomList';
import { useWaitingRoom } from './useWaitingRoom';
import { WaitingRoom } from './WaitingRoom';

const GAME_LABELS: Record<string, string> = {
    'war-lite': 'War',
    'brisca-lite': 'Brisca',
    'poker-lite': 'Poker',
};

interface Props {
    readonly userId: string;
    readonly nickname: string;
    readonly onLogout: () => void;
}

export function RoomList({ userId, nickname, onLogout }: Props) {
    const [creating, setCreating] = useState(false);
    const [pendingGame, setPendingGame] = useState<{ id: string; options: number[] } | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    const { rooms, isFull } = useRoomList(userId);
    const { myRoom, players, isOwner, leftMessage, join, leave, kick, updateBotCount, launch } = useWaitingRoom(userId, nickname);

    if (myRoom) {
        return (
            <WaitingRoom
                room={myRoom}
                players={players}
                nickname={nickname}
                isOwner={isOwner}
                leftMessage={leftMessage}
                onLeave={leave}
                onKick={kick}
                onBotChange={updateBotCount}
                onLaunch={launch}
            />
        );
    }

    function selectGame(gameId: string) {
        const entry = getGameCatalogEntryById(gameId);
        const options = entry?.playerCountOptions ?? [entry?.maxPlayers ?? 2];
        if (options.length === 1) {
            handleCreateRoom(gameId, options[0]);
        } else {
            setPendingGame({ id: gameId, options: [...options] });
        }
    }

    async function handleCreateRoom(gameId: string, playerCount: number) {
        setCreating(true);
        setPendingGame(null);
        const roomId = await lobbyService.createRoom(gameId, playerCount, userId, nickname);
        if (roomId) {
            const { error } = await join(roomId, gameId);
            if (error) showJoinError(error);
        }
        setCreating(false);
    }

    async function handleJoin(roomId: string, gameId: string) {
        const { error } = await join(roomId, gameId);
        if (error) showJoinError(error);
    }

    function showJoinError(message: string) {
        setJoinError(message);
        setTimeout(() => setJoinError(null), 4000);
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
                <div className="game-buttons">
                    {Object.entries(GAME_LABELS).map(([id, label]) => (
                        <button key={id} onClick={() => selectGame(id)} disabled={creating}
                            className={pendingGame?.id === id ? 'game-btn--active' : ''}>
                            {label}
                        </button>
                    ))}
                </div>
                {pendingGame && (
                    <div className="game-player-count">
                        <select
                            className="player-count-select"
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) handleCreateRoom(pendingGame.id, Number(e.target.value));
                            }}
                            disabled={creating}
                        >
                            <option value="" disabled>Players…</option>
                            {pendingGame.options.map((count) => (
                                <option key={count} value={count}>{count} players</option>
                            ))}
                        </select>
                        <button onClick={() => setPendingGame(null)} className="player-count-cancel">✕</button>
                    </div>
                )}
            </section>

            <div className="ornament">· · ·</div>

            <section>
                <h2>Open Rooms</h2>
                {joinError && <p className="join-error">{joinError}</p>}
                <div className="room-list">
                    {rooms.length === 0 && (
                        <p className="empty">No open rooms — create one above</p>
                    )}
                    {rooms.map((room) => {
                        const full = isFull(room);
                        return (
                            <div key={room.id} className={`room-row${full ? ' room-row--full' : ''}`}>
                                <span className="room-game">{GAME_LABELS[room.game_id] ?? room.game_id}</span>
                                <span className="room-host">{room.creator_nickname}</span>
                                <span className="room-count">
                                    {room.player_count + room.bot_count}/{room.max_players}
                                </span>
                                {full ? (
                                    <span className="room-badge room-badge--full">Full</span>
                                ) : (
                                    <button onClick={() => handleJoin(room.id, room.game_id)}>Join</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
