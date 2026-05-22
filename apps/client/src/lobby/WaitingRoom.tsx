import React from 'react';
import type { WaitingRoomState } from './useWaitingRoom';

const GAME_LABELS: Record<string, string> = {
    'war-lite': 'War',
    'brisca-lite': 'Brisca',
    'poker-lite': 'Poker',
};

interface Props {
    room: WaitingRoomState;
    players: string[];
    nickname: string;
    isOwner: boolean;
    leftMessage: string | null;
    onLeave: () => void;
    onKick: (name: string) => void;
    onBotChange: (delta: number) => void;
    onLaunch: () => void;
}

export function WaitingRoom({ room, players, nickname, isOwner, leftMessage, onLeave, onKick, onBotChange, onLaunch }: Props) {
    const totalFilled = players.length + room.botCount;
    const emptySlots = room.maxPlayers - totalFilled;

    const canLaunch = room.playerCountOptions.length > 0
        ? room.playerCountOptions.includes(totalFilled)
        : totalFilled >= room.minPlayers;

    const botNames = Array.from({ length: room.botCount }, (_, i) => `Bot ${i + 1}`);

    return (
        <div className="lobby-center">
            <h1>{GAME_LABELS[room.gameId] ?? room.gameId}</h1>
            {leftMessage && <p className="waiting-left-msg">{leftMessage}</p>}

            <div className="waiting-players">
                {players.map((name) => (
                    <div key={name} className="waiting-player">
                        <span className="waiting-player-suit">♠</span>{' '}{name}
                        {isOwner && name !== nickname && (
                            <button className="waiting-player-kick" onClick={() => onKick(name)} title="Kick player">✕</button>
                        )}
                    </div>
                ))}
                {botNames.map((name) => (
                    <div key={name} className="waiting-player">
                        <span className="waiting-player-suit">♠</span>{' '}{name}
                    </div>
                ))}
                {Array.from({ length: emptySlots }, (_, i) => (
                    <div key={`empty-${i}`} className="waiting-player waiting-player--empty">
                        <span className="waiting-player-suit">·</span>{' '}Waiting…
                    </div>
                ))}
            </div>

            {isOwner && (
                <div className="bot-controls">
                    <button className="bot-btn" onClick={() => onBotChange(-1)} disabled={room.botCount === 0}>−</button>
                    <span className="bot-label">{room.botCount} {room.botCount === 1 ? 'Bot' : 'Bots'}</span>
                    <button className="bot-btn" onClick={() => onBotChange(1)} disabled={emptySlots === 0}>+</button>
                </div>
            )}

            {isOwner && (
                <button onClick={onLaunch} disabled={!canLaunch}>Launch Game</button>
            )}

            <button
                onClick={onLeave}
                style={{ background: 'none', border: '1px solid #6b4f28', color: '#a08860', fontSize: '0.8rem' }}
            >
                Leave Room
            </button>
        </div>
    );
}
