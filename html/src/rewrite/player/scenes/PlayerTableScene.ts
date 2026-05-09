import * as Phaser from "phaser";

import { isMoveCardEffect, type MoveCardEffect } from "@rewrite-core/engine/game/effects";
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
import {
    getHandCardPoint,
    getOpponentSeatLayouts,
    getStockTrumpPoint,
    getTableRowCardPoint,
    getTrickCardPoint,
    playerPovCardSizes,
    playerPovZones,
    type PlayerPovSeatLayout
} from "../playerPovLayout";
import {
    getPileByRole,
    getPlayerPovPresentation,
    type PlayerPovPresentation
} from "../playerPovPresentation";
import {
    getLeadPlayerName,
    getPlayerPovOpponentSeats,
    getPlayerPovSeatSide,
    getPrimaryPileText,
    normalizeActionLabel,
    type PlayerPovPlayerCounters
} from "../playerPovUiModel";

const CARD_W = 72;
const CARD_H = 106;
const HAND_CARD_W = playerPovCardSizes.hand.width;
const HAND_CARD_H = playerPovCardSizes.hand.height;
const TABLE_CARD_W = playerPovCardSizes.table.width;
const TABLE_CARD_H = playerPovCardSizes.table.height;
const STOCK_TRUMP_CARD_W = playerPovCardSizes.stockTrump.width;
const STOCK_TRUMP_CARD_H = playerPovCardSizes.stockTrump.height;
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
        const presentation = getPlayerPovPresentation(viewModel);
        this.drawTopBar(viewModel, presentation);
        this.drawGameInfo(viewModel, presentation);
        this.drawOpponents(viewModel);
        this.drawTableCards(viewModel, presentation);
        this.drawPlayerHand(viewModel);
        this.drawBottomControls(viewModel, presentation);
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

    private drawTopBar(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        const isPlayerTurn = viewModel.players[0]?.isCurrentTurn === true;
        this.renderLayer.add(this.add.circle(36, playerPovZones.topBarY, 20, 0x020806, 0.84));
        this.renderLayer.add(this.add.text(36, 31, "‹", {
            fontFamily: "Arial",
            fontSize: "28px",
            color: CREAM
        }).setOrigin(0.5));
        const hasGameTitle = presentation.gameKind !== "generic";
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, playerPovZones.topBarY, hasGameTitle ? 104 : 94, 30, 15, isPlayerTurn ? 0xf7efe0 : 0x163b2b, 0.98));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, playerPovZones.topBarY, hasGameTitle ? presentation.gameTitle : (isPlayerTurn ? "Your turn" : viewModel.phaseLabel), {
            fontFamily: "Arial",
            fontSize: hasGameTitle ? "18px" : "14px",
            fontStyle: "700",
            color: isPlayerTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH - 36, playerPovZones.topBarY, 20, 0x020806, 0.84));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH - 36, playerPovZones.topBarY, "⚙", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: CREAM
        }).setOrigin(0.5));
    }

    private drawGameInfo(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): void {
        if (!this.renderLayer || presentation.infoPanel === "none") {
            return;
        }

        if (presentation.infoPanel !== "trump") {
            this.drawCompactGameInfo(presentation);
            return;
        }

        const trumpLabel = presentation.trumpLabel ?? "spent";
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, playerPovZones.gameInfoY, 276, 62, 26, 0x082417, 0.9, 0x5ea65d, 2, 0.3));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 112, playerPovZones.gameInfoY, 21, 0xd3a22e, 1)
            .setStrokeStyle(2, 0xffd166, 0.72));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 112, playerPovZones.gameInfoY, "T", {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "700",
            color: "#10251c"
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 82, playerPovZones.gameInfoY - 9, presentation.infoPrimaryLabel + ": " + trumpLabel, {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 82, playerPovZones.gameInfoY + 11, presentation.infoSecondaryValue, {
            fontFamily: "Arial",
            fontSize: "11px",
            color: DIM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.line(PLAYER_GAME_WIDTH / 2 + 58, playerPovZones.gameInfoY, 0, -21, 0, 21, 0x5ea65d, 0.35));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 + 78, playerPovZones.gameInfoY - 9, presentation.infoSecondaryLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 + 78, playerPovZones.gameInfoY + 11, String(viewModel.tableCards.length) + " cards", {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
    }

    private drawCompactGameInfo(presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        const accentColor = presentation.infoPanel === "battle" ? GOLD : 0x83d0ae;
        const iconLabel = presentation.infoPanel === "battle" ? "B" : "D";
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, playerPovZones.gameInfoY, 276, 56, 24, 0x082417, 0.88, accentColor, 2, 0.28));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 112, playerPovZones.gameInfoY, 19, accentColor, 0.94)
            .setStrokeStyle(2, 0xf6ecd2, 0.4));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 112, playerPovZones.gameInfoY, iconLabel, {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "700",
            color: "#10251c"
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 82, playerPovZones.gameInfoY - 9, presentation.infoPrimaryLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 82, playerPovZones.gameInfoY + 10, presentation.infoPrimaryValue, {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.line(PLAYER_GAME_WIDTH / 2 + 42, playerPovZones.gameInfoY, 0, -18, 0, 18, 0x5ea65d, 0.3));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 + 60, playerPovZones.gameInfoY - 9, presentation.infoSecondaryLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 + 60, playerPovZones.gameInfoY + 10, presentation.infoSecondaryValue, {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "700",
            color: CREAM,
            wordWrap: { width: 78 }
        }).setOrigin(0, 0.5));
    }

    private drawOpponents(viewModel: CardGameViewModel): void {
        getPlayerPovOpponentSeats(viewModel).forEach((seat) => {
            this.drawOpponent(seat.player, seat.layout, seat.counters);
        });
    }

    private drawOpponent(
        player: CardGameViewPlayer,
        layout: PlayerPovSeatLayout,
        counters: PlayerPovPlayerCounters
    ): void {
        if (!this.renderLayer) {
            return;
        }

        if (layout.side === "left" || layout.side === "right") {
            this.drawSideOpponent(player, layout, counters);
            return;
        }

        this.drawTopOpponent(player, layout, counters);
    }

    private drawTopOpponent(
        player: CardGameViewPlayer,
        layout: PlayerPovSeatLayout,
        counters: PlayerPovPlayerCounters
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const { x, y } = layout;
        const seatWidth = 116;
        const seatHeight = 36;
        const seatY = y + 6;

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

        const avatarX = x - seatWidth / 2 + 16;
        const textX = avatarX + 24;
        this.renderLayer.add(this.add.circle(avatarX, seatY, 14, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
            .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85));
        this.renderLayer.add(this.add.circle(avatarX - 12, seatY - 12, 4, player.isCurrentTurn ? GOLD : 0x68d184, 0.96));
        this.renderLayer.add(this.add.text(avatarX, seatY, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "9px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(textX, seatY - 7, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(textX, seatY + 8, "W " + counters.score + "   C " + counters.cards, {
            fontFamily: "Arial",
            fontSize: "8px",
            color: DIM
        }).setOrigin(0, 0.5));
    }

    private drawSideOpponent(
        player: CardGameViewPlayer,
        layout: PlayerPovSeatLayout,
        counters: PlayerPovPlayerCounters
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const isLeft = layout.side === "left";
        const panelX = layout.x + (isLeft ? 8 : -8);
        const panelY = layout.y + 34;
        const avatarY = layout.y - 22;
        const textOriginX = isLeft ? 0 : 1;
        const textX = panelX + (isLeft ? -18 : 18);

        this.renderLayer.add(createRoundedPanel(
            this,
            panelX,
            panelY,
            58,
            78,
            15,
            0x071a13,
            0.72,
            player.isCurrentTurn ? GOLD : 0x7fb896,
            1,
            player.isCurrentTurn ? 0.58 : 0.2
        ));

        this.renderLayer.add(this.add.circle(layout.x, avatarY, 17, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
            .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85));
        this.renderLayer.add(this.add.circle(layout.x + (isLeft ? -14 : 14), avatarY - 14, 4, player.isCurrentTurn ? GOLD : 0x68d184, 0.96));
        this.renderLayer.add(this.add.text(layout.x, avatarY, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));

        this.renderLayer.add(this.add.text(textX, panelY - 16, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            fontStyle: "700",
            color: CREAM,
            align: isLeft ? "left" : "right",
            wordWrap: { width: 50 }
        }).setOrigin(textOriginX, 0.5));

        this.renderLayer.add(this.add.text(textX, panelY + 6, "W " + counters.score, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: "rgba(255,209,102,0.96)",
            align: isLeft ? "left" : "right"
        }).setOrigin(textOriginX, 0.5));
        this.renderLayer.add(this.add.text(textX, panelY + 22, "C " + counters.cards, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM,
            align: isLeft ? "left" : "right"
        }).setOrigin(textOriginX, 0.5));

    }

    private drawTableCards(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        if (presentation.centerArea === "trick") {
            this.drawTrickSurface();
            this.drawCurrentTrickLabel(viewModel);
        } else if (presentation.centerArea === "battle") {
            this.drawBattleSurface(presentation);
        } else if (presentation.centerArea === "showdown") {
            this.drawShowdownSurface(presentation);
        }

        const cards = viewModel.tableCards;
        cards.forEach((card, index) => {
            const point = presentation.centerArea === "trick"
                ? this.getTrickCardPointForCard(card, viewModel)
                : getTableRowCardPoint({
                      cardCount: cards.length,
                      index
                  });
            const image = this.add.image(point.x, point.y, this.getTextureForCard(card, "compact"))
                .setDisplaySize(TABLE_CARD_W, TABLE_CARD_H)
                .setAngle(point.angle);
            this.setCardDisplaySize(image, TABLE_CARD_W, TABLE_CARD_H);
            this.renderLayer?.add(image);
        });

        if (presentation.bottomDock === "stock-trump") {
            this.drawStockTrumpWidget(viewModel, presentation);
        } else if (presentation.bottomDock === "deck") {
            this.drawDeckWidget(viewModel, presentation);
        }

        const pileText = getPrimaryPileText(viewModel);
        if (pileText && presentation.bottomDock !== "stock-trump") {
            this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 368, pileText, {
                fontFamily: "Arial",
                fontSize: "13px",
                fontStyle: "700",
                color: "rgba(255,209,102,0.86)"
            }).setOrigin(0.5));
        }
    }

    private drawCurrentTrickLabel(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const leadPlayerName = getLeadPlayerName(viewModel);
        const label = leadPlayerName ? "Led by " + leadPlayerName : "Current trick";
        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 238, 132, 26, 12, 0x0a2a18, 0.74, 0x5ea65d, 1, 0.22));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 238, label, {
            fontFamily: "Arial",
            fontSize: "12px",
            color: CREAM
        }).setOrigin(0.5));
    }

    private drawTrickSurface(): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 352, 158, 176, 34, 0x1b6b31, 0.18, 0x7fc46c, 1, 0.18));
        this.renderLayer.add(this.add.line(PLAYER_GAME_WIDTH / 2, 352, -58, 0, 58, 0, 0x9ad27f, 0.1));
        this.renderLayer.add(this.add.line(PLAYER_GAME_WIDTH / 2, 352, 0, -66, 0, 66, 0x9ad27f, 0.1));
    }

    private drawBattleSurface(presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 352, 216, 146, 28, 0x092018, 0.36, GOLD, 1, 0.22));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 286, presentation.centerLabel, {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "700",
            color: "rgba(255,209,102,0.86)"
        }).setOrigin(0.5));
    }

    private drawShowdownSurface(presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, 352, 198, 126, 26, 0x0a2a18, 0.28, 0x83d0ae, 1, 0.2));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, 302, presentation.centerLabel, {
            fontFamily: "Arial",
            fontSize: "11px",
            color: DIM
        }).setOrigin(0.5));
    }

    private getTrickCardPointForCard(
        card: CardGameViewTableCard,
        viewModel: CardGameViewModel
    ): { x: number; y: number; angle: number } {
        return getTrickCardPoint(getPlayerPovSeatSide(viewModel, card.playerId));
    }

    private drawStockTrumpWidget(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): boolean {
        if (!this.renderLayer) {
            return false;
        }

        const drawPile = getPileByRole(viewModel, "draw") ?? getPileByRole(viewModel, "stock");
        const trumpPile = getPileByRole(viewModel, "trump");
        if (!drawPile || !trumpPile || !trumpPile.topCard) {
            return false;
        }

        const stockTrumpPoint = getStockTrumpPoint();
        const centerX = stockTrumpPoint.x;
        const centerY = stockTrumpPoint.y;
        this.renderLayer.add(createRoundedPanel(this, 132, centerY, 194, 76, 18, 0x082417, 0.82, 0x5ea65d, 1, 0.24));

        for (let index = 0; index < 3; index += 1) {
            const stockBack = this.add.image(centerX - 18 + index * 3, centerY - 1 - index * 1, this.getActiveBackTextureKey())
                .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
                .setAngle(-2 + index * 2)
                .setAlpha(drawPile.cardCount > 0 ? 0.78 : 0.24);
            this.setCardDisplaySize(stockBack, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
            this.renderLayer.add(stockBack);
        }

        const trumpCard = this.add.image(centerX - 24, centerY + 2, this.getTextureForCard(trumpPile.topCard, "compact"))
            .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
            .setAngle(0)
            .setAlpha(0.98);
        this.setCardDisplaySize(trumpCard, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);

        const stockCard = this.add.image(centerX + 28, centerY - 2, this.getActiveBackTextureKey())
            .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
            .setAlpha(drawPile.cardCount > 0 ? 1 : 0.42);
        this.setCardDisplaySize(stockCard, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);

        this.renderLayer.add(trumpCard);
        this.renderLayer.add(stockCard);
        this.renderLayer.add(this.add.text(centerX + 64, centerY - 13, "Trump", {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(centerX + 64, centerY + 5, presentation.trumpLabel ?? "spent", {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "700",
            color: "rgba(255,209,102,0.9)"
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(centerX + 64, centerY + 22, drawPile.countLabel.replace(" + trump", ""), {
            fontFamily: "Arial",
            fontSize: "9px",
            color: DIM
        }).setOrigin(0, 0.5));

        return true;
    }

    private drawDeckWidget(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): boolean {
        if (!this.renderLayer) {
            return false;
        }

        const drawPile = getPileByRole(viewModel, "draw");
        const discardPile = getPileByRole(viewModel, "discard");
        if (!drawPile && !discardPile) {
            return false;
        }

        const centerY = playerPovZones.stockTrumpY;
        const centerX = 118;
        this.renderLayer.add(createRoundedPanel(this, centerX, centerY, 206, 78, 18, 0x082417, 0.82, 0x5ea65d, 1, 0.22));

        if (drawPile) {
            for (let index = 0; index < 3; index += 1) {
                const stockBack = this.add.image(centerX - 64 + index * 3, centerY - index, this.getActiveBackTextureKey())
                    .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
                    .setAngle(-2 + index * 2)
                    .setAlpha(drawPile.cardCount > 0 ? 0.82 : 0.25);
                this.setCardDisplaySize(stockBack, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
                this.renderLayer.add(stockBack);
            }
        }

        if (discardPile?.topCard) {
            const discardCard = this.add.image(centerX - 10, centerY, this.getTextureForCard(discardPile.topCard, "compact"))
                .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
                .setAngle(3);
            this.setCardDisplaySize(discardCard, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
            this.renderLayer.add(discardCard);
        } else {
            this.renderLayer.add(createRoundedPanel(this, centerX - 10, centerY, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H, 5, 0x0b2118, 0.35, 0x7fb896, 1, 0.22));
        }

        this.renderLayer.add(this.add.text(centerX + 36, centerY - 15, presentation.infoPrimaryLabel, {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "700",
            color: CREAM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(centerX + 36, centerY + 3, presentation.infoPrimaryValue, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM
        }).setOrigin(0, 0.5));
        this.renderLayer.add(this.add.text(centerX + 36, centerY + 20, presentation.infoSecondaryValue, {
            fontFamily: "Arial",
            fontSize: "9px",
            color: "rgba(255,209,102,0.86)"
        }).setOrigin(0, 0.5));

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
            playerPovZones.playerHudY,
            166,
            34,
            17,
            0x071a13,
            0.68,
            player.isCurrentTurn ? GOLD : 0x7fb896,
            1,
            player.isCurrentTurn ? 0.54 : 0.18
        ));
        this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 62, playerPovZones.playerHudY, 16, player.isCurrentTurn ? GOLD : 0x1d7f54, 1)
            .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.92));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 62, playerPovZones.playerHudY, player.iconLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            fontStyle: "700",
            color: player.isCurrentTurn ? "#10251c" : CREAM
        }).setOrigin(0.5));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 38, playerPovZones.playerHudY - 8, player.nameLabel, {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "700",
            color: CREAM
        }));
        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 - 38, playerPovZones.playerHudY + 8, player.metaLabel, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: DIM
        }));

        if (player.isCurrentTurn) {
            this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, playerPovZones.handY - 98, "Your turn", {
                fontFamily: "Arial",
                fontSize: "14px",
                fontStyle: "700",
                color: "rgba(255,209,102,0.98)"
            }).setOrigin(0.5));
        }

        const cards = player.hand;
        cards.forEach((card, index) => {
            const isSelected = card.id === viewModel.selectedCardId;
            const point = getHandCardPoint({
                cardCount: cards.length,
                index,
                selected: isSelected
            });
            if (isSelected) {
                const glow = this.add.graphics();
                glow.lineStyle(4, GOLD, 0.88);
                glow.strokeRoundedRect(
                    -HAND_CARD_W / 2 - 5,
                    -HAND_CARD_H / 2 - 5,
                    HAND_CARD_W + 10,
                    HAND_CARD_H + 10,
                    10
                );
                glow.setPosition(point.x, point.y);
                glow.setAngle(point.angle);
                glow.setDepth(29 + index);
                this.renderLayer?.add(glow);
            }

            const image = this.add.image(point.x, point.y, this.getTextureForCard(card, "showcase"))
                .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
                .setAngle(point.angle)
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

    private drawBottomControls(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        const action = viewModel.primaryAction;
        const canPlay = viewModel.controls.canPlay || action?.eventType === "PLAY_CARD";
        const label = normalizeActionLabel(action?.label ?? (viewModel.players[0]?.isCurrentTurn ? "Select Card" : "Waiting"));
        const hasBottomDock = presentation.bottomDock !== "none";
        const buttonX = hasBottomDock ? 294 : PLAYER_GAME_WIDTH / 2;
        const buttonWidth = hasBottomDock ? 126 : 144;
        const button = createRoundedPanel(
            this,
            buttonX,
            playerPovZones.actionButtonY,
            buttonWidth,
            48,
            18,
            canPlay ? 0x208338 : 0x244034,
            canPlay ? 1 : 0.76,
            canPlay ? 0x75d16a : 0x6c806f,
            2,
            canPlay ? 0.72 : 0.2
        );
        this.renderLayer.add(button);
        this.renderLayer.add(this.add.text(buttonX, playerPovZones.actionButtonY, label, {
            fontFamily: "Arial",
            fontSize: canPlay && hasBottomDock ? "11px" : (canPlay ? "14px" : "16px"),
            fontStyle: "700",
            color: canPlay ? "#f6ecd2" : DIM
        }).setOrigin(0.5));

        if (canPlay && action?.eventType === "PLAY_CARD") {
            const hitTarget = this.add.rectangle(buttonX, playerPovZones.actionButtonY, buttonWidth, 48, 0x000000, 0.001)
                .setInteractive({ useHandCursor: true });
            hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
                this.session.send({ type: "PLAY_CARD" });
            });
            this.renderLayer.add(hitTarget);
        }

        this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2, playerPovZones.actionStatusY, viewModel.statusText, {
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
            const stockPoint = getStockTrumpPoint();
            return { x: stockPoint.x + 20, y: stockPoint.y - 2 };
        }

        if ((viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
            return this.getTableCardPoint(viewModel, effect.fromIndex ?? 0);
        }

        return { x: PLAYER_GAME_WIDTH / 2, y: playerPovZones.stockTrumpY };
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
            return this.getTableCardPoint(viewModel, effect.toIndex ?? viewModel.tableCards.length - 1, effect.card.id);
        }

        if (effect.toPileId === "stock" || effect.toPileId === "draw") {
            const stockPoint = getStockTrumpPoint();
            return { x: stockPoint.x + 20, y: stockPoint.y - 2, angle: 0 };
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
            return getHandCardPoint({
                cardCount: cards.length,
                index
            });
        }

        const positions = getOpponentSeatLayouts(Math.max(viewModel.players.length - 1, 0));
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

    private getTableCardPoint(viewModel: CardGameViewModel, index: number, cardId?: string): { x: number; y: number; angle: number } {
        const tableCard = cardId
            ? viewModel.tableCards.find((card) => card.id === cardId || (card.sourceCardIds ?? []).includes(cardId))
            : viewModel.tableCards[index];
        if (tableCard && viewModel.tablePresentation === "trick-seats") {
            return this.getTrickCardPointForCard(tableCard, viewModel);
        }

        return getTableRowCardPoint({
            cardCount: viewModel.tableCards.length,
            index
        });
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
            this.renderLayer.add(createRoundedPanel(this, PLAYER_GAME_WIDTH / 2, playerPovZones.connectionStatusY, 86, 24, 12, 0x123f2c, 0.94, 0x78d9a0, 1, 0.42));
            this.renderLayer.add(this.add.circle(PLAYER_GAME_WIDTH / 2 - 28, playerPovZones.connectionStatusY, 4, 0x78d9a0, 1));
            this.renderLayer.add(this.add.text(PLAYER_GAME_WIDTH / 2 + 6, playerPovZones.connectionStatusY, "Online", {
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
