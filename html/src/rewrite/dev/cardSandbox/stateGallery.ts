import type { CardSandboxExampleContext } from "./types";

const CARD_W = 90;
const CARD_H = 132;

export function drawStateGallery(context: CardSandboxExampleContext): void {
    const { scene, renderLayer, deck, colors } = context;
    const states = [
        { label: "showcase", card: deck[0], variant: "showcase" as const, angle: 0, alpha: 1 },
        { label: "compact", card: deck[1], variant: "compact" as const, angle: 0, alpha: 1 },
        { label: "selected", card: deck[2], variant: "showcase" as const, angle: 0, alpha: 1 },
        { label: "rotated", card: deck[3], variant: "showcase" as const, angle: -10, alpha: 1 },
        { label: "dimmed", card: deck[4], variant: "showcase" as const, angle: 0, alpha: 0.42 }
    ];

    renderLayer.add(scene.add.text(70, 50, "Deck states", {
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "700",
        color: colors.cream
    }));
    renderLayer.add(scene.add.text(70, 78, "Static preview. Each card below represents one visual state.", {
        fontFamily: "Arial",
        fontSize: "13px",
        color: colors.dim,
        wordWrap: { width: 360 }
    }));

    states.forEach((state, index) => {
        const x = 112 + index * 132;
        renderLayer.add(scene.add.image(x, 180, context.getFaceTexture(state.card, state.variant))
            .setDisplaySize(CARD_W, CARD_H)
            .setAngle(state.angle)
            .setAlpha(state.alpha));
        if (state.label === "selected") {
            renderLayer.add(scene.add.rectangle(x, 180, CARD_W + 8, CARD_H + 8, 0x000000, 0)
                .setStrokeStyle(3, colors.gold, 0.95));
        }
        addCardCaption(context, x, 258, state.label);
    });

    const backX = 112 + states.length * 132;
    renderLayer.add(scene.add.image(backX, 180, context.getBackTexture()).setDisplaySize(CARD_W, CARD_H));
    addCardCaption(context, backX, 258, "back");
}

function addCardCaption(context: CardSandboxExampleContext, x: number, y: number, text: string): void {
    context.renderLayer.add(context.scene.add.text(x, y, text, {
        fontFamily: "Arial",
        fontSize: "11px",
        fontStyle: "700",
        color: "#ffd166"
    }).setOrigin(0.5));
}
