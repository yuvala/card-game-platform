import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import playersData from '../../../data/players.json';
import { supportedDeckDefinitions } from '@engine/engine/cards/deckDefinitions';
import {
    resolveDeckId,
    resolvePlayerCount,
    type AnyGameCatalogEntry,
} from '@engine/engine/game/catalog';
import {
    gameCatalogEntries,
    getGameCatalogEntryById,
    DEFAULT_GAME_ID,
} from '@engine/games/catalog';
import type { SupportedDeckId } from '@engine/engine/cards/deckDefinitions';

export type { GameSelection, ActiveTableSummary } from './gamePanelTypes';

const seedPlayerNames = playersData.players.map((p) => p.playerName);

function buildPlayerNames(playerCount: number): string[] {
    return Array.from(
        { length: playerCount },
        (_, i) => seedPlayerNames[i] ?? 'Player ' + String(i + 1),
    );
}

function resolveGame(gameId: string | null | undefined): AnyGameCatalogEntry {
    return (
        getGameCatalogEntryById(gameId) ??
        getGameCatalogEntryById(DEFAULT_GAME_ID) ??
        gameCatalogEntries[0]
    );
}

function getPlayerCountOptions(entry: AnyGameCatalogEntry): number[] {
    if (entry.playerCountOptions && entry.playerCountOptions.length > 0) {
        return entry.playerCountOptions.slice().sort((a, b) => a - b);
    }
    return Array.from(
        { length: entry.maxPlayers - entry.minPlayers + 1 },
        (_, i) => entry.minPlayers + i,
    );
}

function formatPlayerCountMeta(entry: AnyGameCatalogEntry): string {
    const options = getPlayerCountOptions(entry);
    if (options.length <= 1) return String(options[0] ?? entry.defaultPlayerCount) + ' player';
    if (entry.playerCountOptions && entry.playerCountOptions.length > 0)
        return options.join(', ') + ' players';
    return String(entry.minPlayers) + '-' + String(entry.maxPlayers) + ' players';
}

function normalizeSelection(
    entries: readonly AnyGameCatalogEntry[],
    sel: GameSelection,
): GameSelection {
    const game = resolveGame(sel.gameId);
    return {
        gameId: game.id,
        playerCount: resolvePlayerCount(game, sel.playerCount, game.maxPlayers),
        deckId: resolveDeckId(game, sel.deckId),
    };
}

