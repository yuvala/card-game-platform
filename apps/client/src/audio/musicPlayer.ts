import { Howl } from 'howler';

export type MusicState = 'lobby-1' | 'lobby-2' | 'lobby-3' | 'lobby-4' | 'lobby-5' | 'game' | 'win' | 'lose' | 'none';

const tracks: Partial<Record<MusicState, Howl>> = {};

let current: MusicState = 'none';
let volume = 0.4;
let enabled = true;

function getTrack(state: MusicState): Howl | undefined {
    if (tracks[state]) return tracks[state];
    const src = stateToSrc(state);
    if (!src) return undefined;
    tracks[state] = new Howl({ src, loop: state.startsWith('lobby-') || state === 'game', volume: 0 });
    return tracks[state];
}

function stateToSrc(state: MusicState): string[] | undefined {
    const base = '/audio/music/';
    const map: Partial<Record<MusicState, string>> = {
        'lobby-1': 'lobby_01',
        'lobby-2': 'lobby_02',
        'lobby-3': 'lobby_03',
        'lobby-4': 'lobby_04',
        'lobby-5': 'lobby_05',
    };
    const name = map[state];
    if (!name) return undefined;
    return [`${base}${name}.mp3`];
}

export const musicPlayer = {
    setMode(state: MusicState, fadeDuration = 600): void {
        if (state === current) return;

        const prev = getTrack(current);
        if (prev) prev.fade(prev.volume(), 0, fadeDuration);

        current = state;
        if (!enabled || state === 'none') return;

        const next = getTrack(state);
        if (!next) return;
        if (!next.playing()) next.play();
        next.fade(0, volume, fadeDuration);
    },

    setVolume(v: number): void {
        volume = v;
        const track = getTrack(current);
        if (track?.playing()) track.volume(v);
    },

    setEnabled(on: boolean): void {
        enabled = on;
        const track = getTrack(current);
        if (!on) track?.pause();
        else if (track && !track.playing()) track.play();
    },
};
