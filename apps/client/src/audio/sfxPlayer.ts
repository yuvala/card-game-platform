import { Howl } from 'howler';

export type SfxId = 'deal' | 'draw' | 'play' | 'collect' | 'flip' | 'shuffle' | 'round-win' | 'game-win' | 'click' | 'player-join';

function pick(base: string, count: number): string {
    const i = Math.floor(Math.random() * count) + 1;
    return `/audio/sfx/${base}-${i}.ogg`;
}

const sfxMap: Record<SfxId, () => string> = {
    'deal':        () => pick('card-slide', 8),
    'draw':        () => pick('card-slide', 8),
    'play':        () => pick('card-place', 4),
    'collect':     () => pick('card-shove', 4),
    'flip':        () => pick('card-fan', 2),
    'shuffle':     () => '/audio/sfx/card-shuffle.ogg',
    'round-win':   () => '/audio/sfx/chips-stack-1.ogg',
    'game-win':    () => '/audio/sfx/chips-collide-1.ogg',
    'click':       () => '/audio/sfx/chip-lay-1.ogg',
    'player-join': () => '/audio/sfx/chips-handle-1.ogg',
};

let volume = 0.7;
let enabled = true;

export const sfxPlayer = {
    play(id: SfxId): void {
        if (!enabled) return;
        new Howl({ src: [sfxMap[id]()], volume }).play();
    },

    setVolume(v: number): void {
        volume = v;
    },

    setEnabled(on: boolean): void {
        enabled = on;
    },
};