export function GamePanel() {
    const [searchParams] = useSearchParams();
    const shouldAutostart =
        searchParams.get('autostart') === '1';

    const initialSelection = normalizeSelection(gameCatalogEntries, {
        gameId: resolveGame(searchParams.get('game')).id,
        playerCount: Number(searchParams.get('players') ?? 0),
        deckId: (searchParams.get('deck') ?? '') as SupportedDeckId,
    });

    const [isOpen, setIsOpen] = useState(!shouldAutostart);
    const [selection, setSelection] = useState<GameSelection>(initialSelection);
    const [activeTable, setActiveTable] = useState<ActiveTableSummary | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            setActiveTable((e as CustomEvent<ActiveTableSummary | null>).detail);
        };
        globalThis.addEventListener('game-panel:active', handler);
        return () => globalThis.removeEventListener('game-panel:active', handler);
    }, []);

    function updateSelection(next: GameSelection): void {
        const normalized = normalizeSelection(gameCatalogEntries, next);
        setSelection(normalized);
        globalThis.dispatchEvent(
            new CustomEvent('game-panel:selection-change', { detail: normalized }),
        );
    }

    function handleStart(): void {
        setIsOpen(false);
        globalThis.dispatchEvent(new CustomEvent('game-panel:start', { detail: selection }));
    }

    const selectedGame = resolveGame(selection.gameId);
    const playerNames = buildPlayerNames(selection.playerCount);
    const startLabel = activeTable ? 'Start New Table' : 'Start Game';
    const summaryLabel = activeTable ? 'Live Table' : 'Ready';
    const summaryText = activeTable
        ? activeTable.gameLabel +
          ' | ' +
          String(activeTable.playerNames.length) +
          ' players | ' +
          activeTable.deckLabel
        : selectedGame.label +
          ' | ' +
          String(selection.playerCount) +
          ' players | ' +
          supportedDeckDefinitions[selection.deckId].name;
    const helperText = activeTable
        ? 'Changing the setup will replace the current table when you press Start New Table.'
        : 'Choose a ruleset, a seat count, and a deck. Start Game deals the opening hand immediately.';
    const toggleLabel = activeTable ? 'Change Game' : 'Create Game';

    return (
        <div className="appSetupMount">
            <div className={`appSetupDock${isOpen ? ' is-open' : ''}`}>
                <button
                    type="button"
                    className="appSetupToggle"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen(true)}
                >
                    {toggleLabel}
                </button>
                <button
                    type="button"
                    className="appSetupBackdrop"
                    aria-label="Close Create Game panel"
                    tabIndex={isOpen ? 0 : -1}
                    onClick={() => setIsOpen(false)}
                />
                <section
                    className="appSetup"
                    aria-label="Create Game"
                    aria-hidden={!isOpen}
                    inert={!isOpen ? ('' as unknown as boolean) : undefined}
                >
                    <div className="appSetupHeader">
                        <div>
                            <p className="appSetupEyebrow">Create Game</p>
                            <h2 className="appSetupTitle">Open a new card table</h2>
                            <p className="appSetupCopy">{helperText}</p>
                        </div>
                        <div className="appSetupSummary" aria-live="polite">
                            <p className="appSetupSummaryLabel">{summaryLabel}</p>
                            <p className="appSetupSummaryValue">{summaryText}</p>
                        </div>
                        <button
                            type="button"
                            className="appSetupClose"
                            aria-label="Close Create Game panel"
                            onClick={() => setIsOpen(false)}
                        >
                            Close
                        </button>
                    </div>

                    <div className="appSetupSection">
                        <p className="appSetupSectionLabel">Game</p>
                        <div className="appGameChoices" role="list">
                            {gameCatalogEntries.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={`appGameChoice${entry.id === selection.gameId ? ' is-selected' : ''}`}
                                    aria-pressed={entry.id === selection.gameId}
                                    onClick={() =>
                                        updateSelection({
                                            ...selection,
                                            gameId: entry.id,
                                            deckId: entry.defaultDeckId,
                                        })
                                    }
                                >
                                    <span className="appGameChoiceLabel">{entry.label}</span>
                                    <span className="appGameChoiceMeta">
                                        {formatPlayerCountMeta(entry)}
                                    </span>
                                    <span className="appGameChoiceDescription">
                                        {entry.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="appSetupRow">
                        <div className="appSetupSection">
                            <p className="appSetupSectionLabel">Players</p>
                            <div className="appSegmentedControl" role="list">
                                {getPlayerCountOptions(selectedGame).map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        className={`appSegmentButton${count === selection.playerCount ? ' is-selected' : ''}`}
                                        aria-pressed={count === selection.playerCount}
                                        onClick={() =>
                                            updateSelection({ ...selection, playerCount: count })
                                        }
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                            <p className="appSetupHint">
                                Seed players are reused first, then extra seats get generated
                                placeholder names.
                            </p>
                        </div>
                        <div className="appSetupSection">
                            <p className="appSetupSectionLabel">Deck</p>
                            <div className="appSegmentedControl" role="list">
                                {selectedGame.supportedDeckIds.map((deckId) => (
                                    <button
                                        key={deckId}
                                        type="button"
                                        className={`appSegmentButton${deckId === selection.deckId ? ' is-selected' : ''}`}
                                        aria-pressed={deckId === selection.deckId}
                                        onClick={() =>
                                            updateSelection({
                                                ...selection,
                                                deckId: deckId as SupportedDeckId,
                                            })
                                        }
                                    >
                                        {supportedDeckDefinitions[deckId].name}
                                    </button>
                                ))}
                            </div>
                            <p className="appSetupHint">
                                Deck availability is driven by the selected game&apos;s catalog
                                entry.
                            </p>
                        </div>
                    </div>

                    <div className="appSetupSection">
                        <p className="appSetupSectionLabel">Players at the table</p>
                        <div className="appPlayerPreview" aria-live="polite">
                            {playerNames.map((name) => (
                                <span key={name} className="appPlayerChip">
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="appSetupActions">
                        <button
                            type="button"
                            className="appPrimaryButton"
                            onClick={handleStart}
                        >
                            {startLabel}
                        </button>
                        <p className="appSetupHint">
                            {`Current selection: ${selectedGame.label} | ${String(selection.playerCount)} players | ${supportedDeckDefinitions[selection.deckId].name}`}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
