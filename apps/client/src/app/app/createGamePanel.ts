import type { SupportedDeckId } from '@engine/engine/cards/deckDefinitions';
import {
    resolveDeckId,
    resolvePlayerCount,
    type AnyGameCatalogEntry,
} from '@engine/engine/game/catalog';

export interface GameSelection {
    gameId: string;
    playerCount: number;
    deckId: SupportedDeckId;
}

export interface ActiveTableSummary {
    gameLabel: string;
    deckLabel: string;
    playerNames: string[];
}

interface CreateGamePanelOptions {
    container: HTMLElement;
    entries: readonly AnyGameCatalogEntry[];
    initialSelection: GameSelection;
    initialOpen?: boolean;
    getDeckLabel: (deckId: SupportedDeckId) => string;
    getPlayerNames: (playerCount: number) => string[];
    onSelectionChange?: (selection: GameSelection) => void;
    onStart: (selection: GameSelection) => void;
}

export interface CreateGamePanelController {
    getSelection(): GameSelection;
    updateActiveTable(summary: ActiveTableSummary | null): void;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function createGamePanel(options: CreateGamePanelOptions): CreateGamePanelController {
    const { container, entries, getDeckLabel, getPlayerNames, onStart } = options;
    if (entries.length === 0) {
        throw new Error('Cannot render Create Game panel without registered games.');
    }

    let activeTableSummary: ActiveTableSummary | null = null;
    let isOpen = options.initialOpen ?? true;
    let selection = normalizeSelection(entries, options.initialSelection);

    function render(): void {
        const selectedGame = getSelectedGame(entries, selection.gameId);
        const playerNames = getPlayerNames(selection.playerCount);
        const startLabel = activeTableSummary ? 'Start New Table' : 'Start Game';
        const summaryLabel = activeTableSummary ? 'Live Table' : 'Ready';
        const summaryText = activeTableSummary
            ? activeTableSummary.gameLabel +
              ' | ' +
              String(activeTableSummary.playerNames.length) +
              ' players | ' +
              activeTableSummary.deckLabel
            : selectedGame.label +
              ' | ' +
              String(selection.playerCount) +
              ' players | ' +
              getDeckLabel(selection.deckId);
        const helperText = activeTableSummary
            ? 'Changing the setup will replace the current table when you press Start New Table.'
            : 'Choose a ruleset, a seat count, and a deck. Start Game deals the opening hand immediately.';
        const toggleLabel = activeTableSummary ? 'Change Game' : 'Create Game';

        container.innerHTML = `
            <div class="appSetupDock${isOpen ? ' is-open' : ''}">
                <button
                    type="button"
                    class="appSetupToggle"
                    data-action="toggle-setup"
                    aria-expanded="${String(isOpen)}"
                >
                    ${escapeHtml(toggleLabel)}
                </button>
                <button
                    type="button"
                    class="appSetupBackdrop"
                    data-action="close-setup"
                    aria-label="Close Create Game panel"
                    tabindex="${isOpen ? '0' : '-1'}"
                ></button>
            <section class="appSetup" aria-label="Create Game" aria-hidden="${String(!isOpen)}" ${isOpen ? '' : 'inert'}>
                <div class="appSetupHeader">
                    <div>
                        <p class="appSetupEyebrow">Create Game</p>
                        <h2 class="appSetupTitle">Open a new card table</h2>
                        <p class="appSetupCopy">${escapeHtml(helperText)}</p>
                    </div>
                    <div class="appSetupSummary" aria-live="polite">
                        <p class="appSetupSummaryLabel">${escapeHtml(summaryLabel)}</p>
                        <p class="appSetupSummaryValue">${escapeHtml(summaryText)}</p>
                    </div>
                    <button type="button" class="appSetupClose" data-action="close-setup" aria-label="Close Create Game panel">Close</button>
                </div>
                <div class="appSetupSection">
                    <p class="appSetupSectionLabel">Game</p>
                    <div class="appGameChoices" role="list">
                        ${entries
                            .map((entry) => {
                                const isSelected = entry.id === selection.gameId;
                                return `
                                <button
                                    type="button"
                                    class="appGameChoice${isSelected ? ' is-selected' : ''}"
                                    data-game-id="${escapeHtml(entry.id)}"
                                    aria-pressed="${String(isSelected)}"
                                >
                                    <span class="appGameChoiceLabel">${escapeHtml(entry.label)}</span>
                                    <span class="appGameChoiceMeta">${escapeHtml(formatPlayerCountMeta(entry))}</span>
                                    <span class="appGameChoiceDescription">${escapeHtml(entry.description)}</span>
                                </button>
                            `;
                            })
                            .join('')}
                    </div>
                </div>
                <div class="appSetupRow">
                    <div class="appSetupSection">
                        <p class="appSetupSectionLabel">Players</p>
                        <div class="appSegmentedControl" role="list">
                            ${getPlayerCountOptions(selectedGame)
                                .map((count) => {
                                    const isSelected = count === selection.playerCount;
                                    return `
                                    <button
                                        type="button"
                                        class="appSegmentButton${isSelected ? ' is-selected' : ''}"
                                        data-player-count="${String(count)}"
                                        aria-pressed="${String(isSelected)}"
                                    >
                                        ${String(count)}
                                    </button>
                                `;
                                })
                                .join('')}
                        </div>
                        <p class="appSetupHint">Seed players are reused first, then extra seats get generated placeholder names.</p>
                    </div>
                    <div class="appSetupSection">
                        <p class="appSetupSectionLabel">Deck</p>
                        <div class="appSegmentedControl" role="list">
                            ${selectedGame.supportedDeckIds
                                .map((deckId) => {
                                    const isSelected = deckId === selection.deckId;
                                    return `
                                    <button
                                        type="button"
                                        class="appSegmentButton${isSelected ? ' is-selected' : ''}"
                                        data-deck-id="${escapeHtml(deckId)}"
                                        aria-pressed="${String(isSelected)}"
                                    >
                                        ${escapeHtml(getDeckLabel(deckId))}
                                    </button>
                                `;
                                })
                                .join('')}
                        </div>
                        <p class="appSetupHint">Deck availability is driven by the selected game's catalog entry.</p>
                    </div>
                </div>
                <div class="appSetupSection">
                    <p class="appSetupSectionLabel">Players at the table</p>
                    <div class="appPlayerPreview" aria-live="polite">
                        ${playerNames
                            .map((playerName) => {
                                return `<span class="appPlayerChip">${escapeHtml(playerName)}</span>`;
                            })
                            .join('')}
                    </div>
                </div>
                <div class="appSetupActions">
                    <button type="button" class="appPrimaryButton" data-action="start-game">${escapeHtml(startLabel)}</button>
                    <p class="appSetupHint">Current selection: ${escapeHtml(
                        selectedGame.label +
                            ' | ' +
                            String(selection.playerCount) +
                            ' players | ' +
                            getDeckLabel(selection.deckId),
                    )}</p>
                </div>
            </section>
            </div>
        `;

        container
            .querySelectorAll<HTMLElement>("[data-action='toggle-setup']")
            .forEach((element) => {
                element.addEventListener('click', () => {
                    isOpen = !isOpen;
                    render();
                });
            });

        container
            .querySelectorAll<HTMLElement>("[data-action='close-setup']")
            .forEach((element) => {
                element.addEventListener('click', () => {
                    isOpen = false;
                    render();
                });
            });

        container.querySelectorAll<HTMLElement>('[data-game-id]').forEach((element) => {
            element.addEventListener('click', () => {
                const nextGameId = element.dataset.gameId;
                if (!nextGameId) {
                    return;
                }

                const nextGame = getSelectedGame(entries, nextGameId);
                selection = normalizeSelection(entries, {
                    ...selection,
                    gameId: nextGame.id,
                    deckId: nextGame.defaultDeckId,
                });
                options.onSelectionChange?.(selection);
                render();
            });
        });

        container.querySelectorAll<HTMLElement>('[data-player-count]').forEach((element) => {
            element.addEventListener('click', () => {
                const nextPlayerCount = Number(element.dataset.playerCount);
                selection = normalizeSelection(entries, {
                    ...selection,
                    playerCount: nextPlayerCount,
                });
                options.onSelectionChange?.(selection);
                render();
            });
        });

        container.querySelectorAll<HTMLElement>('[data-deck-id]').forEach((element) => {
            element.addEventListener('click', () => {
                const nextDeckId = element.dataset.deckId as SupportedDeckId | undefined;
                if (!nextDeckId) {
                    return;
                }

                selection = normalizeSelection(entries, {
                    ...selection,
                    deckId: nextDeckId,
                });
                options.onSelectionChange?.(selection);
                render();
            });
        });

        container
            .querySelector<HTMLElement>("[data-action='start-game']")
            ?.addEventListener('click', () => {
                isOpen = false;
                onStart(selection);
            });
    }

    render();

    return {
        getSelection() {
            return selection;
        },
        updateActiveTable(summary) {
            activeTableSummary = summary;
            render();
        },
    };
}

function getSelectedGame(
    entries: readonly AnyGameCatalogEntry[],
    gameId: string,
): AnyGameCatalogEntry {
    return entries.find((entry) => entry.id === gameId) ?? entries[0];
}

function getPlayerCountOptions(entry: AnyGameCatalogEntry): number[] {
    if (entry.playerCountOptions && entry.playerCountOptions.length > 0) {
        return entry.playerCountOptions.slice().sort((left, right) => left - right);
    }

    return Array.from(
        { length: entry.maxPlayers - entry.minPlayers + 1 },
        (_, index) => entry.minPlayers + index,
    );
}

function formatPlayerCountMeta(entry: AnyGameCatalogEntry): string {
    const playerCountOptions = getPlayerCountOptions(entry);
    if (playerCountOptions.length <= 1) {
        return String(playerCountOptions[0] ?? entry.defaultPlayerCount) + ' player';
    }

    if (entry.playerCountOptions && entry.playerCountOptions.length > 0) {
        return playerCountOptions.join(', ') + ' players';
    }

    return String(entry.minPlayers) + '-' + String(entry.maxPlayers) + ' players';
}

function normalizeSelection(
    entries: readonly AnyGameCatalogEntry[],
    selection: GameSelection,
): GameSelection {
    const selectedGame = getSelectedGame(entries, selection.gameId);

    return {
        gameId: selectedGame.id,
        playerCount: resolvePlayerCount(
            selectedGame,
            selection.playerCount,
            selectedGame.maxPlayers,
        ),
        deckId: resolveDeckId(selectedGame, selection.deckId),
    };
}
