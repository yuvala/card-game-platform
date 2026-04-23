export type Suit = "heart" | "spade" | "diamond" | "club";

export interface Box {
    top: number;
    left: number;
    height: number;
    width: number;
    spotId: string;
}

export interface PlayerSeed {
    player: string;
    playerName: string;
    money: string;
}

export interface PlayersDocument {
    players: PlayerSeed[];
}
