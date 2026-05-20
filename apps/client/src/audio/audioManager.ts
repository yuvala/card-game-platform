import { loadAudioSettings, saveAudioSettings, type AudioSettings } from './audioSettings';
import { musicPlayer } from './musicPlayer';
import { sfxPlayer } from './sfxPlayer';

let settings: AudioSettings = loadAudioSettings();

export const audioManager = {
    init(): void {
        settings = loadAudioSettings();
        musicPlayer.setVolume(settings.musicVolume);
        musicPlayer.setEnabled(settings.musicEnabled);
        sfxPlayer.setVolume(settings.sfxVolume);
        sfxPlayer.setEnabled(settings.sfxEnabled);
    },

    getSettings(): AudioSettings {
        return { ...settings };
    },

    update(patch: Partial<AudioSettings>): void {
        settings = { ...settings, ...patch };
        saveAudioSettings(settings);

        if (patch.musicVolume !== undefined) musicPlayer.setVolume(patch.musicVolume);
        if (patch.musicEnabled !== undefined) musicPlayer.setEnabled(patch.musicEnabled);
        if (patch.sfxVolume !== undefined) sfxPlayer.setVolume(patch.sfxVolume);
        if (patch.sfxEnabled !== undefined) sfxPlayer.setEnabled(patch.sfxEnabled);
    },
};
