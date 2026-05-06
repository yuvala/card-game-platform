import * as Phaser from "phaser";

import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { getCardSkinById } from "@rewrite-core/engine/cards/skinPacks";
import type { CardGameSession } from "@rewrite-core/engine/game/session";
import type {
    CardGameViewCard,
    CardGameViewModel,
    CardGameViewPlayer,
    CardGameViewTableCard
} from "@rewrite-core/engine/game/viewModel";
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    getCardFaceTextureKey
} from "../../phaser/cards/CardTextureFactory";
import { PLAYER_GAME_HEIGHT, PLAYER_GAME_WIDTH } from "../createPlayerGame";

const CARD_W = 72;
const CARD_H = 106;
const HAND_CARD_W = 88;
const HAND_CARD_H = 129;
const OPPONENT_CARD_W = 42;
const OPPONENT_CARD_H = 62;
const TABLE_CARD_W = 62;
const TABLE_CARD_H = 91;
const FELT = 0x246f34;
const FELT_DARK = 0x0b2118;
const GOLD = 0xffd166;
const CREAM = "#f6ecd2";
const DIM = "rgba(246,236,210,0.72)";

interface CardDisplaySize {
    width: number;
    height: number;
}

export class PlayerTableScene extends Phaser.Scene {
    private readonly session: CardGameSession<CardGameViewModel>;
    private subscription?: { unsubscribe(): void };
    private renderLayer?: Phaser.GameObjects.Container;
    private activeDeckId = "";
    private activeCardSkinId = "";

    constructor(session: CardGameSession<CardGameViewModel>) {
        super("player-table");
        this.session = session;
    }

    preload(): void {
        this.load.image("rewrite-table-bg", "images/map4.jpg");
    }

    create(): void {
        this.subscription = this.session.subscribe(() => {
            this.syncViewModel(this.session.getViewModel(null));
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.subscription?.unsubscribe();
            this.subscription = undefined;
        });
        this.syncViewModel(this.session.getViewModel(null));
    }

    private syncViewModel(viewModel: CardGameViewModel): void {
        this.ensureCardTextures(viewModel);
        this.renderLayer?.destroy(true);
        this.renderLayer = this.add.container(0, 0);

        this.drawBackground();
        this.drawTopBar(viewModel);
        this.drawOpponents(viewModel);
        this.drawTableCards(viewModel);
        this.drawPlayerHand(viewModel);
        this.drawBottomControls(viewModel);
    }

