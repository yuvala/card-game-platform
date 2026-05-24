import * as Phaser from "phaser";

import { isMoveCardEffect, type MoveCardEffect } from "@rewrite-core/engine/game/effects";
import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { getCardSkinById } from "@rewrite-core/engine/cards/skinPacks";
import type { CardGameSession } from "@rewrite-core/engine/game/session";
import type {
    CardGameViewCard,
    CardGameViewModel,
    CardGameViewPlayer,
I.     CardGameViewPile,
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
const HAND_CARD_W = 82;
const HAND_CARD_H = 120;
const OPPONENT_CARD_W = 42;
const OPPONENT_CARD_H = 62;
const TABLE_CARD_W = 62;
const TABLE_CARD_H = 91;
const TOP_BAR_Y = 34;
const CONNECTION_STATUS_Y = 72;
const GAME_INFO_Y = 112;
const TABLE_CARD_Y = 322;
const STOCK_TRUMP_Y = 634;
const PLAYER_HUD_Y = 488;
const HAND_Y = 564;
const ACTION_STATUS_Y = 622;
const ACTION_BUTTON_Y = 660;
const FELT = 0x246f34;
const FELT_DARK = 0x0b2118;
const GOLD = 0xffd166;
const CREAM = "#f6ecd2";
const DIM = "rgba(246,236,210,0.72)";

type PlayerSessionStatus =
    | { type: "connected" }
    | { type: "error"; message: string }
    | { type: "closed"; message: string };

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
    private activeEffectBatchKey = "";

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
        this.drawGameInfo(viewModel);
        this.drawOpponents(viewModel);
        this.drawTableCards(viewModel);
        this.drawPlayerHand(viewModel);
        this.drawBottomControls(viewModel);
        this.drawSessionStatus();
        this.presentMoveEffects(viewModel);
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
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 350, 312, 412, 68, FELT, 0.96, 0x133b22, 5, 0.96));
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 352, 286, 374, 50, 0x2e8a3d, 0.55, 0x77bf69, 1, 0.18));
    }

    private drawTopBar(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const isPlayerTurn = viewModel.players[0]?.isCurrentTurn === true;
        this.renderLayer.add(this.add.circle(36, TOP_BAR_Y, 20, 0x020806, 0.84));
        this.renderLayer.add(this.add.text(36, 31, "‹", {
            fontFamily: "Arial",
            fontSize: "28px",
            color: CREAM
        }).setOrigin(0.5));
        const isBrisca = hasTrumpPile(viewModel);
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, TOP_BAR_Y, isBrisca ? 104 : 94, 30, 15, isPlayerTurn ? 0xf7efe0 : 0x163b2b, 0.98));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, TOP_BAR_Y, isBrisca ? "BRISCA" : (isPlayerTurn ? "Your turn" : viewModel.phaseLabel), {
            fontFamily: "Arial",
            fontSize: isBrisca ? "18px" : "14px",
            fontStyle: "700",
            color: isPlayerTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH - 36, TOP_BAR_Y, 20, 0x020806, 0.84));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH - 36, TOP_BAR_Y, "⚙", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: CREAM
        }).setOrigin(0.5));
    }

    private drawGameInfo(viewModel: CardGameViewModel): void {
        if (!this.renderLayer || !hasTrumpPile(viewModel)) {
            return;
        }

        const trumpLabel = getTrumpLabel(viewModel);
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, GAME_INFO_Y, 262, 54, 24, 0x082417, 0.88, 0x5ea65d, 2, 0.3));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 104, GAME_INFO_Y, 20, 0xd3a22e, 1)
            .setStrokeStyle(2, 0xffd166, 0.72));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 104, GAME_INFO_Y, "T", {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "700",
            color: "#10251c"
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 76, GAME_INFO_Y - 8, "Trump: " + trumpLabel, {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 76, GAME_INFO_Y + 10, viewModel.roundLabel, {
            fontFamily: "Arial",
            fontSize: "11px",
            color: DIM
        }).setOrigin(0, 0.5));
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

        const isSideSeat = Math.abs(angle) > 10;
        const seatWidth = isSideSeat ? 112 : 132;
        const seatHeight = 40;
        const seatY = y + (isSideSeat ? 4 : 6);
        const cardStartX = isSideSeat ? x : x - 20;
        const cardStartY = isSideSeat ? y - 22 : y - 28;
        const cardStepX = isSideSeat ? Math.cos((angle * Math.PI) / 180) * 10 : 12;
        const cardStepY = isSideSeat ? Math.sin((angle * Math.PI) / 180) * 10 : 0;

        this.renderLayer.add(createRoundedPanel(
            this,
            x,
            seatY,
            seatWidth,
            seatHeight,
            14,
            0x071a13,
            0.7,
            player.isCurrentTurn ? GOLD : 0x7fb896,
            1,
            player.isCurrentTurn ? 0.58 : 0.22
        ));

        const cardCount = Math.max(1, Math.min(3, player.hand.length || Number.parseInt(player.metaLabel, 10) || 1));
        for (let index = 0; index < cardCount; index += 1) {
            const image = this.add.image(
                cardStartX + index * cardStepX,
                cardStartY + index * cardStepY,
                this.getActiveBackTextureKey()
            )
                .setDisplaySize(OPPONENT_CARD_W, OPPONENT_CARD_H)
                .setAngle(angle);
            this.setCardDisplaySize(image, OPPONENT_CARD_W, OPPONENT_CARD_H);
            this.renderLayer.add(image);
        }

        const avatarX = x - seatWidth / 2 + 20;
        const textX = avatarX + 24;
        this.renderLayer.add(this.add.circle(avatarX, seatY, 15, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
            .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85));
        this.renderLayer.add(this.add.text(avatarX, seatY, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(textX, seatY - 7, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(textX, seatY + 8, player.metaLabel, {
            fontFamily: "Arial",
            fontSize: "9px",
            color: DIM
        }).setOrigin(0, 0.5));
    }

    private drawTableCards(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const cards = viewModel.tableCards;
        const startX = PLAYER_GAME_WIDTH / 2 - ((cards.length - 1) * 54) / 2;
        cards.forEach((card, index) => {
            const x = startX + index * 54;
            const y = TABLE_CARD_Y + (index % 2) * 8;
            const image = this.add.image(x, y, this.getTextureForCard(card, "compact"))
                .setDisplaySize(TABLE_CARD_W, TABLE_CARD_H)
                .setAngle((index - (cards.length - 1) / 2) * 4);
            this.setCardDisplaySize(image, TABLE_CARD_W, TABLE_CARD_H);
            this.renderLayer?.add(image);
        });

        this.drawStockTrumpWidget(viewModel);

        const pileText = getPrimaryPileText(viewModel);
        if (pileText && !hasTrumpPile(viewModel)) {
            this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 368, pileText, {
                fontFamily: "Arial",
                fontSize: "13px",
                fontStyle: "700",
                color: "rgba(255,209,102,0.86)"
            }).setOrigin(0.5));
        }
    }

    private drawStockTrumpWidget(viewModel: CardGameViewModel): boolean {
        if (!this.renderLayer) {
            return false;
        }

        const drawPile = getPileByRole(viewModel, "draw") ?? getPileByRole(viewModel, "stock");
        const trumpPile = getPileByRole(viewModel, "trump");
        if (!drawPile || !trumpPile || !trumpPile.topCard) {
            return false;
        }

        const centerX = 70;
        const centerY = STOCK_TRUMP_Y;
        const trumpCard = this.add.image(centerX - 24, centerY + 2, this.getTextureForCard(trumpPile.topCard, "compact"))
            .setDisplaySize(38, 56)
            .setAngle(0)
            .setAlpha(0.98);
        this.setCardDisplaySize(trumpCard, 38, 56);

        const stockShadow = this.add.image(centerX + 17, centerY + 1, this.getActiveBackTextureKey())
            .setDisplaySize(38, 56)
            .setAngle(2)
            .setAlpha(0.48);
        this.setCardDisplaySize(stockShadow, 38, 56);

        const stockCard = this.add.image(centerX + 20, centerY - 2, this.getActiveBackTextureKey())
            .setDisplaySize(38, 56)
            .setAlpha(drawPile.cardCount > 0 ? 1 : 0.42);
        this.setCardDisplaySize(stockCard, 38, 56);

        this.renderLayer.add(trumpCard);
        this.renderLayer.add(stockShadow);
        this.renderLayer.add(stockCard);
        this.renderLayer.add(this.add.text(centerX + 56, centerY - 8, "Trump", {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(centerX + 56, centerY + 9, getTrumpLabel(viewModel), {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "700",
            color: "rgba(255,209,102,0.9)"
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(centerX - 6, centerY + 34, drawPile.countLabel.replace(" + trump", ""), {
            fontFamily: "Arial",
            fontSize: "9px",
            color: DIM
        }).setOrigin(0.5));

        return true;
    }

    private drawPlayerHand(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const player = viewModel.players[0];
        if (!player) {
            return;
        }

        this.renderLayer.add(createRoundedPanel(
            this,
            PLAYER_GAME_WIDTH / 2,
            PLAYER_HUD_Y,
            166,
            34,
            17,
            0x071a13,
            0.68,
            player.isCurrentTurn ? GOLD : 0x7fb896,
            1,
            player.isCurrentTurn ? 0.54 : 0.18
        ));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 62, PLAYER_HUD_Y, 16, player.isCurrentTurn ? GOLD : 0x1d7f54, 1)
            .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.92));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 62, PLAYER_HUD_Y, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 38, PLAYER_HUD_Y - 8, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: CREAM
        }));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 38, PLAYER_HUD_Y + 8, player.metaLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM
        }));

        const cards = player.hand;
        const centerX = PLAYER_GAME_WIDTH / 2;
        const spacing = Math.min(58, cards.length > 1 ? 230 / (cards.length - 1) : 0);
        const startX = centerX - (spacing * (cards.length - 1)) / 2;
        cards.forEach((card, index) => {
            const isSelected = card.id === viewModel.selectedCardId;
            const x = startX + index * spacing;
            const y = HAND_Y - Math.abs(index - (cards.length - 1) / 2) * 6 - (isSelected ? 18 : 0);
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
        const buttonX = hasTrumpPile(viewModel) ? PLAYER_GAME_WIDTH / 2 + 68 : PLAYER_GAME_WIDTH / 2;
        const buttonWidth = hasTrumpPile(viewModel) ? 154 : 144;
        const button = createRoundedPanel(this, buttonX, ACTION_BUTTON_Y, buttonWidth, 48, 16, canPlay ? 0xffd166 : 0x244034, canPlay ? 1 : 0.76);
        this.renderLayer.add(button);
        this.renderLayer.add(this.add.text(buttonX, ACTION_BUTTON_Y, label, {
            fontFamily: "Arial",
            fontSize: "16px",
            fontStyle: "700",
            color: canPlay ? "#10251c" : DIM
        }).setOrigin(0.5));

        if (canPlay && action?.eventType === "PLAY_CARD") {
            const hitTarget = this.add.rectangle(buttonX, ACTION_BUTTON_Y, buttonWidth, 48, 0x000000, 0.001)
                .setInteractive({ useHandCursor: true });
            hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
                this.session.send({ type: "PLAY_CARD" });
            });
            this.renderLayer.add(hitTarget);
        }

        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, ACTION_STATUS_Y, viewModel.statusText, {
            fontFamily: "Arial",
            fontSize: "11px",
            color: DIM,
            align: "center",
            wordWrap: { width: PLAYER_GAME_WIDTH - 48 }
        }).setOrigin(0.5));
    }

    private presentMoveEffects(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const effects = viewModel.effects.filter(isMoveCardEffect);
        const effectBatchKey = effects.map((effect) => effect.key).join("|");
        if (!effectBatchKey) {
            this.activeEffectBatchKey = "";
            return;
        }

        if (effectBatchKey === this.activeEffectBatchKey) {
            return;
        }

        this.activeEffectBatchKey = effectBatchKey;
        effects.forEach((effect, index) => {
            const points = this.getMoveEffectPoints(effect, viewModel);
            if (!points) {
                return;
            }

            this.animateMoveGhost(effect, points.from, points.to, index);
        });
    }

    private getMoveEffectPoints(
        effect: MoveCardEffect,
        viewModel: CardGameViewModel
    ): { from: { x: number; y: number }; to: { x: number; y: number; angle: number } } | null {
        const from = this.getEffectSourcePoint(effect, viewModel);
        const to = this.getEffectDestinationPoint(effect, viewModel);
        if (!from || !to) {
            return null;
        }

        return { from, to };
    }

    private getEffectSourcePoint(effect: MoveCardEffect, viewModel: CardGameViewModel): { x: number; y: number } | null {
        if (effect.fromOwnerId) {
            return this.getPlayerHandPoint(viewModel, effect.fromOwnerId, effect.fromIndex ?? 0);
        }

        if (effect.fromPileId === "stock" || effect.fromPileId === "draw") {
            return { x: 90, y: STOCK_TRUMP_Y - 2 };
        }

        if ((viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
            return this.getTableCardPoint(viewModel, effect.fromIndex ?? 0);
        }

        return { x: PLAYER_GAME_WIDTH / 2, y: STOCK_TRUMP_Y };
    }

    private getEffectDestinationPoint(
        effect: MoveCardEffect,
        viewModel: CardGameViewModel
    ): { x: number; y: number; angle: number } | null {
        if (effect.toOwnerId) {
            const point = this.getPlayerHandPoint(viewModel, effect.toOwnerId, effect.toIndex ?? 0);
            return point ? { ...point, angle: 0 } : null;
        }

        if ((viewModel.tablePileIds ?? []).includes(effect.toPileId)) {
            return this.getTableCardPoint(viewModel, effect.toIndex ?? viewModel.tableCards.length - 1);
        }

        if (effect.toPileId === "stock" || effect.toPileId === "draw") {
            return { x: 90, y: STOCK_TRUMP_Y - 2, angle: 0 };
        }

        return null;
    }

    private getPlayerHandPoint(viewModel: CardGameViewModel, playerId: string, index: number): { x: number; y: number; angle: number } | null {
        const playerIndex = viewModel.players.findIndex((player) => player.id === playerId);
        if (playerIndex < 0) {
            return null;
        }

        if (playerIndex === 0) {
            const cards = viewModel.players[0]?.hand ?? [];
            const slotCount = Math.max(cards.length, index + 1, 1);
            const centerX = PLAYER_GAME_WIDTH / 2;
            const spacing = Math.min(58, slotCount > 1 ? 230 / (slotCount - 1) : 0);
            const startX = centerX - (spacing * (slotCount - 1)) / 2;
            const slotIndex = Math.max(0, Math.min(index, slotCount - 1));
            const angle = (slotIndex - (slotCount - 1) / 2) * 7;
            return {
                x: startX + slotIndex * spacing,
                y: HAND_Y - Math.abs(slotIndex - (slotCount - 1) / 2) * 6,
                angle
            };
        }

        const positions = getOpponentPositions(Math.max(viewModel.players.length - 1, 0));
        const opponentPosition = positions[playerIndex - 1];
        if (!opponentPosition) {
            return null;
        }

        return {
            x: opponentPosition.x,
            y: opponentPosition.y - 24,
            angle: opponentPosition.angle
        };
    }

    private getTableCardPoint(viewModel: CardGameViewModel, index: number): { x: number; y: number; angle: number } {
        const cardCount = Math.max(viewModel.tableCards.length, index + 1, 1);
        const slotIndex = Math.max(0, Math.min(index, cardCount - 1));
        const startX = PLAYER_GAME_WIDTH / 2 - ((cardCount - 1) * 54) / 2;
        return {
            x: startX + slotIndex * 54,
            y: TABLE_CARD_Y + (slotIndex % 2) * 8,
            angle: (slotIndex - (cardCount - 1) / 2) * 4
        };
    }

    private animateMoveGhost(
        effect: MoveCardEffect,
        from: { x: number; y: number },
        to: { x: number; y: number; angle: number },
        index: number
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const textureKey = effect.card.isFaceUp
            ? getCardFaceTextureKey(effect.card.id, this.activeCardSkinId, "compact")
            : this.getActiveBackTextureKey();
        const ghost = this.add.image(from.x, from.y, textureKey)
            .setDisplaySize(TABLE_CARD_W, TABLE_CARD_H)
            .setAlpha(0.92)
            .setDepth(90);
        this.setCardDisplaySize(ghost, TABLE_CARD_W, TABLE_CARD_H);
        this.renderLayer.add(ghost);

        const delay = index * 42 + (effect.delayMs ?? 0);
        this.tweens.add({
            targets: ghost,
            x: to.x,
            y: to.y,
            angle: to.angle,
            alpha: 0.98,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: effect.reason === "play" ? 260 : 220,
            delay,
            ease: effect.reason === "play" ? "Back.easeOut" : "Cubic.easeInOut",
            onComplete: () => {
                this.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    duration: 90,
                    onComplete: () => {
                        ghost.destroy();
                    }
                });
            }
        });
    }

    private drawSessionStatus(): void {
        if (!this.renderLayer) {
            return;
        }

        const status = this.getSessionStatus();
        if (!status) {
            return;
        }

        if (status.type === "connected") {
            this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, CONNECTION_STATUS_Y, 86, 24, 12, 0x123f2c, 0.94, 0x78d9a0, 1, 0.42));
            this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 28, CONNECTION_STATUS_Y, 4, 0x78d9a0, 1));
            this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 + 6, CONNECTION_STATUS_Y, "Online", {
                fontFamily: "Arial",
                fontSize: "12px",
                fontStyle: "700",
                color: "#d7ffe5"
            }).setOrigin(0.5));
            return;
        }

        const isClosed = status.type === "closed";
        const panelColor = isClosed ? 0x42231f : 0x4b3216;
        const strokeColor = isClosed ? 0xff9b8d : GOLD;
        const textColor = isClosed ? "#ffb6aa" : "#ffd166";
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 612, PLAYER_GAME_WIDTH - 44, 42, 12, panelColor, 0.94, strokeColor, 1, 0.6));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 612, status.message, {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: textColor,
            align: "center",
            wordWrap: { width: PLAYER_GAME_WIDTH - 72 }
        }).setOrigin(0.5));
    }

    private getSessionStatus(): PlayerSessionStatus | null {
        const maybeStatusSession = this.session as CardGameSession<CardGameViewModel> & {
            getStatus?: () => PlayerSessionStatus;
        };
        return maybeStatusSession.getStatus?.() ?? null;
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
            return [{ x: PLAYER_GAME_WIDTH / 2, y: 178, angle: 0 }];
        case 2:
            return [
                { x: 64, y: 292, angle: -90 },
                { x: PLAYER_GAME_WIDTH - 64, y: 292, angle: 90 }
            ];
        default:
            return [
                { x: PLAYER_GAME_WIDTH / 2, y: 178, angle: 0 },
                { x: PLAYER_GAME_WIDTH - 64, y: 304, angle: 90 },
                { x: 64, y: 304, angle: -90 },
                { x: PLAYER_GAME_WIDTH / 2, y: 224, angle: 0 }
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

function getPileByRole(viewModel: CardGameViewModel, role: string): CardGameViewPile | null {
    return viewModel.piles.find((pile) => !pile.ownerId && pile.role === role) ?? null;
}

function hasTrumpPile(viewModel: CardGameViewModel): boolean {
    return Boolean(getPileByRole(viewModel, "trump"));
}

function getTrumpLabel(viewModel: CardGameViewModel): string {
    const trumpPile = getPileByRole(viewModel, "trump");
    if (trumpPile?.countLabel && trumpPile.countLabel !== "spent") {
        const labelParts = trumpPile.countLabel.split(/\s+/);
        return labelParts[labelParts.length - 1] || trumpPile.countLabel;
    }

    const match = /\|\s*Trump:\s*(.+)$/i.exec(viewModel.deckLabel);
    return match?.[1] ?? "spent";
Yeah. The. }

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
