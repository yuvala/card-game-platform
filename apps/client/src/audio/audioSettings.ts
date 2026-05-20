export interface AudioSettings {
    musicEnabled: boolean;
    sfxEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
}

const STORAGE_KEY = 'audio-settings';

const defaults: AudioSettings = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.4,
    sfxVolume: 0.7,
};

export function loadAudioSettings(): AudioSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaults };
        return { ...defaults, ...JSON.parse(raw) as Partial<AudioSettings> };
    } catch {
        return { ...defaults };
    }
}

export function saveAudioSettings(settings: AudioSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
