import * as Phaser from 'phaser';

import { drawPlayerDebugOverlay } from '../debug/playerDebugOverlay';
import type { PlayerDebugOverlay, PlayerDebugLayerFlags } from '../debug/playerDebugOverlay';
import {
    createCardAnimationLayer,
    type CardAnimationLayer,
} from '../../phaser/scenes/animations/cardAnimationLayer';
import { supportedDeckDefinitions } from '@engine/engine/cards/deckDefinitions';
import { getCardSkinById } from '@engine/engine/cards/skinPacks';
import type { CardGameSession } from '@engine/engine/game/session';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    preloadFrenchCardTextures,
} from '../../phaser/cards/CardTextureFactory';
import { preloadSpanishSheetTexture } from '../../phaser/cards/SpanishCardSpriteSheet';
import { musicPlayer } from '../../../audio/musicPlayer';

import { getPlayerPovPresentation } from '../playerPovPresentation';
import { drawBackground, drawTopBar, getTheme } from '../presenters/playerBackgroundPresenter';
import { drawGameInfo } from '../presenters/playerGameInfoPresenter';
import { drawTableCards } from '../presenters/playerTableCardPresenter';
import { drawOpponents } from '../presenters/playerOpponentPresenter';
import { drawPlayerHand } from '../presenters/playerHandPresenter';
import {
    drawBottomControls,
    drawSessionStatus,
    type PlayerSessionStatus,
} from '../presenters/playerControlsPresenter';
import {
    checkBattleFlash,
    type BattleFlashState,
} from '../presenters/playerBattleFlashPresenter';
import { presentMoveEffects, type PlayerEffectContext } from '../presenters/playerEffectPresenter';

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
    private readonly battleFlashState: BattleFlashState = { lastKey: '' };

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
            this.battleFlashState.container?.destroy(true);
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
        const cardSnapshot = this.snapshotCardPositions();
        this.renderLayer?.destroy(true);
        this.renderLayer = this.add.container(0, 0);
        this.stockPilePoint = null;

        if (this.debugOverlay) {
            this.redrawDebugOverlay();
        }

        const layer = this.renderLayer;
        const backTextureKey = this.getActiveBackTextureKey();
        const theme = getTheme(viewModel.themeId);
        const presentation = getPlayerPovPresentation(viewModel);

        drawBackground(this, layer, theme);
        drawTopBar(this, layer, viewModel, theme);
        drawGameInfo(this, layer, viewModel, presentation);
        drawOpponents(this, layer, viewModel, backTextureKey);
        this.stockPilePoint = drawTableCards(this, layer, viewModel, presentation, backTextureKey, this.activeCardSkinId);
        this.localPlayerDeckPoint = drawPlayerHand(
            this, layer, viewModel, backTextureKey, this.activeCardSkinId,
            () => this.session.send({ type: 'PLAY_CARD' }),
            (cardId) => this.session.send({ type: 'SELECT_CARD', cardId }),
        );
        drawBottomControls(this, layer, viewModel, () => this.session.send({ type: 'PLAY_CARD' }));
        drawSessionStatus(this, layer, this.getSessionStatus());
        this.presentMoveEffects(viewModel, cardSnapshot);
        checkBattleFlash(this, viewModel, this.battleFlashState);
    }

    private snapshotCardPositions(): Map<string, { x: number; y: number; displayWidth: number; displayHeight: number; angle: number; textureKey: string }> {
        const map = new Map<string, { x: number; y: number; displayWidth: number; displayHeight: number; angle: number; textureKey: string }>();
        if (!this.renderLayer) return map;
        this.renderLayer.each((obj: Phaser.GameObjects.GameObject) => {
            if (!(obj instanceof Phaser.GameObjects.Image)) return;
            const cardId = obj.getData('cardId') as string | undefined;
            if (cardId) {
                map.set(cardId, {
                    x: obj.x,
                    y: obj.y,
                    displayWidth: obj.displayWidth,
                    displayHeight: obj.displayHeight,
                    angle: obj.angle,
                    textureKey: obj.texture.key,
                });
            }
        });
        return map;
    }

    private presentMoveEffects(
        viewModel: CardGameViewModel,
        cardSnapshot: Map<string, { x: number; y: number; displayWidth: number; displayHeight: number; angle: number; textureKey: string }>,
    ): void {
        const ctx: PlayerEffectContext = {
            animationLayer: this.animationLayer,
            skinId: this.activeCardSkinId,
            backTextureKey: this.getActiveBackTextureKey(),
            localPlayerDeckPoint: this.localPlayerDeckPoint,
            stockPilePoint: this.stockPilePoint,
            cardSnapshot,
        };
        presentMoveEffects(
            this,
            viewModel,
            ctx,
            this.activeEffectBatchKey,
            (key) => { this.activeEffectBatchKey = key; },
            () => this.session.send({ type: 'ANIMATION_DONE' }),
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

    private getActiveBackTextureKey(): string {
        return getCardBackTextureKey(
            this.activeDeckId || 'french',
            this.activeCardSkinId || 'vintage-european',
        );
    }
}
