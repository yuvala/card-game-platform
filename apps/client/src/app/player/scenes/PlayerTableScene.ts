import * as Phaser from 'phaser';

import { drawPlayerDebugOverlay } from '../debug/playerDebugOverlay';
import type { PlayerDebugOverlay, PlayerDebugLayerFlags } from '../debug/playerDebugOverlay';
import {
    createCardAnimationLayer,
    type CardAnimationLayer,
} from '../../phaser/scenes/animations/cardAnimationLayer';
import {
    isMoveCardEffect,
    type MoveCardEffect,
    type CardGameEffectReason,
} from '@engine/engine/game/effects';
import { supportedDeckDefinitions } from '@engine/engine/cards/deckDefinitions';
import { getCardSkinById } from '@engine/engine/cards/skinPacks';
import type { CardGameSession } from '@engine/engine/game/session';
import type {
    CardGameViewCard,
    CardGameViewModel,
    CardGameViewPlayer,
    CardGameViewTableCard,
} from '@engine/engine/game/viewModel';
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    getCardFaceTextureKey,
    preloadFrenchCardTextures,
} from '../../phaser/cards/CardTextureFactory';
import { preloadSpanishSheetTexture } from '../../phaser/cards/SpanishCardSpriteSheet';
import { sfxPlayer } from '../../../audio/sfxPlayer';
import { musicPlayer } from '../../../audio/musicPlayer';
import { PLAYER_GAME_HEIGHT, PLAYER_GAME_WIDTH } from '../createPlayerGame';
import {
    getHandCardPoint,
    getOpponentFanCardPoint,
    getOpponentFanCenter,
    getOpponentSeatLayouts,
    getStockTrumpPoint,
    getTableRowCardPoint,
    getTrickCardPoint,
    getWarBattleCardPoint,
    playerPovCardSizes,
    playerPovZones,
    type PlayerPovSeatLayout,
} from '../playerPovLayout';
import {
    getPileByRole,
    getPlayerPovPresentation,
    type PlayerPovPresentation,
} from '../playerPovPresentation';
import {
    getPlayerPovOpponentSeats,
    getPlayerPovSeatSide,
    getPrimaryPileText,
    normalizeActionLabel,
    parsePlayerCounters,
    type PlayerPovPlayerCounters,
} from '../playerPovUiModel';

const HAND_CARD_W = playerPovCardSizes.hand.width;
const HAND_CARD_H = playerPovCardSizes.hand.height;
const OPP_CARD_W = playerPovCardSizes.opponent.width;   // 42
const OPP_CARD_H = playerPovCardSizes.opponent.height;  // 62
const TABLE_CARD_W = playerPovCardSizes.table.width;
const TABLE_CARD_H = playerPovCardSizes.table.height;
const STOCK_TRUMP_CARD_W = playerPovCardSizes.stockTrump.width;
const STOCK_TRUMP_CARD_H = playerPovCardSizes.stockTrump.height;
const DEAL_MAX_STEP_MS = 88;
const DEAL_TARGET_TOTAL_MS = 1500;

interface EffectAnimProfile {
    duration: number;
    delayStep: number;
    ease: string;
    peakScale: number;
}

function getDealDelayStep(dealCount: number): number {
    if (dealCount <= 1) {
        return DEAL_MAX_STEP_MS;
    }

    return Math.min(DEAL_MAX_STEP_MS, Math.floor(DEAL_TARGET_TOTAL_MS / dealCount));
}

function getEffectProfile(
    reason: CardGameEffectReason,
    dealDelayStep = DEAL_MAX_STEP_MS,
): EffectAnimProfile {
    switch (reason) {
        case 'deal':
            return {
                duration: 310,
                delayStep: dealDelayStep,
                ease: 'Quart.easeOut',
                peakScale: 2.5,
            };
        case 'draw':
            return { duration: 220, delayStep: 42, ease: 'Cubic.easeOut', peakScale: 1.8 };
        case 'play':
            return { duration: 260, delayStep: 60, ease: 'Back.easeOut', peakScale: 1 };
        case 'collect':
            return { duration: 300, delayStep: 48, ease: 'Cubic.easeIn', peakScale: 1 };
    }
}

function computeEffectDelays(effects: readonly MoveCardEffect[]): number[] {
    const dealCount = effects.filter((e) => e.reason === 'deal').length;
    const dealDelayStep = getDealDelayStep(dealCount);
    const delays: number[] = [];
    let groupStartDelay = 0;
    let groupReason: CardGameEffectReason | null = null;
    let groupIndex = 0;
    let previousProfile = getEffectProfile('deal', dealDelayStep);

    effects.forEach((effect) => {
        const profile = getEffectProfile(effect.reason, dealDelayStep);
        if (groupReason !== null && groupReason !== effect.reason) {
            groupStartDelay +=
                previousProfile.duration + (groupIndex - 1) * previousProfile.delayStep + 120;
            groupIndex = 0;
        }

        delays.push(groupStartDelay + groupIndex * profile.delayStep + (effect.delayMs ?? 0));
        groupReason = effect.reason;
        groupIndex += 1;
        previousProfile = profile;
    });

    return delays;
}

interface PlayerTheme {
    felt: number;
    feltInner: number;
    feltInnerBorder: number;
    bg: number;
    bgOverlayAlpha: number;
    turnBg: number;
    bgImage: string;
    bgAlpha: number;
    showFelt: boolean;
}

const THEMES: Record<string, PlayerTheme> = {
    default: {
        felt: 0x246f34,
        feltInner: 0x2e8a3d,
        feltInnerBorder: 0x77bf69,
        bg: 0x07140f,
        bgOverlayAlpha: 0.18,
        turnBg: 0x163b2b,
        bgImage: 'bg-brisca',
        bgAlpha: 1,
        showFelt: false,
    },
    war: {
        felt: 0x1a3a6b,
        feltInner: 0x1e4a88,
        feltInnerBorder: 0x4d7cc9,
        bg: 0x0a1a2e,
        bgOverlayAlpha: 0.92,
        turnBg: 0x0f2850,
        bgImage: 'bg-war',
        bgAlpha: 0.18,
        showFelt: true,
    },
    poker: {
        felt: 0x1a5c32,
        feltInner: 0x226b3c,
        feltInnerBorder: 0x4da870,
        bg: 0x071a10,
        bgOverlayAlpha: 0.22,
        turnBg: 0x0f3322,
        bgImage: '',
        bgAlpha: 0,
        showFelt: true,
    },
};

function getTheme(themeId?: string): PlayerTheme {
    return THEMES[themeId ?? 'default'] ?? THEMES.default;
}

const GOLD = 0xffd166;
const CREAM = '#f6ecd2';
const DIM = 'rgba(246,236,210,0.72)';

type PlayerSessionStatus =
    | { type: 'connected' }
    | { type: 'error'; message: string }
    | { type: 'closed'; message: string };

interface CardDisplaySize {
    width: number;
    height: number;
}

export class PlayerTableScene extends Phaser.Scene {
    private readonly session: CardGameSession<CardGameViewModel>;
    private subscription?: { unsubscribe(): void };
    private renderLayer?: Phaser.GameObjects.Container;
    private activeDeckId = '';
    private activeCardSkinId = '';
    private activeEffectBatchKey = '';
    private localPlayerDeckPoint: { x: number; y: number } | null = null;
    private stockPilePoint: { x: number; y: number } | null = null;
    private debugOverlay?: PlayerDebugOverlay;
    private lastViewModel?: CardGameViewModel;
    private animationLayer!: CardAnimationLayer;
    private flashContainer?: Phaser.GameObjects.Container;
    private lastBattleFlashKey = '';

