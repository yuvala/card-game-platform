import * as Phaser from "phaser";

import type { CardGameEffectReason } from "@rewrite-core/engine/game/effects";

type AudioWindow = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

export interface CardSoundOptions {
    enabled?: boolean;
    volume?: number;
}

let audioContext: AudioContext | null = null;
let lastPlayedAtByKey = new Map<string, number>();

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") {
        return null;
    }

    if (audioContext) {
        return audioContext;
    }

    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
        return null;
    }

    audioContext = new AudioContextConstructor();
    return audioContext;
}

function canPlay(scene: Phaser.Scene, key: string, options: CardSoundOptions = {}): boolean {
    if (options.enabled === false) {
        return false;
    }

    const context = getAudioContext();
    if (!context) {
        return false;
    }

    if (context.state === "suspended") {
        void context.resume();
    }

    const now = scene.time.now;
    const lastPlayedAt = lastPlayedAtByKey.get(key) ?? -Infinity;
    if (now - lastPlayedAt < 34) {
        return false;
    }

    lastPlayedAtByKey.set(key, now);
    return true;
}

function getMasterVolume(options: CardSoundOptions = {}): number {
    return Phaser.Math.Clamp(options.volume ?? 0.46, 0, 1);
}

function createNoiseBuffer(context: AudioContext, durationSeconds: number): AudioBuffer {
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
        channelData[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    return buffer;
}

function playNoiseClick(input: {
    scene: Phaser.Scene;
    key: string;
    duration: number;
    volume: number;
    frequency: number;
    filterType: BiquadFilterType;
    playbackRate?: number;
    delay?: number;
}): void {
    const { scene, key, duration, volume, frequency, filterType, playbackRate = 1, delay = 0 } = input;
    if (!canPlay(scene, key, { volume })) {
        return;
    }

    const context = getAudioContext();
    if (!context) {
        return;
    }

    const startTime = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = createNoiseBuffer(context, duration);
    source.playbackRate.value = playbackRate;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.02);
}

function playToneThump(input: {
    scene: Phaser.Scene;
    key: string;
    duration: number;
    volume: number;
    frequency: number;
    delay?: number;
}): void {
    const { scene, key, duration, volume, frequency, delay = 0 } = input;
    if (!canPlay(scene, key, { volume })) {
        return;
    }

    const context = getAudioContext();
    if (!context) {
        return;
    }

    const startTime = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.72), startTime + duration);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
}

export function playCardMoveSound(
    scene: Phaser.Scene,
    reason: CardGameEffectReason,
    options: CardSoundOptions = {}
): void {
    const volume = getMasterVolume(options);

    switch (reason) {
        case "deal":
        case "draw":
            playNoiseClick({
                scene,
                key: "card-move-fast",
                duration: 0.055,
                volume: volume * 0.34,
                frequency: 1600,
                filterType: "bandpass",
                playbackRate: Phaser.Math.FloatBetween(0.96, 1.08)
            });
            return;
        case "play":
            playNoiseClick({
                scene,
                key: "card-place",
                duration: 0.07,
                volume: volume * 0.38,
                frequency: 900,
                filterType: "bandpass",
                playbackRate: Phaser.Math.FloatBetween(0.94, 1.04)
            });
            playToneThump({
                scene,
                key: "card-place-thump",
                duration: 0.06,
                volume: volume * 0.08,
                frequency: Phaser.Math.FloatBetween(120, 150)
            });
            return;
        case "collect":
            playNoiseClick({
                scene,
                key: "card-collect",
                duration: 0.075,
                volume: volume * 0.3,
                frequency: 760,
                filterType: "lowpass",
                playbackRate: Phaser.Math.FloatBetween(0.92, 1.03)
            });
            return;
    }
}

export function playCardFlipSound(scene: Phaser.Scene, options: CardSoundOptions = {}): void {
    const volume = getMasterVolume(options);
    playNoiseClick({
        scene,
        key: "card-flip",
        duration: 0.075,
        volume: volume * 0.28,
        frequency: 2200,
        filterType: "highpass",
        playbackRate: Phaser.Math.FloatBetween(0.97, 1.08)
    });
}

export function playShuffleSound(scene: Phaser.Scene, options: CardSoundOptions = {}): void {
    const volume = getMasterVolume(options);
    const context = getAudioContext();
    if (!context || !canPlay(scene, "deck-shuffle", options)) {
        return;
    }

    const startTime = context.currentTime;
    for (let index = 0; index < 9; index += 1) {
        playNoiseClick({
            scene,
            key: "deck-shuffle-" + String(index),
            duration: 0.06,
            volume: volume * (0.18 + index * 0.008),
            frequency: 900 + index * 90,
            filterType: index % 2 === 0 ? "bandpass" : "highpass",
            playbackRate: Phaser.Math.FloatBetween(0.92, 1.08),
            delay: startTime - context.currentTime + index * 0.065
        });
    }
}

export function playInvalidMoveSound(scene: Phaser.Scene, options: CardSoundOptions = {}): void {
    const volume = getMasterVolume(options);
    playToneThump({
        scene,
        key: "invalid-move",
        duration: 0.12,
        volume: volume * 0.14,
        frequency: 120
    });
}
