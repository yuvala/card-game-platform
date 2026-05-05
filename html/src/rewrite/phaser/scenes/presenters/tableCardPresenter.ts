import * as Phaser from "phaser";

import type { CardGameViewCard, CardGameViewModel, CardGameViewTableCard } from "../../../engine/game/viewModel";
import { TABLE_CENTER_X } from "../../layout";
import { CARD_BACK_STROKE } from "../layout/constants";
import { getTableCardDisplayState } from "../layout/tableCardLayouts";
import type { HandSlotVisual } from "./handPresenter";
import type { TableCardVisual } from "../factories/createTableCardVisual";

interface TableCardTextureApi {
    applyCardTexture(
        image: Phaser.GameObjects.Image,
        card: CardGameViewCard | CardGameViewTableCard | null,
        variant: "compact" | "showcase"
    ): void;
    applyCardBackTexture(image: Phaser.GameObjects.Image): void;
}

interface TableCardPresentationInput {
    scene: Phaser.Scene;
    viewModel: CardGameViewModel;
    tableCardVisuals: TableCardVisual[];
    createTableCardVisual: () => TableCardVisual;
    activeTableCardFlipKey: string;
    textureApi: TableCardTextureApi;
}

interface PlayedCardAnimationInput {
    scene: Phaser.Scene;
    viewModel: CardGameViewModel;
    handSlots: Map<string, HandSlotVisual[]>;
    discardCard: Phaser.GameObjects.Container;
    activeAnimationKey: string;
    onAnimationDone: () => void;
}

function ensureTableCardVisuals(input: {
    tableCardVisuals: TableCardVisual[];
    cardCount: number;
    createTableCardVisual: () => TableCardVisual;
}): void {
    const { tableCardVisuals, cardCount, createTableCardVisual } = input;
    while (tableCardVisuals.length < cardCount) {
        tableCardVisuals.push(createTableCardVisual());
    }
}

function syncTableCardStackDepth(input: {
    card: CardGameViewTableCard;
    visual: TableCardVisual;
    textureApi: TableCardTextureApi;
}): void {
    const { card, visual, textureApi } = input;
    const stackCount = card.stackCount ?? 0;
    const shouldShowStackDepth = !card.isFaceUp && stackCount > 1;
    const visibleBackCount = shouldShowStackDepth
        ? Math.min(visual.stackBacks.length, stackCount - 1)
        : 0;

    visual.stackBacks.forEach((stackBack, index) => {
        const isVisible = index < visibleBackCount;
        stackBack.setVisible(isVisible);
        stackBack.setAlpha(isVisible ? 0.72 + index * 0.1 : 0);
        textureApi.applyCardBackTexture(stackBack);
    });

    visual.stackCountBadge.setVisible(shouldShowStackDepth);
    visual.stackCountText.setVisible(shouldShowStackDepth);
    visual.stackCountText.setText(shouldShowStackDepth ? "x" + String(stackCount) : "");
}

export function syncTableCardPresentation(input: TableCardPresentationInput): string {
    const {
        scene,
        viewModel,
        tableCardVisuals,
        createTableCardVisual,
        activeTableCardFlipKey,
        textureApi
    } = input;
    const tableCards = viewModel.tableCards;
    ensureTableCardVisuals({
        tableCardVisuals,
        cardCount: tableCards.length,
        createTableCardVisual
    });

    if (tableCards.length === 0) {
        tableCardVisuals.forEach((visual) => {
            visual.container.setVisible(false);
        });
        return "";
    }

    const flipKey = tableCards.map((card) => {
        return [
            card.id,
            card.isFaceUp ? "up" : "down",
            String(card.stackCount ?? 1)
        ].join(":");
    }).join("|");
    const shouldAnimateFlip = flipKey !== activeTableCardFlipKey;

    tableCards.forEach((card, index) => {
        const visual = tableCardVisuals[index];
        const position = getTableCardDisplayState(tableCards, index);
        visual.container.setPosition(position.x, position.y);
        visual.container.setAngle(position.angle);
        visual.container.setDepth(80 + position.stackIndex);
        visual.caption.setText(position.stackIndex === 0 ? card.caption ?? "" : "");
        visual.container.setVisible(true);
        visual.outline.setStrokeStyle(3, card.isFaceUp ? 0xffd166 : CARD_BACK_STROKE, 0.9);
        syncTableCardStackDepth({
            card,
            visual,
            textureApi
        });

        if (!shouldAnimateFlip) {
            visual.container.setScale(1);
            textureApi.applyCardTexture(visual.image, card, "showcase");
            return;
        }

        textureApi.applyCardBackTexture(visual.image);
        visual.container.setScale(1);

        scene.tweens.killTweensOf(visual.container);
        scene.tweens.add({
            targets: visual.container,
            scaleX: 0.08,
            duration: 110,
            delay: index * 90,
            ease: "Sine.easeIn",
            onComplete: () => {
                textureApi.applyCardTexture(visual.image, card, "showcase");
                scene.tweens.add({
                    targets: visual.container,
                    scaleX: 1,
                    duration: 160,
                    ease: "Sine.easeOut"
                });
            }
        });
    });

    for (let index = tableCards.length; index < tableCardVisuals.length; index += 1) {
        tableCardVisuals[index].container.setVisible(false);
    }

    return flipKey;
}

export function runPlayedCardAnimation(input: PlayedCardAnimationInput): string {
    const {
        scene,
        viewModel,
        handSlots,
        discardCard,
        activeAnimationKey,
        onAnimationDone
    } = input;
    const animation = viewModel.animation;
    if (!animation) {
        return "";
    }

    const currentPlayer = viewModel.players.find((player) => player.id === animation.playerId);
    const slots = handSlots.get(animation.playerId);
    if (!slots || !currentPlayer || currentPlayer.hand.length <= 0) {
        onAnimationDone();
        return "";
    }

    const animationKey = animation.key;
    if (activeAnimationKey === animationKey) {
        return activeAnimationKey;
    }

    const selectedSlotIndex = currentPlayer.hand.findIndex((card) => {
        return card.id === animation.cardId;
    });
    const slot = slots[selectedSlotIndex];
    if (!slot) {
        onAnimationDone();
        return "";
    }

    discardCard.setVisible(false);

    scene.tweens.add({
        targets: slot.container,
        x: TABLE_CENTER_X,
        y: 392,
        angle: 0,
        duration: 420,
        ease: "Cubic.easeInOut",
        onComplete: () => {
            onAnimationDone();
        }
    });

    return animationKey;
}