    private drawBackground(): void {
        if (!this.renderLayer) {
            return;
        }

        if (this.textures.exists("rewrite-table-bg")) {
            this.renderLayer.add(
                this.add.image(PLAYER_GAME_WIDTH / 2, PLAYER_GAME_HEIGHT / 2, "rewrite-table-bg")
                    .setDisplaySize(PLAYER_GAME_WIDTH + 80, PLAYER_GAME_HEIGHT + 80)
                    .setAlpha(0.18)
            );
        }

        this.renderLayer.add(
            this.add.rectangle(PLAYER_GAME_WIDTH / 2, PLAYER_GAME_HEIGHT / 2, PLAYER_GAME_WIDTH, PLAYER_GAME_HEIGHT, 0x07140f, 0.92)
        );
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 312, 312, 470, 70, FELT, 0.96, 0x133b22, 5, 0.96));
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 314, 286, 434, 54, 0x2e8a3d, 0.55, 0x77bf69, 1, 0.18));
    }

    private drawTopBar(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const isPlayerTurn = viewModel.players[0]?.isCurrentTurn === true;
        this.renderLayer.add(this.add.circle(36, 34, 20, 0x020806, 0.84));
        this.renderLayer.add(this.add.text(36, 31, "‹", {
            fontFamily: "Arial",
            fontSize: "28px",
            color: CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 34, 94, 30, 15, isPlayerTurn ? 0xf7efe0 : 0x163b2b, 0.98));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 34, isPlayerTurn ? "Your turn" : viewModel.phaseLabel, {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "700",
            color: isPlayerTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH - 36, 34, 20, 0x020806, 0.84));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH - 36, 34, "⚙", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: CREAM
        }).setOrigin(0.5));
    }

    private drawOpponents(viewModel: CardGameViewModel): void {
        const opponents = viewModel.players.slice(1);
        const positions = getOpponentPositions(opponents.length);

        opponents.forEach((player, index) => {
            const position = positions[index];
            if (!position) {
                return;
            }

            this.drawOpponent(player, position.x, position.y, position.angle);
        });
    }

    private drawOpponent(player: CardGameViewPlayer, x: number, y: number, angle: number): void {
        if (!this.renderLayer) {
            return;
        }

        const cardCount = Math.max(1, Math.min(3, player.hand.length || Number.parseInt(player.metaLabel, 10) || 1));
        for (let index = 0; index < cardCount; index += 1) {
            const image = this.add.image(
                x + Math.cos((angle * Math.PI) / 180) * index * 12,
                y + Math.sin((angle * Math.PI) / 180) * index * 12,
                this.getActiveBackTextureKey()
            )
                .setDisplaySize(OPPONENT_CARD_W, OPPONENT_CARD_H)
                .setAngle(angle);
            this.setCardDisplaySize(image, OPPONENT_CARD_W, OPPONENT_CARD_H);
            this.renderLayer.add(image);
        }

        this.renderLayer.add(this.add.circle(x, y + 48, 22, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
            .setStrokeStyle(3, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85));
        this.renderLayer.add(this.add.text(x, y + 48, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(x, y + 78, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(x, y + 95, player.metaLabel, {
            fontFamily: "Arial",
            fontSize: "11px",
            color: DIM
        }).setOrigin(0.5));
    }

    private drawTableCards(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const cards = viewModel.tableCards;
        const startX = PLAYER_GAME_WIDTH / 2 - ((cards.length - 1) * 54) / 2;
        cards.forEach((card, index) => {
            const x = startX + index * 54;
            const y = 286 + (index % 2) * 8;
            const image = this.add.image(x, y, this.getTextureForCard(card, "compact"))
                .setDisplaySize(TABLE_CARD_W, TABLE_CARD_H)
                .setAngle((index - (cards.length - 1) / 2) * 4);
            this.setCardDisplaySize(image, TABLE_CARD_W, TABLE_CARD_H);
            this.renderLayer?.add(image);
        });

        const pileText = getPrimaryPileText(viewModel);
        if (pileText) {
            this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 368, pileText, {
                fontFamily: "Arial",
                fontSize: "13px",
                fontStyle: "700",
                color: "rgba(255,209,102,0.86)"
            }).setOrigin(0.5));
        }
    }

    private drawPlayerHand(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const player = viewModel.players[0];
        if (!player) {
            return;
        }

        this.renderLayer.add(this.add.circle(52, 514, 26, player.isCurrentTurn ? GOLD : 0x1d7f54, 1)
            .setStrokeStyle(3, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.92));
        this.renderLayer.add(this.add.text(52, 514, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(86, 506, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "700",
            color: CREAM
        }));
        this.renderLayer.add(this.add.text(86, 525, player.metaLabel, {
            fontFamily: "Arial",
            fontSize: "12px",
            color: DIM
        }));

        const cards = player.hand;
        const centerX = PLAYER_GAME_WIDTH / 2;
        const spacing = Math.min(58, cards.length > 1 ? 230 / (cards.length - 1) : 0);
        const startX = centerX - (spacing * (cards.length - 1)) / 2;
        cards.forEach((card, index) => {
            const isSelected = card.id === viewModel.selectedCardId;
            const x = startX + index * spacing;
            const y = 594 - Math.abs(index - (cards.length - 1) / 2) * 6 - (isSelected ? 18 : 0);
            const angle = (index - (cards.length - 1) / 2) * 7;
            const image = this.add.image(x, y, this.getTextureForCard(card, "showcase"))
                .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
                .setAngle(angle)
                .setDepth(30 + index);
            this.setCardDisplaySize(image, HAND_CARD_W, HAND_CARD_H);
            if (player.canInteract && card.isFaceUp) {
                image.setInteractive({ useHandCursor: true });
                image.on(Phaser.Input.Events.POINTER_DOWN, () => {
                    this.session.send({ type: "SELECT_CARD", cardId: card.id });
                });
            }
            this.renderLayer?.add(image);
        });
    }

    private drawBottomControls(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const action = viewModel.primaryAction;
        const canPlay = viewModel.controls.canPlay || action?.eventType === "PLAY_CARD";
        const label = action?.label ?? (viewModel.players[0]?.isCurrentTurn ? "Select Card" : "Waiting");
        const button = createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 662, 144, 48, 16, canPlay ? 0xffd166 : 0x244034, canPlay ? 1 : 0.76);
        this.renderLayer.add(button);
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 662, label, {
            fontFamily: "Arial",
            fontSize: "16px",
            fontStyle: "700",
            color: canPlay ? "#10251c" : DIM
        }).setOrigin(0.5));

        if (canPlay && action?.eventType === "PLAY_CARD") {
            const hitTarget = this.add.rectangle(PLAYER_GAME_WIDTH / 2, 662, 144, 48, 0x000000, 0.001)
                .setInteractive({ useHandCursor: true });
            hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
                this.session.send({ type: "PLAY_CARD" });
            });
            this.renderLayer.add(hitTarget);
        }

        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 628, viewModel.statusText, {
            fontFamily: "Arial",
            fontSize: "11px",
            color: DIM,
            align: "center",
            wordWrap: { width: PLAYER_GAME_WIDTH - 48 }
        }).setOrigin(0.5));
    }

    private ensureCardTextures(viewModel: CardGameViewModel): void {
        if (this.activeDeckId === viewModel.deckId && this.activeCardSkinId === viewModel.cardSkinId) {
            return;
        }

        const deckDefinition = supportedDeckDefinitions[viewModel.deckId as keyof typeof supportedDeckDefinitions];
        if (!deckDefinition) {
            return;
        }

        const skin = getCardSkinById(viewModel.cardSkinId);
        ensureDeckTextures(this, deckDefinition, skin);
        this.activeDeckId = deckDefinition.id;
        this.activeCardSkinId = skin.id;
    }

    private getTextureForCard(card: CardGameViewCard | CardGameViewTableCard, variant: "compact" | "showcase"): string {
        if (!card.isFaceUp) {
            return this.getActiveBackTextureKey();
        }

        return getCardFaceTextureKey(card.id, this.activeCardSkinId, variant);
    }

    private getActiveBackTextureKey(): string {
        return getCardBackTextureKey(this.activeDeckId || "french", this.activeCardSkinId || "vintage-european");
    }

    private setCardDisplaySize(image: Phaser.GameObjects.Image, width: number, height: number): void {
        image.setDisplaySize(width, height);
        image.setData("cardDisplaySize", {
            width,
            height
        } satisfies CardDisplaySize);
    }
}

