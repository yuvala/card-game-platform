export interface RoomRow {
    id: string;
    game_id: string;
    status: string;
    max_players: number;
    bot_count: number;
    player_count: number;
    creator_nickname: string;
    owner_user_id: string | null;
}

export function isFull(room: RoomRow): boolean {
    return room.player_count + room.bot_count >= room.max_players;
}
