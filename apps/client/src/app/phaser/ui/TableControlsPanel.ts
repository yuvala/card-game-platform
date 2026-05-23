import type { CardGameSession } from '@engine/engine/game/session';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';

export class TableControlsPanel {
    readonly element: HTMLElement;

    private readonly session: CardGameSession<any>;
    private readonly viewerId: string | null;
    private readonly subscription: { unsubscribe(): void };

    private phaseBadge!: HTMLElement;
    private roundText!: HTMLElement;
    private deckText!: HTMLElement;
    private scoreText!: HTMLElement;
    private outcomeTitleText!: HTMLElement;
    private outcomeDetailText!: HTMLElement;
    private actionHintText!: HTMLElement;
    private statusText!: HTMLElement;
    private btnStart!: HTMLButtonElement;
    private btnPlay!: HTMLButtonElement;
    private btnAutoRun!: HTMLButtonElement;
    private btnRestart!: HTMLButtonElement;

    private isAutoRunEnabled = false;
    private pendingAutoRun?: ReturnType<typeof setTimeout>;

    constructor(session: CardGameSession<any>, viewerId?: string | null) {
        this.session = session;
        this.viewerId = viewerId ?? null;
        this.element = this.buildDOM();

        this.subscription = session.subscribe(() => {
            this.sync(session.getViewModel(this.viewerId));
        });
        this.sync(session.getViewModel(this.viewerId));
    }

    destroy(): void {
        this.subscription.unsubscribe();
        clearTimeout(this.pendingAutoRun);
        this.element.remove();
    }

    private buildDOM(): HTMLElement {
        const root = document.createElement('div');
        root.className = 'tableControls';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'tableControlsEyebrow';
        eyebrow.textContent = 'TABLE CONTROLS';
        root.appendChild(eyebrow);

        this.phaseBadge = document.createElement('p');
        this.phaseBadge.className = 'tableControlsPhase';
        root.appendChild(this.phaseBadge);

        this.roundText = document.createElement('p');
        this.roundText.className = 'tableControlsRound';
        root.appendChild(this.roundText);

        this.deckText = document.createElement('p');
        this.deckText.className = 'tableControlsDeck';
        root.appendChild(this.deckText);

        const drawerHint = document.createElement('p');
        drawerHint.className = 'tableControlsDrawerHint';
        drawerHint.textContent = 'Use the Create Game drawer to change the ruleset, seats, or deck.';
        root.appendChild(drawerHint);

        this.scoreText = document.createElement('p');
        this.scoreText.className = 'tableControlsScore';
        root.appendChild(this.scoreText);

        this.outcomeTitleText = document.createElement('p');
        this.outcomeTitleText.className = 'tableControlsOutcomeTitle';
        this.outcomeTitleText.hidden = true;
        root.appendChild(this.outcomeTitleText);

        this.outcomeDetailText = document.createElement('p');
        this.outcomeDetailText.className = 'tableControlsOutcomeDetail';
        this.outcomeDetailText.hidden = true;
        root.appendChild(this.outcomeDetailText);

        const actions = document.createElement('div');
        actions.className = 'tableControlsActions';

        this.btnStart = this.makeButton('Deal Cards', () => {
            this.session.send({ type: 'START' });
        });

        const playRow = document.createElement('div');
        playRow.className = 'tableControlsPlayRow';

        this.btnPlay = this.makeButton('Play Card', () => {
            this.session.send({ type: 'PLAY_CARD' });
        });

        this.btnAutoRun = this.makeButton('▶', () => { this.toggleAutoRun(); });
        this.btnAutoRun.classList.add('tableControlsBtnAuto');

        playRow.appendChild(this.btnPlay);
        playRow.appendChild(this.btnAutoRun);

        this.btnRestart = this.makeButton('Restart', () => {
            this.stopAutoRun();
            this.session.send({ type: 'RESTART' });
        });

        actions.appendChild(this.btnStart);
        actions.appendChild(playRow);
        actions.appendChild(this.btnRestart);
        root.appendChild(actions);

        this.actionHintText = document.createElement('p');
        this.actionHintText.className = 'tableControlsActionHint';
        this.actionHintText.hidden = true;
        root.appendChild(this.actionHintText);

        const statusBox = document.createElement('div');
        statusBox.className = 'tableControlsStatusBox';

        const statusEyebrow = document.createElement('p');
        statusEyebrow.className = 'tableControlsEyebrow';
        statusEyebrow.textContent = 'STATUS';
        statusBox.appendChild(statusEyebrow);

        this.statusText = document.createElement('p');
        this.statusText.className = 'tableControlsStatusText';
        statusBox.appendChild(this.statusText);

        root.appendChild(statusBox);

        return root;
    }

