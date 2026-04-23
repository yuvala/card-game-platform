import * as Phaser from "phaser";

export class BootScene extends Phaser.Scene {
    constructor() {
        super("rewrite-boot");
    }

    preload(): void {
        this.load.image("rewrite-table-bg", "images/map4.jpg");
    }

    create(): void {
        this.scene.start("rewrite-table");
        this.scene.launch("rewrite-ui");
    }
}