    constructor(session: CardGameSession<CardGameViewModel>) {
        super('player-table');
        this.session = session;
    }

    preload(): void {
        this.load.image('bg-brisca', 'images/bg-brisca.jpg');
        this.load.image('bg-war', 'images/map4.jpg');
        this.load.image('win-bg', '/assets/lobby/win.png');
        preloadFrenchCardTextures(this, 'vintage-european');
        preloadSpanishSheetTexture(this);
    }

    create(): void {
        musicPlayer.setMode('game');
        this.animationLayer = createCardAnimationLayer(this, 1000);

        this.subscription = this.session.subscribe(() => {
            this.syncViewModel(this.session.getViewModel(null));
        });
        const onDebugLayerChange = () => {
            if (this.debugOverlay) {
                this.redrawDebugOverlay();
            }
        };
        globalThis.addEventListener('debug-layer-change', onDebugLayerChange);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.subscription?.unsubscribe();
            this.subscription = undefined;
            this.animationLayer.destroy();
            this.flashContainer?.destroy(true);
            globalThis.removeEventListener('debug-layer-change', onDebugLayerChange);
        });

        this.input.keyboard?.on('keydown-D', () => {
            this.toggleDebugOverlay();
        });

        if (localStorage.getItem('player-debug-zones') === 'on') {
            this.toggleDebugOverlay();
        }

        this.syncViewModel(this.session.getViewModel(null));
    }

    private getDebugLayers(): PlayerDebugLayerFlags {
        return {
            hand: localStorage.getItem('player-dbg-hand') === 'on',
            table: localStorage.getItem('player-dbg-table') === 'on',
            piles: localStorage.getItem('player-dbg-piles') === 'on',
            seats: localStorage.getItem('player-dbg-seats') === 'on',
            zones: localStorage.getItem('player-dbg-zones') === 'on',
        };
    }

    private toggleDebugOverlay(): void {
        if (this.debugOverlay) {
            this.debugOverlay.destroy();
            this.debugOverlay = undefined;
            localStorage.removeItem('player-debug-zones');
            return;
        }
        localStorage.setItem('player-debug-zones', 'on');
        this.redrawDebugOverlay();
    }

    private redrawDebugOverlay(): void {
        this.debugOverlay?.destroy();
        if (!this.lastViewModel) {
            return;
        }
        this.debugOverlay = drawPlayerDebugOverlay({
            scene: this,
            viewModel: this.lastViewModel,
            layers: this.getDebugLayers(),
        });
    }

    private syncViewModel(viewModel: CardGameViewModel): void {
        this.lastViewModel = viewModel;
        this.ensureCardTextures(viewModel);
        this.renderLayer?.destroy(true);
        this.renderLayer = this.add.container(0, 0);
        this.stockPilePoint = null;

        if (this.debugOverlay) {
            this.redrawDebugOverlay();
        }

        const theme = getTheme(viewModel.themeId);
        this.drawBackground(theme);
        const presentation = getPlayerPovPresentation(viewModel);
        this.drawTopBar(viewModel, theme);
        this.drawGameInfo(viewModel, presentation);
        this.drawOpponents(viewModel);
        this.drawTableCards(viewModel, presentation);
        this.drawPlayerHand(viewModel);
        this.drawBottomControls(viewModel);
        this.drawSessionStatus();
        this.presentMoveEffects(viewModel);
        this.checkBattleFlash(viewModel);
    }

    private checkBattleFlash(viewModel: CardGameViewModel): void {
        const outcome = viewModel.outcome;
        if (!outcome) {
            return;
        }

        const flashKey = 'outcome:' + outcome.winnerPlayerIds.join(',');
        if (flashKey === this.lastBattleFlashKey) {
            return;
        }

        this.lastBattleFlashKey = flashKey;
        const localPlayerId = viewModel.players[0]?.id ?? '';
        const isLocalWin = outcome.winnerPlayerIds.includes(localPlayerId);
        const winnerName =
            viewModel.players.find((p) => outcome.winnerPlayerIds.includes(p.id))?.nameLabel ?? '';
        this.showBattleFlash(winnerName, isLocalWin);
    }

    private showBattleFlash(winnerName: string, isLocalPlayer: boolean): void {
        this.flashContainer?.destroy(true);

        const cx = PLAYER_GAME_WIDTH / 2;
        const cy = PLAYER_GAME_HEIGHT / 2;
        const container = this.add.container(cx, cy);
        container.setDepth(2000);
        container.setAlpha(0);
        this.flashContainer = container;

        const overlay = this.add.rectangle(
            0,
            0,
            PLAYER_GAME_WIDTH,
            PLAYER_GAME_HEIGHT,
            0x000000,
            0.52,
        );
        const panelW = 262;
        const panelH = 92;
        const panelBg = this.add.graphics();
        const panelFill = isLocalPlayer ? 0x1a5c2a : 0x0f2850;
        const panelBorder = isLocalPlayer ? GOLD : 0x6699cc;
        panelBg.fillStyle(panelFill, 0.97);
        panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22);
        panelBg.lineStyle(2, panelBorder, 0.9);
        panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22);

        const titleLabel = isLocalPlayer ? 'YOU WIN!' : winnerName + ' wins';
        const title = this.add
            .text(0, -16, titleLabel, {
                fontFamily: 'Arial',
                fontSize: isLocalPlayer ? '30px' : '24px',
                fontStyle: '700',
                color: isLocalPlayer ? '#ffd166' : '#c8dff8',
            })
            .setOrigin(0.5);

        const sub = this.add
            .text(0, 20, isLocalPlayer ? 'Battle won' : 'Battle won', {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: isLocalPlayer ? 'rgba(255,240,180,0.65)' : 'rgba(180,210,255,0.65)',
            })
            .setOrigin(0.5);

        const items: Phaser.GameObjects.GameObject[] = [overlay, panelBg];
        if (isLocalPlayer && this.textures.exists('win-bg')) {
            const winBg = this.add.image(0, 0, 'win-bg').setDisplaySize(panelW, panelH);
            items.push(winBg);
        }
        items.push(title, sub);
        container.add(items);

        this.tweens.add({
            targets: container,
            alpha: 1,
            scaleX: { from: 0.88, to: 1 },
            scaleY: { from: 0.88, to: 1 },
            duration: 180,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: container,
                    alpha: 0,
                    duration: 360,
                    delay: 780,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        container.destroy(true);
                        if (this.flashContainer === container) {
                            this.flashContainer = undefined;
                        }
                    },
                });
            },
        });
    }

    private drawBackground(theme: PlayerTheme): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(
            this.add.rectangle(
                PLAYER_GAME_WIDTH / 2,
                PLAYER_GAME_HEIGHT / 2,
                PLAYER_GAME_WIDTH,
                PLAYER_GAME_HEIGHT,
                theme.bg,
                1,
            ),
        );

        if (this.textures.exists(theme.bgImage)) {
            this.renderLayer.add(
                this.add
                    .image(PLAYER_GAME_WIDTH / 2, PLAYER_GAME_HEIGHT / 2, theme.bgImage)
                    .setDisplaySize(PLAYER_GAME_WIDTH + 80, PLAYER_GAME_HEIGHT + 80)
                    .setAlpha(theme.bgAlpha),
            );
        }

        this.renderLayer.add(
            this.add.rectangle(
                PLAYER_GAME_WIDTH / 2,
                PLAYER_GAME_HEIGHT / 2,
                PLAYER_GAME_WIDTH,
                PLAYER_GAME_HEIGHT,
                theme.bg,
                theme.bgOverlayAlpha,
            ),
        );

        if (theme.showFelt) {
            this.renderLayer.add(
                createRoundedPanel(
                    this,
                    PLAYER_GAME_WIDTH / 2,
                    350,
                    312,
                    412,
                    68,
                    theme.felt,
                    0.96,
                    theme.bg,
                    5,
                    0.96,
                ),
            );
            this.renderLayer.add(
                createRoundedPanel(
                    this,
                    PLAYER_GAME_WIDTH / 2,
                    352,
                    286,
                    374,
                    50,
                    theme.feltInner,
                    0.55,
                    theme.feltInnerBorder,
                    1,
                    0.18,
                ),
            );
        }
    }

    private drawTopBar(
        viewModel: CardGameViewModel,
        theme: PlayerTheme,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const isPlayerTurn = viewModel.players[0]?.isCurrentTurn === true;
        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                playerPovZones.topBarY,
                94,
                30,
                15,
                isPlayerTurn ? 0xf7efe0 : theme.turnBg,
                0.98,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2,
                    playerPovZones.topBarY,
                    isPlayerTurn ? 'Your turn' : viewModel.phaseLabel,
                    {
                        fontFamily: 'Arial',
                        fontSize: '14px',
                        fontStyle: '700',
                        color: isPlayerTurn ? '#10251c' : CREAM,
                    },
                )
                .setOrigin(0.5),
        );
    }

    private drawGameInfo(viewModel: CardGameViewModel, presentation: PlayerPovPresentation): void {
        if (!this.renderLayer || presentation.infoPanel === 'none') {
            return;
        }

        if (presentation.infoPanel !== 'trump') {
            this.drawCompactGameInfo(presentation);
            return;
        }

        const trumpLabel = presentation.trumpLabel ?? 'spent';
        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                playerPovZones.gameInfoY,
                256,
                52,
                22,
                0x082417,
                0.9,
                0x5ea65d,
                2,
                0.3,
            ),
        );
        this.renderLayer.add(
            this.add
                .circle(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, 18, 0xd3a22e, 1)
                .setStrokeStyle(2, 0xffd166, 0.72),
        );
        this.renderLayer.add(
            this.add
                .text(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, 'T', {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    fontStyle: '700',
                    color: '#10251c',
                })
                .setOrigin(0.5),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 - 74,
                    playerPovZones.gameInfoY - 8,
                    presentation.infoPrimaryLabel + ': ' + trumpLabel,
                    {
                        fontFamily: 'Arial',
                        fontSize: '13px',
                        fontStyle: '700',
                        color: CREAM,
                    },
                )
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 - 74,
                    playerPovZones.gameInfoY + 9,
                    presentation.infoSecondaryValue,
                    {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        color: DIM,
                    },
                )
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add.line(
                PLAYER_GAME_WIDTH / 2 + 52,
                playerPovZones.gameInfoY,
                0,
                -18,
                0,
                18,
                0x5ea65d,
                0.35,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 + 68,
                    playerPovZones.gameInfoY - 8,
                    presentation.infoSecondaryLabel,
                    {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        color: DIM,
                    },
                )
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 + 68,
                    playerPovZones.gameInfoY + 9,
                    String(viewModel.tableCards.length) + ' cards',
                    {
                        fontFamily: 'Arial',
                        fontSize: '13px',
                        fontStyle: '700',
                        color: CREAM,
                    },
                )
                .setOrigin(0, 0.5),
        );
    }

    private drawCompactGameInfo(presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        const accentColor = presentation.infoPanel === 'battle' ? GOLD : 0x83d0ae;
        const iconLabel = presentation.infoPanel === 'battle' ? 'B' : 'D';
        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                playerPovZones.gameInfoY,
                256,
                48,
                20,
                0x082417,
                0.88,
                accentColor,
                2,
                0.28,
            ),
        );
        this.renderLayer.add(
            this.add
                .circle(
                    PLAYER_GAME_WIDTH / 2 - 102,
                    playerPovZones.gameInfoY,
                    16,
                    accentColor,
                    0.94,
                )
                .setStrokeStyle(2, 0xf6ecd2, 0.4),
        );
        this.renderLayer.add(
            this.add
                .text(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, iconLabel, {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    fontStyle: '700',
                    color: '#10251c',
                })
                .setOrigin(0.5),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 - 74,
                    playerPovZones.gameInfoY - 8,
                    presentation.infoPrimaryLabel,
                    {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        color: DIM,
                    },
                )
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 - 74,
                    playerPovZones.gameInfoY + 8,
                    presentation.infoPrimaryValue,
                    {
                        fontFamily: 'Arial',
                        fontSize: '11px',
                        fontStyle: '700',
                        color: CREAM,
                    },
                )
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add.line(
                PLAYER_GAME_WIDTH / 2 + 36,
                playerPovZones.gameInfoY,
                0,
                -15,
                0,
                15,
                0x5ea65d,
                0.3,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 + 52,
                    playerPovZones.gameInfoY - 8,
                    presentation.infoSecondaryLabel,
                    {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        color: DIM,
                    },
                )
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(
                    PLAYER_GAME_WIDTH / 2 + 52,
                    playerPovZones.gameInfoY + 8,
                    presentation.infoSecondaryValue,
                    {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        fontStyle: '700',
                        color: CREAM,
                        wordWrap: { width: 70 },
                    },
                )
                .setOrigin(0, 0.5),
        );
    }

    private drawOpponents(viewModel: CardGameViewModel): void {
        getPlayerPovOpponentSeats(viewModel).forEach((seat) => {
            this.drawOpponent(seat.player, seat.layout, seat.counters);
        });
    }

    private drawOpponent(
        player: CardGameViewPlayer,
        layout: PlayerPovSeatLayout,
        counters: PlayerPovPlayerCounters,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        if (layout.side === 'left' || layout.side === 'right') {
            this.drawSideOpponent(player, layout, counters);
            return;
        }

        this.drawTopOpponent(player, layout, counters);
    }

    private drawTopOpponent(
        player: CardGameViewPlayer,
        layout: PlayerPovSeatLayout,
        counters: PlayerPovPlayerCounters,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const { x, y } = layout;
        const seatWidth = 116;
        const seatHeight = 36;
        const seatY = y + 6;

        this.renderLayer.add(
            createRoundedPanel(
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
                player.isCurrentTurn ? 0.58 : 0.22,
            ),
        );

        const avatarX = x - seatWidth / 2 + 16;
        const textX = avatarX + 24;
        this.renderLayer.add(
            this.add
                .circle(avatarX, seatY, 14, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
                .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85),
        );
        this.renderLayer.add(
            this.add.circle(
                avatarX - 12,
                seatY - 12,
                4,
                player.isCurrentTurn ? GOLD : 0x68d184,
                0.96,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(avatarX, seatY, player.iconLabel, {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    fontStyle: '700',
                    color: player.isCurrentTurn ? '#10251c' : CREAM,
                })
                .setOrigin(0.5),
        );
        this.renderLayer.add(
            this.add
                .text(textX, seatY - 7, player.nameLabel, {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    fontStyle: '700',
                    color: CREAM,
                })
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(textX, seatY + 8, String(counters.score), {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    fontStyle: '700',
                    color: 'rgba(255,209,102,0.96)',
                })
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(textX + 20, seatY + 8, '· ' + counters.cards, {
                    fontFamily: 'Arial',
                    fontSize: '8px',
                    color: counters.cards < 10 ? 'rgba(255,140,60,0.96)' : DIM,
                })
                .setOrigin(0, 0.5),
        );

        const cardCount = Math.min(counters.cards, 8);
        if (cardCount > 0) {
            const fanCenterY = seatY + seatHeight / 2 + 6 + OPP_CARD_H / 2;
            for (let i = 0; i < cardCount; i++) {
                const pt = getOpponentFanCardPoint(cardCount, i, x, fanCenterY, 'top');
                const back = this.add
                    .image(pt.x, pt.y, this.getActiveBackTextureKey())
                    .setDisplaySize(OPP_CARD_W, OPP_CARD_H)
                    .setAngle(pt.angle);
                this.setCardDisplaySize(back, OPP_CARD_W, OPP_CARD_H);
                this.renderLayer.add(back);
            }
        }
    }

    private drawSideOpponent(
        player: CardGameViewPlayer,
        layout: PlayerPovSeatLayout,
        counters: PlayerPovPlayerCounters,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const isLeft = layout.side === 'left';
        const panelWidth = 112;
        const panelHeight = 36;
        const panelCenterX = isLeft ? panelWidth / 2 : PLAYER_GAME_WIDTH - panelWidth / 2;
        const panelY = layout.y;

        this.renderLayer.add(
            createRoundedPanel(
                this,
                panelCenterX,
                panelY,
                panelWidth,
                panelHeight,
                14,
                0x071a13,
                0.7,
                player.isCurrentTurn ? GOLD : 0x7fb896,
                1,
                player.isCurrentTurn ? 0.58 : 0.22,
            ),
        );

        const avatarX = isLeft
            ? panelCenterX - panelWidth / 2 + 16
            : panelCenterX + panelWidth / 2 - 16;
        const dotOffsetX = isLeft ? -12 : 12;

        this.renderLayer.add(
            this.add
                .circle(avatarX, panelY, 14, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
                .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85),
        );
        this.renderLayer.add(
            this.add.circle(
                avatarX + dotOffsetX,
                panelY - 12,
                4,
                player.isCurrentTurn ? GOLD : 0x68d184,
                0.96,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(avatarX, panelY, player.iconLabel, {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    fontStyle: '700',
                    color: player.isCurrentTurn ? '#10251c' : CREAM,
                })
                .setOrigin(0.5),
        );

        const textX = isLeft ? avatarX + 22 : avatarX - 22;
        const originX = isLeft ? 0 : 1;

        this.renderLayer.add(
            this.add
                .text(textX, panelY - 7, player.nameLabel, {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    fontStyle: '700',
                    color: CREAM,
                })
                .setOrigin(originX, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(textX, panelY + 7, String(counters.score), {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    fontStyle: '700',
                    color: 'rgba(255,209,102,0.96)',
                })
                .setOrigin(originX, 0.5),
        );
        const scoreWidth = String(counters.score).length * 7 + 4;
        const cardsX = isLeft ? textX + scoreWidth : textX - scoreWidth;
        this.renderLayer.add(
            this.add
                .text(cardsX, panelY + 8, '· ' + String(counters.cards), {
                    fontFamily: 'Arial',
                    fontSize: '8px',
                    color: counters.cards < 10 ? 'rgba(255,140,60,0.96)' : DIM,
                })
                .setOrigin(originX, 0.5),
        );

        const cardCount = Math.min(counters.cards, 6);
        if (cardCount > 0) {
            const fanSide = isLeft ? 'left' : 'right';
            const spread = cardCount > 1 ? Math.min(14, 84 / (cardCount - 1)) : 0;
            const fanTopY = panelY + panelHeight / 2 + 6 + OPP_CARD_H / 2;
            const fanCenterY = fanTopY + ((cardCount - 1) / 2) * spread;
            for (let i = 0; i < cardCount; i++) {
                const pt = getOpponentFanCardPoint(cardCount, i, panelCenterX, fanCenterY, fanSide);
                const back = this.add
                    .image(pt.x, pt.y, this.getActiveBackTextureKey())
                    .setDisplaySize(OPP_CARD_W, OPP_CARD_H)
                    .setAngle(pt.angle);
                this.setCardDisplaySize(back, OPP_CARD_W, OPP_CARD_H);
                this.renderLayer.add(back);
            }
        }
    }

    private drawTableCards(
        viewModel: CardGameViewModel,
        presentation: PlayerPovPresentation,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        if (presentation.centerArea === 'trick') {
            this.drawCurrentTrickLabel(viewModel);
        } else if (presentation.centerArea === 'battle') {
            this.drawBattleSurface();
        } else if (presentation.centerArea === 'showdown') {
            this.drawShowdownSurface(presentation);
        }

        if (presentation.centerDock === 'stock') {
            this.drawCenterStockPile(viewModel);
        } else if (presentation.centerDock === 'deck') {
            this.drawCenterDeckWidget(viewModel, presentation);
        }

        const cards = viewModel.tableCards;
        const battlePoints = new Map<string, { x: number; y: number; angle: number }>();
        if (presentation.centerArea === 'battle') {
            const localPlayerId = viewModel.players[0]?.id ?? '';
            const faceDownCounts = new Map<string, number>();
            cards.forEach((card) => {
                const side = card.playerId === localPlayerId ? 'bottom' : 'top';
                const isComparison = card.isFaceUp === true;
                const fdIndex = isComparison ? 0 : (faceDownCounts.get(card.playerId ?? '') ?? 0);
                if (!isComparison) {
                    faceDownCounts.set(card.playerId ?? '', fdIndex + 1);
                }
                battlePoints.set(card.id, getWarBattleCardPoint(side, isComparison, fdIndex));
            });
        }

        cards.forEach((card, index) => {
            const point =
                battlePoints.get(card.id) ??
                (presentation.centerArea === 'trick'
                    ? this.getTrickCardPointForCard(card, viewModel)
                    : getTableRowCardPoint({
                          cardCount: cards.length,
                          index,
                      }));
            const image = this.add
                .image(point.x, point.y, this.getTextureForCard(card, 'compact'))
                .setDisplaySize(TABLE_CARD_W, TABLE_CARD_H)
                .setAngle(point.angle);
            this.setCardDisplaySize(image, TABLE_CARD_W, TABLE_CARD_H);
            this.renderLayer?.add(image);

            if (card.stackBadgeLabel) {
                this.renderLayer?.add(
                    this.add
                        .text(
                            point.x + TABLE_CARD_W / 2 - 2,
                            point.y - TABLE_CARD_H / 2 + 2,
                            card.stackBadgeLabel,
                            {
                                fontFamily: 'Arial',
                                fontSize: '9px',
                                fontStyle: '700',
                                color: '#ffffff',
                                backgroundColor: 'rgba(0,0,0,0.72)',
                                padding: { x: 3, y: 2 },
                            },
                        )
                        .setOrigin(1, 0)
                        .setDepth(32),
                );
            }
        });

        if (presentation.bottomDock === 'stock-trump') {
            this.drawStockTrumpWidget(viewModel, presentation);
        } else if (presentation.bottomDock === 'deck') {
            this.drawDeckWidget(viewModel, presentation);
        }

        const pileText = getPrimaryPileText(viewModel);
        if (
            pileText &&
            presentation.bottomDock !== 'stock-trump' &&
            presentation.centerDock === 'none'
        ) {
            this.renderLayer.add(
                this.add
                    .text(PLAYER_GAME_WIDTH / 2, 368, pileText, {
                        fontFamily: 'Arial',
                        fontSize: '13px',
                        fontStyle: '700',
                        color: 'rgba(255,209,102,0.86)',
                    })
                    .setOrigin(0.5),
            );
        }
    }

    private drawCenterStockPile(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const stockPile = getPileByRole(viewModel, 'stock') ?? getPileByRole(viewModel, 'draw');
        if (!stockPile || stockPile.cardCount === 0) {
            return;
        }

        const cx = PLAYER_GAME_WIDTH / 2;
        const cy = 222;
        const w = STOCK_TRUMP_CARD_W;
        const h = STOCK_TRUMP_CARD_H;
        this.stockPilePoint = { x: cx, y: cy };

        this.renderLayer.add(
            createRoundedPanel(this, cx, cy, w + 20, h + 16, 12, 0x082417, 0.72, 0x4d7cc9, 1, 0.3),
        );

        for (let i = 2; i >= 0; i--) {
            const back = this.add
                .image(cx - i * 2, cy + i * 2, this.getActiveBackTextureKey())
                .setDisplaySize(w, h)
                .setAlpha(0.6 + i * 0.13)
                .setAngle(-3 + i * 3);
            this.setCardDisplaySize(back, w, h);
            this.renderLayer.add(back);
        }

        this.renderLayer.add(
            this.add
                .text(cx + w / 2 - 2, cy - h / 2 + 2, String(stockPile.cardCount), {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    fontStyle: '700',
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.78)',
                    padding: { x: 3, y: 2 },
                })
                .setOrigin(1, 0)
                .setDepth(32),
        );
    }

    private drawCenterDeckWidget(
        viewModel: CardGameViewModel,
        presentation: PlayerPovPresentation,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const drawPile = getPileByRole(viewModel, 'draw');
        const discardPile = getPileByRole(viewModel, 'discard');
        if (!drawPile && !discardPile) {
            return;
        }

        const cy = 252;
        const drawX = PLAYER_GAME_WIDTH / 2 - 38;
        const discardX = PLAYER_GAME_WIDTH / 2 + 38;
        const w = STOCK_TRUMP_CARD_W;
        const h = STOCK_TRUMP_CARD_H;
        this.stockPilePoint = { x: drawX, y: cy };

        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                cy,
                w * 2 + 52,
                h + 18,
                14,
                0x082417,
                0.82,
                0x5ea65d,
                1,
                0.22,
            ),
        );

        if (drawPile) {
            for (let i = 2; i >= 0; i--) {
                const back = this.add
                    .image(drawX - i * 2, cy - i, this.getActiveBackTextureKey())
                    .setDisplaySize(w, h)
                    .setAngle(-2 + i * 2)
                    .setAlpha(drawPile.cardCount > 0 ? 0.82 : 0.25);
                this.setCardDisplaySize(back, w, h);
                this.renderLayer.add(back);
            }
            this.renderLayer.add(
                this.add
                    .text(drawX + w / 2 - 2, cy - h / 2 + 2, String(drawPile.cardCount), {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        fontStyle: '700',
                        color: '#ffffff',
                        backgroundColor: 'rgba(0,0,0,0.72)',
                        padding: { x: 3, y: 2 },
                    })
                    .setOrigin(1, 0)
                    .setDepth(32),
            );
            this.renderLayer.add(
                this.add
                    .text(drawX, cy + h / 2 + 7, presentation.infoPrimaryValue, {
                        fontFamily: 'Arial',
                        fontSize: '9px',
                        color: DIM,
                    })
                    .setOrigin(0.5, 0),
            );
        }

        if (discardPile?.topCard) {
            const discardCard = this.add
                .image(discardX, cy, this.getTextureForCard(discardPile.topCard, 'compact'))
                .setDisplaySize(w, h)
                .setAngle(3);
            this.setCardDisplaySize(discardCard, w, h);
            this.renderLayer.add(discardCard);
        } else {
            this.renderLayer.add(
                createRoundedPanel(this, discardX, cy, w, h, 5, 0x0b2118, 0.35, 0x7fb896, 1, 0.22),
            );
        }
        this.renderLayer.add(
            this.add
                .text(discardX, cy + h / 2 + 7, presentation.infoSecondaryValue, {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    color: DIM,
                })
                .setOrigin(0.5, 0),
        );
    }

    private drawCurrentTrickLabel(_viewModel: CardGameViewModel): void {}

    private drawBattleSurface(): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                352,
                216,
                146,
                28,
                0x092018,
                0.36,
                GOLD,
                1,
                0.22,
            ),
        );
    }

    private drawShowdownSurface(presentation: PlayerPovPresentation): void {
        if (!this.renderLayer) {
            return;
        }

        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                352,
                198,
                126,
                26,
                0x0a2a18,
                0.28,
                0x83d0ae,
                1,
                0.2,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(PLAYER_GAME_WIDTH / 2, 302, presentation.centerLabel, {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    color: DIM,
                })
                .setOrigin(0.5),
        );
    }

    private getTrickCardPointForCard(
        card: CardGameViewTableCard,
        viewModel: CardGameViewModel,
    ): { x: number; y: number; angle: number } {
        return getTrickCardPoint(getPlayerPovSeatSide(viewModel, card.playerId));
    }

    private drawStockTrumpWidget(
        viewModel: CardGameViewModel,
        presentation: PlayerPovPresentation,
    ): boolean {
        if (!this.renderLayer) {
            return false;
        }

        const drawPile = getPileByRole(viewModel, 'draw') ?? getPileByRole(viewModel, 'stock');
        const trumpPile = getPileByRole(viewModel, 'trump');
        if (!drawPile || !trumpPile || !trumpPile.topCard) {
            return false;
        }

        const stockTrumpPoint = getStockTrumpPoint();
        const stockX = stockTrumpPoint.x;
        const centerY = stockTrumpPoint.y;
        this.stockPilePoint = { x: stockX, y: centerY };

        // Trump offset: same ratio as table view (cardHeight * 0.34 to the left)
        const trumpOffset = Math.round(STOCK_TRUMP_CARD_H * 0.34);
        const trumpX = stockX + trumpOffset;

        const cardTopY = centerY - Math.round(STOCK_TRUMP_CARD_H / 2);
        const labelCenterX = stockX;

        // Trump card — rotated 90°, underneath stock pile
        const trumpCard = this.add
            .image(trumpX, centerY, this.getTextureForCard(trumpPile.topCard, 'compact'))
            .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
            .setAngle(90)
            .setAlpha(0.98)
            .setDepth(56);
        this.setCardDisplaySize(trumpCard, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
        this.renderLayer.add(trumpCard);

        // Stock card backs — stacked on top of trump
        for (let i = 2; i >= 0; i--) {
            const back = this.add
                .image(stockX + i * 2, centerY - i * 2, this.getActiveBackTextureKey())
                .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
                .setAlpha(drawPile.cardCount > 0 ? 0.78 + i * 0.08 : 0.24)
                .setAngle(0)
                .setDepth(57 + i);
            this.setCardDisplaySize(back, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
            this.renderLayer.add(back);
        }

        // Labels above the cards
        this.renderLayer.add(
            this.add
                .text(labelCenterX, cardTopY - 30, 'Trump', {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    fontStyle: '700',
                    color: CREAM,
                })
                .setOrigin(0.5, 1),
        );
        this.renderLayer.add(
            this.add
                .text(labelCenterX, cardTopY - 16, presentation.trumpLabel ?? 'spent', {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    fontStyle: '700',
                    color: 'rgba(255,209,102,0.9)',
                })
                .setOrigin(0.5, 1),
        );
        this.renderLayer.add(
            this.add
                .text(labelCenterX, cardTopY - 4, drawPile.countLabel.replace(' + trump', ''), {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    color: DIM,
                })
                .setOrigin(0.5, 1),
        );

        return true;
    }

    private drawDeckWidget(
        viewModel: CardGameViewModel,
        presentation: PlayerPovPresentation,
    ): boolean {
        if (!this.renderLayer) {
            return false;
        }

        const drawPile = getPileByRole(viewModel, 'draw');
        const discardPile = getPileByRole(viewModel, 'discard');
        if (!drawPile && !discardPile) {
            return false;
        }

        const centerY = playerPovZones.stockTrumpY;
        const centerX = 118;
        this.stockPilePoint = { x: centerX - 64, y: centerY };
        this.renderLayer.add(
            createRoundedPanel(
                this,
                centerX,
                centerY,
                206,
                78,
                18,
                0x082417,
                0.57,
                0x5ea65d,
                1,
                0.22,
            ),
        );

        if (drawPile) {
            for (let index = 0; index < 3; index += 1) {
                const stockBack = this.add
                    .image(
                        centerX - 64 + index * 3,
                        centerY - index,
                        this.getActiveBackTextureKey(),
                    )
                    .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
                    .setAngle(-2 + index * 2)
                    .setAlpha(drawPile.cardCount > 0 ? 0.82 : 0.25);
                this.setCardDisplaySize(stockBack, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
                this.renderLayer.add(stockBack);
            }
        }

        if (discardPile?.topCard) {
            const discardCard = this.add
                .image(
                    centerX - 10,
                    centerY,
                    this.getTextureForCard(discardPile.topCard, 'compact'),
                )
                .setDisplaySize(STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H)
                .setAngle(3);
            this.setCardDisplaySize(discardCard, STOCK_TRUMP_CARD_W, STOCK_TRUMP_CARD_H);
            this.renderLayer.add(discardCard);
        } else {
            this.renderLayer.add(
                createRoundedPanel(
                    this,
                    centerX - 10,
                    centerY,
                    STOCK_TRUMP_CARD_W,
                    STOCK_TRUMP_CARD_H,
                    5,
                    0x0b2118,
                    0.35,
                    0x7fb896,
                    1,
                    0.22,
                ),
            );
        }

        this.renderLayer.add(
            this.add
                .text(centerX + 36, centerY - 15, presentation.infoPrimaryLabel, {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    fontStyle: '700',
                    color: CREAM,
                })
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(centerX + 36, centerY + 3, presentation.infoPrimaryValue, {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    color: DIM,
                })
                .setOrigin(0, 0.5),
        );
        this.renderLayer.add(
            this.add
                .text(centerX + 36, centerY + 20, presentation.infoSecondaryValue, {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    color: 'rgba(255,209,102,0.86)',
                })
                .setOrigin(0, 0.5),
        );

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

        this.localPlayerDeckPoint = null;
        const cards = player.hand;

        if (cards.length === 0 && player.deckPile) {
            const capturePile = viewModel.piles.find(
                (p) => p.role === 'capture' && p.ownerId === player.id,
            );
            const hasWonPile = (capturePile?.cardCount ?? 0) > 0;
            const deckX = hasWonPile ? PLAYER_GAME_WIDTH / 2 - 62 : PLAYER_GAME_WIDTH / 2;
            const deckY = playerPovZones.handY - 10;

            if (player.deckPile.cardCount > 0) {
                this.localPlayerDeckPoint = { x: deckX, y: deckY };
                this.drawPlayerDeckVisual(
                    deckX,
                    deckY,
                    player.deckPile.cardCount,
                    player.isCurrentTurn,
                    player.canInteract,
                );
            }

            if (hasWonPile && capturePile) {
                this.drawWonPileVisual(PLAYER_GAME_WIDTH / 2 + 62, deckY, capturePile.cardCount);
            }
        }

        cards.forEach((card, index) => {
            const isSelected = card.id === viewModel.selectedCardId;
            const point = getHandCardPoint({
                cardCount: cards.length,
                index,
                selected: isSelected,
            });
            if (isSelected) {
                const glow = this.add.graphics();
                glow.lineStyle(4, GOLD, 0.88);
                glow.strokeRoundedRect(
                    -HAND_CARD_W / 2 - 5,
                    -HAND_CARD_H / 2 - 5,
                    HAND_CARD_W + 10,
                    HAND_CARD_H + 10,
                    10,
                );
                glow.setPosition(point.x, point.y);
                glow.setAngle(point.angle);
                glow.setDepth(29 + index);
                this.renderLayer?.add(glow);
            }

            const image = this.add
                .image(point.x, point.y, this.getTextureForCard(card, 'showcase'))
                .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
                .setAngle(point.angle)
                .setDepth(30 + index);
            this.setCardDisplaySize(image, HAND_CARD_W, HAND_CARD_H);
            if (player.canInteract && card.isFaceUp) {
                image.setInteractive({ useHandCursor: true });
                image.on(Phaser.Input.Events.POINTER_DOWN, () => {
                    this.session.send({ type: 'SELECT_CARD', cardId: card.id });
                });
            }
            this.renderLayer?.add(image);
        });
    }

    private drawPlayerDeckVisual(
        x: number,
        y: number,
        cardCount: number,
        isCurrentTurn: boolean,
        canInteract: boolean,
    ): void {
        if (!this.renderLayer) {
            return;
        }

        const isLow = cardCount < 10;
        const backCount = cardCount <= 3 ? 1 : cardCount <= 7 ? 2 : 3;
        for (let i = backCount - 1; i >= 0; i--) {
            const back = this.add
                .image(x + i * 2, y - i * 2, this.getActiveBackTextureKey())
                .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
                .setAlpha(0.6 + i * 0.14)
                .setAngle(0)
                .setDepth(28 + i);
            this.setCardDisplaySize(back, HAND_CARD_W, HAND_CARD_H);
            this.renderLayer.add(back);
        }

        if (isCurrentTurn) {
            const glowColor = isLow ? 0xff7020 : GOLD;
            const glow = this.add.graphics().setDepth(27);
            glow.lineStyle(3, glowColor, 0.72);
            glow.strokeRoundedRect(
                x - HAND_CARD_W / 2 - 4,
                y - HAND_CARD_H / 2 - 4,
                HAND_CARD_W + 8,
                HAND_CARD_H + 8,
                8,
            );
            this.renderLayer.add(glow);
        }

        this.renderLayer.add(
            this.add
                .text(x + HAND_CARD_W / 2 - 2, y - HAND_CARD_H / 2 + 2, String(cardCount), {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    fontStyle: '700',
                    color: isLow ? '#ffaa70' : '#ffffff',
                    backgroundColor: isLow ? 'rgba(150,40,0,0.82)' : 'rgba(0,0,0,0.78)',
                    padding: { x: 4, y: 2 },
                })
                .setOrigin(1, 0)
                .setDepth(32),
        );

        if (canInteract) {
            const hit = this.add
                .rectangle(x, y, HAND_CARD_W, HAND_CARD_H, 0x000000, 0.001)
                .setDepth(33)
                .setInteractive({ useHandCursor: true });
            hit.on(Phaser.Input.Events.POINTER_DOWN, () => {
                this.session.send({ type: 'PLAY_CARD' });
            });
            this.renderLayer.add(hit);
        }
    }

    private drawWonPileVisual(x: number, y: number, cardCount: number): void {
        if (!this.renderLayer) {
            return;
        }

        const backCount = cardCount <= 3 ? 1 : cardCount <= 7 ? 2 : 3;
        for (let i = backCount - 1; i >= 0; i--) {
            const back = this.add
                .image(x - i * 2, y - i * 2, this.getActiveBackTextureKey())
                .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
                .setAlpha(0.6 + i * 0.14)
                .setAngle(0)
                .setDepth(28 + i);
            this.setCardDisplaySize(back, HAND_CARD_W, HAND_CARD_H);
            this.renderLayer.add(back);
        }

        this.renderLayer.add(
            this.add
                .text(x + HAND_CARD_W / 2 - 2, y - HAND_CARD_H / 2 + 2, String(cardCount), {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    fontStyle: '700',
                    color: '#ffffff',
                    backgroundColor: 'rgba(30,100,50,0.88)',
                    padding: { x: 4, y: 2 },
                })
                .setOrigin(1, 0)
                .setDepth(32),
        );

        this.renderLayer.add(
            this.add
                .text(x, y + HAND_CARD_H / 2 + 6, 'Won', {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    color: 'rgba(255,209,102,0.86)',
                })
                .setOrigin(0.5, 0)
                .setDepth(32),
        );
    }

    private drawBottomControls(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const action = viewModel.primaryAction;
        const canPlay = viewModel.controls.canPlay || action?.eventType === 'PLAY_CARD';
        const label = normalizeActionLabel(
            action?.label ?? (viewModel.players[0]?.isCurrentTurn ? 'Select Card' : 'Waiting'),
        );
        const buttonX = PLAYER_GAME_WIDTH / 2;
        const buttonWidth = 144;
        const button = createRoundedPanel(
            this,
            buttonX,
            playerPovZones.actionButtonY,
            buttonWidth,
            48,
            18,
            canPlay ? 0xffd166 : 0x244034,
            canPlay ? 1 : 0.76,
            canPlay ? 0xffc840 : 0x6c806f,
            2,
            canPlay ? 0.72 : 0.2,
        );
        this.renderLayer.add(button);
        this.renderLayer.add(
            this.add
                .text(buttonX, playerPovZones.actionButtonY, label, {
                    fontFamily: 'Arial',
                    fontSize: canPlay ? '14px' : '16px',
                    fontStyle: '700',
                    color: canPlay ? '#10251c' : DIM,
                })
                .setOrigin(0.5),
        );

        if (canPlay && action?.eventType === 'PLAY_CARD') {
            const hitTarget = this.add
                .rectangle(buttonX, playerPovZones.actionButtonY, buttonWidth, 48, 0x000000, 0.001)
                .setInteractive({ useHandCursor: true });
            hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
                this.session.send({ type: 'PLAY_CARD' });
            });
            this.renderLayer.add(hitTarget);
        }

        const statusX = PLAYER_GAME_WIDTH / 2;
        const statusWidth = PLAYER_GAME_WIDTH - 60;
        this.renderLayer.add(
            createRoundedPanel(
                this,
                statusX,
                playerPovZones.actionStatusY,
                statusWidth,
                30,
                14,
                0x071a13,
                0.54,
                0x5ea65d,
                1,
                0.12,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(statusX, playerPovZones.actionStatusY, viewModel.statusText, {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    color: DIM,
                    align: 'center',
                    wordWrap: { width: PLAYER_GAME_WIDTH - 82 },
                })
                .setOrigin(0.5),
        );
    }

    private presentMoveEffects(viewModel: CardGameViewModel): void {
        if (!this.renderLayer) {
            return;
        }

        const effects = viewModel.effects.filter(isMoveCardEffect);
        const effectBatchKey = effects.map((effect) => effect.key).join('|');
        if (!effectBatchKey) {
            this.activeEffectBatchKey = '';
            return;
        }

        if (effectBatchKey === this.activeEffectBatchKey) {
            return;
        }

        this.activeEffectBatchKey = effectBatchKey;
        const delays = computeEffectDelays(effects);
        const dealCount = effects.filter((e) => e.reason === 'deal').length;
        const dealDelayStep = getDealDelayStep(dealCount);

        let scheduledCount = 0;
        let completedCount = 0;
        const onEffectDone = () => {
            completedCount += 1;
            if (completedCount === scheduledCount) {
                this.session.send({ type: 'ANIMATION_DONE' });
            }
        };

        effects.forEach((effect, index) => {
            const points = this.getMoveEffectPoints(effect, viewModel);
            if (!points) {
                return;
            }

            scheduledCount += 1;
            const profile = getEffectProfile(effect.reason, dealDelayStep);
            const ghostSize = this.getGhostSizeForEffect(effect, viewModel);
            this.animateMoveGhost(
                effect,
                points.from,
                points.to,
                profile,
                delays[index] ?? 0,
                ghostSize,
                onEffectDone,
            );
        });

        if (scheduledCount === 0) {
            this.time.delayedCall(0, () => {
                this.session.send({ type: 'ANIMATION_DONE' });
            });
        }
    }

    private getGhostSizeForEffect(
        effect: MoveCardEffect,
        viewModel: CardGameViewModel,
    ): { width: number; height: number } {
        if (effect.toOwnerId) {
            const playerIndex = viewModel.players.findIndex((p) => p.id === effect.toOwnerId);
            return playerIndex === 0
                ? { width: HAND_CARD_W, height: HAND_CARD_H }
                : {
                      width: playerPovCardSizes.opponent.width,
                      height: playerPovCardSizes.opponent.height,
                  };
        }

        return { width: TABLE_CARD_W, height: TABLE_CARD_H };
    }

    private getMoveEffectPoints(
        effect: MoveCardEffect,
        viewModel: CardGameViewModel,
    ): { from: { x: number; y: number }; to: { x: number; y: number; angle: number } } | null {
        const from = this.getEffectSourcePoint(effect, viewModel);
        const to = this.getEffectDestinationPoint(effect, viewModel);
        if (!from || !to) {
            return null;
        }

        return { from, to };
    }

    private getEffectSourcePoint(
        effect: MoveCardEffect,
        viewModel: CardGameViewModel,
    ): { x: number; y: number } | null {
        if (effect.fromOwnerId) {
            const playerIndex = viewModel.players.findIndex((p) => p.id === effect.fromOwnerId);
            if (
                playerIndex === 0 &&
                this.localPlayerDeckPoint &&
                (viewModel.players[0]?.hand.length ?? 0) === 0
            ) {
                return this.localPlayerDeckPoint;
            }

            return this.getPlayerHandPoint(viewModel, effect.fromOwnerId, effect.fromIndex ?? 0);
        }

        if (effect.fromPileId === 'stock' || effect.fromPileId === 'draw') {
            if (this.stockPilePoint) {
                return this.stockPilePoint;
            }

            return { x: PLAYER_GAME_WIDTH / 2, y: playerPovZones.gameInfoY + 60 };
        }

        if ((viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
            return this.getTableCardPoint(viewModel, effect.fromIndex ?? 0);
        }

        return { x: PLAYER_GAME_WIDTH / 2, y: playerPovZones.stockTrumpY };
    }

    private getEffectDestinationPoint(
        effect: MoveCardEffect,
        viewModel: CardGameViewModel,
    ): { x: number; y: number; angle: number } | null {
        if (effect.toOwnerId) {
            const point = this.getPlayerHandPoint(viewModel, effect.toOwnerId, effect.toIndex ?? 0);
            return point ? { ...point, angle: 0 } : null;
        }

        if ((viewModel.tablePileIds ?? []).includes(effect.toPileId)) {
            if (viewModel.tablePresentation === 'trick-seats' && effect.fromOwnerId) {
                const alreadyOnTable = viewModel.tableCards.some(
                    (c) =>
                        c.id === effect.card.id ||
                        (c.sourceCardIds ?? []).includes(effect.card.id),
                );
                if (!alreadyOnTable) {
                    return getTrickCardPoint(
                        getPlayerPovSeatSide(viewModel, effect.fromOwnerId),
                    );
                }
            }
            return this.getTableCardPoint(
                viewModel,
                effect.toIndex ?? viewModel.tableCards.length - 1,
                effect.card.id,
            );
        }

        if (effect.toPileId === 'stock' || effect.toPileId === 'draw') {
            const stockPoint = getStockTrumpPoint();
            return { x: stockPoint.x + 20, y: stockPoint.y - 2, angle: 0 };
        }

        return null;
    }

    private getPlayerHandPoint(
        viewModel: CardGameViewModel,
        playerId: string,
        index: number,
    ): { x: number; y: number; angle: number } | null {
        const playerIndex = viewModel.players.findIndex((player) => player.id === playerId);
        if (playerIndex < 0) {
            return null;
        }

        if (playerIndex === 0) {
            const cards = viewModel.players[0]?.hand ?? [];
            return getHandCardPoint({
                cardCount: cards.length,
                index,
            });
        }

        const positions = getOpponentSeatLayouts(Math.max(viewModel.players.length - 1, 0));
        const opponentPosition = positions[playerIndex - 1];
        if (!opponentPosition) {
            return null;
        }

        const player = viewModel.players[playerIndex];
        const fanCount = Math.min(parsePlayerCounters(player?.metaLabel ?? '').cards, 8);
        const { cx, cy } = getOpponentFanCenter(opponentPosition, fanCount);
        const pt = getOpponentFanCardPoint(fanCount, index, cx, cy, opponentPosition.side as 'top' | 'left' | 'right');
        return { x: pt.x, y: pt.y, angle: pt.angle };
    }

    private getTableCardPoint(
        viewModel: CardGameViewModel,
        index: number,
        cardId?: string,
    ): { x: number; y: number; angle: number } {
        const tableCard = cardId
            ? viewModel.tableCards.find(
                  (card) => card.id === cardId || (card.sourceCardIds ?? []).includes(cardId),
              )
            : viewModel.tableCards[index];
        if (tableCard && viewModel.tablePresentation === 'trick-seats') {
            return this.getTrickCardPointForCard(tableCard, viewModel);
        }
        if (tableCard && viewModel.tablePresentation === 'battle-formation') {
            return this.getWarCardPoint(tableCard, viewModel);
        }
        return getTableRowCardPoint({
            cardCount: viewModel.tableCards.length,
            index,
        });
    }

    private getWarCardPoint(
        card: { id: string; playerId?: string; isFaceUp?: boolean },
        viewModel: CardGameViewModel,
    ): { x: number; y: number; angle: number } {
        const localPlayerId = viewModel.players[0]?.id ?? '';
        let fdIndex = 0;
        for (const c of viewModel.tableCards) {
            if (c.id === card.id) break;
            if (c.playerId === card.playerId && !c.isFaceUp) fdIndex++;
        }
        const side = card.playerId === localPlayerId ? 'bottom' : 'top';
        return getWarBattleCardPoint(side, card.isFaceUp === true, fdIndex);
    }

    private animateMoveGhost(
        effect: MoveCardEffect,
        from: { x: number; y: number },
        to: { x: number; y: number; angle: number },
        profile: EffectAnimProfile,
        delay: number,
        ghostSize: { width: number; height: number },
        onComplete?: () => void,
    ): void {
        const shouldFlip = effect.card.isFaceUp && effect.fromFaceUp === false;
        const textureKey =
            effect.card.isFaceUp && !shouldFlip
                ? getCardFaceTextureKey(effect.card.id, this.activeCardSkinId, 'compact')
                : this.getActiveBackTextureKey();

        const ghost = this.animationLayer.createGhostCard({
            textureKey,
            x: from.x,
            y: from.y,
            width: ghostSize.width,
            height: ghostSize.height,
            alpha: 0.94,
            depth: 90,
        });

        const baseScaleX = ghost.image.scaleX;
        const baseScaleY = ghost.image.scaleY;

        this.tweens.add({
            targets: ghost.image,
            x: to.x,
            y: to.y,
            angle: to.angle,
            scaleX: baseScaleX * profile.peakScale,
            scaleY: baseScaleY * profile.peakScale,
            alpha: 0.96,
            duration: profile.duration,
            delay,
            ease: profile.ease,
            onComplete: () => {
                ghost.image.setDisplaySize(ghostSize.width, ghostSize.height);
                sfxPlayer.play(effect.reason);
                if (shouldFlip) {
                    this.animateCardFlip(ghost.image, effect, ghostSize, () => {
                        ghost.destroy();
                        onComplete?.();
                    });
                } else {
                    this.tweens.add({
                        targets: ghost.image,
                        alpha: 0,
                        duration: 80,
                        delay: 50,
                        onComplete: () => {
                            ghost.destroy();
                            onComplete?.();
                        },
                    });
                }
            },
        });
    }

    private animateCardFlip(
        image: Phaser.GameObjects.Image,
        effect: MoveCardEffect,
        size: { width: number; height: number },
        onComplete: () => void,
    ): void {
        this.tweens.add({
            targets: image,
            displayWidth: 2,
            duration: 110,
            ease: 'Sine.easeIn',
            onComplete: () => {
                sfxPlayer.play('flip');
                image.setTexture(
                    getCardFaceTextureKey(effect.card.id, this.activeCardSkinId, 'compact'),
                );
                image.displayWidth = 2;
                image.displayHeight = size.height;
                this.tweens.add({
                    targets: image,
                    displayWidth: size.width,
                    duration: 140,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        image.setDisplaySize(size.width, size.height);
                        this.tweens.add({
                            targets: image,
                            alpha: 0,
                            duration: 80,
                            delay: 100,
                            onComplete,
                        });
                    },
                });
            },
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

        if (status.type === 'connected') {
            return;
        }

        const isClosed = status.type === 'closed';
        const panelColor = isClosed ? 0x42231f : 0x4b3216;
        const strokeColor = isClosed ? 0xff9b8d : GOLD;
        const textColor = isClosed ? '#ffb6aa' : '#ffd166';
        this.renderLayer.add(
            createRoundedPanel(
                this,
                PLAYER_GAME_WIDTH / 2,
                612,
                PLAYER_GAME_WIDTH - 44,
                42,
                12,
                panelColor,
                0.94,
                strokeColor,
                1,
                0.6,
            ),
        );
        this.renderLayer.add(
            this.add
                .text(PLAYER_GAME_WIDTH / 2, 612, status.message, {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    fontStyle: '700',
                    color: textColor,
                    align: 'center',
                    wordWrap: { width: PLAYER_GAME_WIDTH - 72 },
                })
                .setOrigin(0.5),
        );
    }

    private getSessionStatus(): PlayerSessionStatus | null {
        const maybeStatusSession = this.session as CardGameSession<CardGameViewModel> & {
            getStatus?: () => PlayerSessionStatus;
        };
        return maybeStatusSession.getStatus?.() ?? null;
    }

    private ensureCardTextures(viewModel: CardGameViewModel): void {
        if (
            this.activeDeckId === viewModel.deckId &&
            this.activeCardSkinId === viewModel.cardSkinId
        ) {
            return;
        }

        const deckDefinition =
            supportedDeckDefinitions[viewModel.deckId as keyof typeof supportedDeckDefinitions];
        if (!deckDefinition) {
            return;
        }

        const skin = getCardSkinById(viewModel.cardSkinId);
        ensureDeckTextures(this, deckDefinition, skin);
        this.activeDeckId = deckDefinition.id;
        this.activeCardSkinId = skin.id;
    }

    private getTextureForCard(
        card: CardGameViewCard | CardGameViewTableCard,
        variant: 'compact' | 'showcase',
    ): string {
        if (!card.isFaceUp) {
            return this.getActiveBackTextureKey();
        }

        return getCardFaceTextureKey(card.id, this.activeCardSkinId, variant);
    }

    private getActiveBackTextureKey(): string {
        return getCardBackTextureKey(
            this.activeDeckId || 'french',
            this.activeCardSkinId || 'vintage-european',
        );
    }

    private setCardDisplaySize(
        image: Phaser.GameObjects.Image,
        width: number,
        height: number,
    ): void {
        image.setDisplaySize(width, height);
        image.setData('cardDisplaySize', {
            width,
            height,
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
    strokeAlpha = 0,
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