    private makeButton(label: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'tableControlsBtn';
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        return btn;
    }

    private sync(viewModel: CardGameViewModel): void {
        this.phaseBadge.textContent = viewModel.phaseLabel;
        this.roundText.textContent = viewModel.roundLabel;
        this.deckText.textContent = viewModel.deckLabel;
        setLines(this.scoreText, viewModel.scoreLines);
        setLines(this.statusText, viewModel.statusText.split('\n'));

        this.syncOutcome(viewModel);
        this.syncPrimaryAction(viewModel);
        setButtonEnabled(this.btnStart, viewModel.controls.canStart);
        setButtonEnabled(this.btnPlay, viewModel.controls.canPlay);
        setButtonEnabled(this.btnRestart, viewModel.controls.canRestart);
        this.syncAutoRun(viewModel);
    }

    private syncOutcome(viewModel: CardGameViewModel): void {
        const outcome = viewModel.outcome;
        this.outcomeTitleText.hidden = !outcome;
        this.outcomeDetailText.hidden = !outcome;
        if (outcome) {
            this.outcomeTitleText.textContent = outcome.title;
            this.outcomeDetailText.textContent = outcome.detail;
        }
    }

    private syncPrimaryAction(viewModel: CardGameViewModel): void {
        const action = viewModel.primaryAction;
        this.btnPlay.textContent = action?.label ?? 'Play Card';
        this.actionHintText.hidden = !action?.hint;
        if (action?.hint) {
            this.actionHintText.textContent = action.hint;
        }
    }

    private toggleAutoRun(): void {
        if (this.isAutoRunEnabled) {
            this.stopAutoRun();
            this.sync(this.session.getViewModel(this.viewerId));
            return;
        }
        this.isAutoRunEnabled = true;
        this.sync(this.session.getViewModel(this.viewerId));
    }

    private stopAutoRun(): void {
        this.isAutoRunEnabled = false;
        clearTimeout(this.pendingAutoRun);
        this.pendingAutoRun = undefined;
    }

    private syncAutoRun(viewModel: CardGameViewModel): void {
        const canStep = viewModel.controls.canStart || viewModel.controls.canPlay;
        if (viewModel.outcome || viewModel.controls.canRestart) {
            this.stopAutoRun();
        }

        this.btnAutoRun.textContent = this.isAutoRunEnabled ? '■' : '▶';
        setButtonEnabled(this.btnAutoRun, this.isAutoRunEnabled || canStep);

        if (!this.isAutoRunEnabled || !canStep || this.pendingAutoRun !== undefined) {
            return;
        }

        this.pendingAutoRun = setTimeout(() => {
            this.pendingAutoRun = undefined;
            const vm = this.session.getViewModel(this.viewerId);
            if (!this.isAutoRunEnabled) return;
            if (vm.controls.canStart) {
                this.session.send({ type: 'START' });
                return;
            }
            if (vm.controls.canPlay) {
                const action = vm.primaryAction;
                if (action?.eventType === 'SELECT_CARD') {
                    const activePlayer = vm.players.find((p) => p.canInteract);
                    const card = activePlayer?.hand[0];
                    if (card) {
                        this.session.send({ type: 'SELECT_CARD', cardId: card.id });
                    }
                } else {
                    this.session.send({ type: 'PLAY_CARD' });
                }
            }
        }, 420);
    }
}

function setLines(el: HTMLElement, lines: string[]): void {
    el.replaceChildren();
    lines.forEach((line, i) => {
        if (i > 0) el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(line));
    });
}

function setButtonEnabled(btn: HTMLButtonElement, enabled: boolean): void {
    btn.disabled = !enabled;
}
