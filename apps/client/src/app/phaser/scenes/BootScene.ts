import * as Phaser from 'phaser';

import { preloadFrenchCardTextures } from '../cards/CardTextureFactory';
import { preloadSpanishSheetTexture } from '../cards/SpanishCardSpriteSheet';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('rewrite-boot');
    }

    preload(): void {
        this.load.image('rewrite-table-bg', 'images/map4.jpg');
        preloadFrenchCardTextures(this, 'vintage-european');
        preloadSpanishSheetTexture(this);
    }

    create(): void {
        this.scene.start('rewrite-table');
    }
}
