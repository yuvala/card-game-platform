import * as Phaser from "phaser";

import { createDeck } from "@rewrite-core/engine/cards/createDeck";
import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { getCardSkinById } from "@rewrite-core/engine/cards/skinPacks";
import type { CardSandboxSection } from "../createCardSandboxGame";
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    getCardFaceTextureKey
} from "../../phaser/cards/CardTextureFactory";
import {
    createCardAnimationLayer,
    type CardAnimationLayer
} from "../../phaser/scenes/animations/cardAnimationLayer";
import { collectPileExample } from "../cardSandbox/examples/collectPileExample";
import { dealerRevealExample } from "../cardSandbox/examples/dealerRevealExample";
import { ghostArcExample } from "../cardSandbox/examples/ghostArcExample";
import { ghostMoveExample } from "../cardSandbox/examples/ghostMoveExample";
import { liftFlipExample } from "../cardSandbox/examples/liftFlipExample";
import { realCardExample } from "../cardSandbox/examples/realCardExample";
import { shuffleExample } from "../cardSandbox/examples/shuffleExample";
import { stackExample } from "../cardSandbox/examples/stackExample";
import { verticalFlipExample } from "../cardSandbox/examples/verticalFlipExample";
import { warRevealHoldExample } from "../cardSandbox/examples/warRevealHoldExample";
import { drawStateGallery } from "../cardSandbox/stateGallery";
import type {
    CardSandboxExample,
    CardSandboxExampleContext,
    CardSandboxExampleRuntime
} from "../cardSandbox/types";

const GOLD = 0xffd166;
const CREAM = "#f6ecd2";
const DIM = "rgba(246,236,210,0.72)";
const SKIN_ID = "vintage-european";

const sectionExamples: Record<CardSandboxSection, CardSandboxExample[]> = {
    real: [
        realCardExample,
        verticalFlipExample,
        liftFlipExample
    ],
    ghost: [
        ghostMoveExample,
        ghostArcExample
    ],
    layer: [
        warRevealHoldExample,
        dealerRevealExample,
        stackExample,
        collectPileExample,
        shuffleExample
    ]
};

export class CardSandboxScene extends Phaser.Scene {
    private deckId: string;
    private section: CardSandboxSection = "real";
    private renderLayer?: Phaser.GameObjects.Container;
    private animationLayer?: CardAnimationLayer;
    private runtimes: CardSandboxExampleRuntime[] = [];

    constructor(initialDeckId: string) {
        super("card-sandbox");
        this.deckId = initialDeckId;
    }

    create(): void {
        this.animationLayer = createCardAnimationLayer(this);
        this.renderSandbox();
    }

    setDeck(deckId: string): void {
        if (!supportedDeckDefinitions[deckId as keyof typeof supportedDeckDefinitions]) {
            return;
        }

        this.deckId = deckId;
        this.renderSandbox();
    }

    setSection(section: CardSandboxSection): void {
        this.section = section;
        this.renderSandbox();
    }

    replayAnimations(): void {
        this.animationLayer?.clear();
        this.runtimes.forEach((runtime) => {
            runtime.run?.();
        });
    }

    private renderSandbox(): void {
        this.runtimes.forEach((runtime) => {
            runtime.destroy?.();
        });
        this.runtimes = [];
        this.animationLayer?.clear();
        this.renderLayer?.destroy(true);
        this.renderLayer = this.add.container(0, 0);

        this.ensureTextures();
        this.drawBackground();

        const context = this.createExampleContext();
        if (this.section === "real") {
            drawStateGallery(context);
            this.drawRealCardExamplesHeading();
        } else {
            this.drawSectionHeading(this.section);
        }
        this.runtimes = sectionExamples[this.section].map((example, index) => {
            return example.render({
                ...context,
                panel: getSectionPanel(this.section, index, example)
            });
        });
    }

    private ensureTextures(): void {
        const deckDefinition = supportedDeckDefinitions[this.deckId as keyof typeof supportedDeckDefinitions];
        ensureDeckTextures(this, deckDefinition, getCardSkinById(SKIN_ID));
    }

    private drawBackground(): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(this.add.rectangle(520, 490, 1040, 980, 0x07140f, 1));
        this.renderLayer.add(this.add.rectangle(520, 490, 984, 912, 0x0d261d, 0.88).setStrokeStyle(2, GOLD, 0.16));
    }

    private drawSectionHeading(section: CardSandboxSection): void {
        if (!this.renderLayer) {
            return;
        }

        const titleBySection: Record<CardSandboxSection, string> = {
            real: "Real card examples",
            ghost: "Ghost card examples",
            layer: "Animation layer examples"
        };
        const detailBySection: Record<CardSandboxSection, string> = {
            real: "",
            ghost: "Temporary ghost cards are created for cross-zone movement and then inspected or cleared.",
            layer: "Animation-layer examples own temporary card visuals and keep game/table layout stable."
        };

        this.renderLayer.add(this.add.text(70, 50, titleBySection[section], {
            fontFamily: "Arial",
            fontSize: "22px",
            fontStyle: "700",
            color: CREAM
        }));
        this.renderLayer.add(this.add.text(70, 84, detailBySection[section], {
            fontFamily: "Arial",
            fontSize: "14px",
            color: DIM,
            wordWrap: { width: 520 }
        }));
    }

    private drawRealCardExamplesHeading(): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(this.add.text(70, 298, "Real card local effect", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "700",
            color: CREAM
        }));
    }

    private createExampleContext(): CardSandboxExampleContext {
        if (!this.renderLayer || !this.animationLayer) {
            throw new Error("Card sandbox scene is missing its render or animation layer.");
        }

        const deckDefinition = supportedDeckDefinitions[this.deckId as keyof typeof supportedDeckDefinitions];
        const skin = getCardSkinById(SKIN_ID);

        return {
            scene: this,
            renderLayer: this.renderLayer,
            animationLayer: this.animationLayer,
            deck: createDeck(deckDefinition),
            deckId: this.deckId,
            skinId: SKIN_ID,
            colors: {
                gold: GOLD,
                cream: CREAM,
                dim: DIM
            },
            getFaceTexture: (card, variant = "showcase") => {
                return getCardFaceTextureKey(card.id, skin.id, variant);
            },
            getBackTexture: () => {
                return getCardBackTextureKey(deckDefinition.id, skin.id);
            }
        };
    }
}

function getSectionPanel(
    section: CardSandboxSection,
    index: number,
    example: CardSandboxExample
) {
    if (section === "real") {
        return example.panel;
    }

    const topRowY = 176;
    const secondRowY = 528;
    const columns = [70, 390, 710];
    const row = Math.floor(index / 3);
    const column = index % 3;

    return {
        ...example.panel,
        x: columns[column],
        y: row === 0 ? topRowY : secondRowY,
        width: 260,
        height: 300
    };
}
