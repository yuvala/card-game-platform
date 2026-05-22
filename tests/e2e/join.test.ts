import { test, expect, type Page } from '@playwright/test';

const WS_URL = 'ws://localhost:8787';
const PLAYERS = JSON.stringify(['Alice', 'Bob']);

function playerUrl(nickname: string) {
    return `/player?game=war-lite&wsUrl=${encodeURIComponent(WS_URL)}&players=${encodeURIComponent(PLAYERS)}&nickname=${encodeURIComponent(nickname)}`;
}

async function waitForGameReady(page: Page) {
    // The loading spinner disappears and the canvas appears when the game is ready
    await expect(page.locator('#player-root canvas')).toBeVisible({ timeout: 15000 });
}

test('two players can join the same game session', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    // Capture console errors
    const errors: string[] = [];
    page1.on('console', m => { if (m.type() === 'error') errors.push(`P1: ${m.text()}`); });
    page2.on('console', m => { if (m.type() === 'error') errors.push(`P2: ${m.text()}`); });

    // Both players navigate to the game
    await Promise.all([
        page1.goto(playerUrl('Alice')),
        page2.goto(playerUrl('Bob')),
    ]);

    // Both should reach the game canvas (not stuck on loading)
    await Promise.all([
        waitForGameReady(page1),
        waitForGameReady(page2),
    ]);

    // Neither player should see an error state
    await expect(page1.locator('.playerState--error')).not.toBeVisible();
    await expect(page2.locator('.playerState--error')).not.toBeVisible();

    // Both players should see a player select dropdown with 2 players
    await expect(page1.locator('#player-viewer-select option')).toHaveCount(2);
    await expect(page2.locator('#player-viewer-select option')).toHaveCount(2);

    // Filter out Phaser asset-loading warnings that are unrelated to the join flow
    const joinErrors = errors.filter(e => !e.includes('Failed to process file'));
    expect(joinErrors).toHaveLength(0);

    await ctx1.close();
    await ctx2.close();
});