function getOpponentPositions(count: number): Array<{ x: number; y: number; angle: number }> {
    switch (count) {
        case 0:
            return [];
        case 1:
            return [{ x: PLAYER_GAME_WIDTH / 2 - 34, y: 118, angle: 0 }];
        case 2:
            return [
                { x: 70, y: 210, angle: -24 },
                { x: PLAYER_GAME_WIDTH - 70, y: 210, angle: 24 }
            ];
        default:
            return [
                { x: PLAYER_GAME_WIDTH / 2 - 34, y: 118, angle: 0 },
                { x: PLAYER_GAME_WIDTH - 70, y: 238, angle: 24 },
                { x: 70, y: 238, angle: -24 },
                { x: PLAYER_GAME_WIDTH / 2 + 34, y: 118, angle: 0 }
            ].slice(0, count);
    }
}

function getPrimaryPileText(viewModel: CardGameViewModel): string {
    const drawPile = viewModel.piles.find((pile) => pile.role === "draw");
    const trumpPile = viewModel.piles.find((pile) => pile.role === "trump");
    if (drawPile && trumpPile) {
        return drawPile.countLabel;
    }

    return drawPile?.countLabel ?? viewModel.roundLabel;
}

function createRoundedPanel(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    radius: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor?: number,
    strokeWidth = 1,
    strokeAlpha = 0
): Phaser.GameObjects.Graphics {
    const panel = scene.add.graphics();
    panel.fillStyle(fillColor, fillAlpha);
    panel.fillRoundedRect(centerX - width / 2, centerY - height / 2, width, height, radius);
    if (strokeColor !== undefined && strokeAlpha > 0) {
        panel.lineStyle(strokeWidth, strokeColor, strokeAlpha);
        panel.strokeRoundedRect(centerX - width / 2, centerY - height / 2, width, height, radius);
    }

    return panel;
}
