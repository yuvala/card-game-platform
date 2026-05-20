import * as Phaser from 'phaser';

/**
 * Shared Phaser game config builder.
 * Sets WebGL renderer with antialias. Game dimensions stay at logical size —
 * DPR scaling is handled separately and not via game dimensions.
 */
export function buildPhaserConfig(
    baseWidth: number,
    baseHeight: number,
    overrides: Phaser.Types.Core.GameConfig,
): Phaser.Types.Core.GameConfig {
    return {
        type: Phaser.WEBGL,
        ...overrides,
        width: baseWidth,
        height: baseHeight,
        render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: false,
            ...(overrides.render as object | undefined),
        },
        scale: {
            autoRound: true,
            ...(overrides.scale as object | undefined),
        },
    };
}
