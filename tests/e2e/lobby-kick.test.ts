import { test, expect, type Page } from '@playwright/test';

async function enterLobby(page: Page, nickname: string) {
    await page.goto('/');
    await page.fill('input[placeholder="Your nickname"]', nickname);
    await page.click('button[type="submit"]');
    await expect(page.locator('h2:has-text("New Room")')).toBeVisible({ timeout: 15000 });
}

async function createRoom3Players(page: Page) {
    await page.click('button:has-text("Poker")');
    const select = page.locator('select.player-count-select');
    await expect(select).toBeVisible({ timeout: 3000 });
    await select.selectOption('3');
    await expect(page.locator('.waiting-players')).toBeVisible({ timeout: 10000 });
}

async function joinFirstRoom(page: Page) {
    const joinBtn = page.locator('.room-row button:has-text("Join")').first();
    await expect(joinBtn).toBeVisible({ timeout: 10000 });
    await joinBtn.click();
    await expect(page.locator('.waiting-players')).toBeVisible({ timeout: 10000 });
}

async function kickPlayer(page: Page, nickname: string) {
    const row = page.locator('.waiting-player', { hasText: nickname });
    await expect(row).toBeVisible({ timeout: 5000 });
    await row.locator('.waiting-player-kick').click();
}

async function expectBackInLobby(page: Page) {
    await expect(page.locator('.waiting-players')).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator('h2:has-text("New Room")')).toBeVisible({ timeout: 8000 });
}

test('kick → rejoin → kick again succeeds', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();

    const alice = await ctx1.newPage();
    const bob   = await ctx2.newPage();
    const carol = await ctx3.newPage();

    try {
        // Step 1: all three enter the lobby
        await Promise.all([
            enterLobby(alice, 'Alice'),
            enterLobby(bob,   'Bob'),
            enterLobby(carol, 'Carol'),
        ]);

        // Step 2: Alice creates a 3-player Poker room
        await createRoom3Players(alice);

        // Step 3: Carol joins
        await joinFirstRoom(carol);
        await expect(alice.locator('.waiting-player', { hasText: 'Carol' })).toBeVisible({ timeout: 8000 });

        // Step 4: Alice kicks Carol
        await kickPlayer(alice, 'Carol');
        await expect(alice.locator('.waiting-player', { hasText: 'Carol' })).not.toBeVisible({ timeout: 10000 });
        await expectBackInLobby(carol);

        // Step 5: Carol rejoins
        await joinFirstRoom(carol);
        await expect(alice.locator('.waiting-player', { hasText: 'Carol' })).toBeVisible({ timeout: 8000 });

        // Step 6: Bob joins
        await joinFirstRoom(bob);
        await expect(alice.locator('.waiting-player', { hasText: 'Bob' })).toBeVisible({ timeout: 8000 });

        // Step 7: Alice kicks Bob
        await kickPlayer(alice, 'Bob');
        await expect(alice.locator('.waiting-player', { hasText: 'Bob' })).not.toBeVisible({ timeout: 5000 });
        await expectBackInLobby(bob);

        // Step 8: Alice kicks Carol again — this was the bug
        await kickPlayer(alice, 'Carol');
        await expect(alice.locator('.waiting-player', { hasText: 'Carol' })).not.toBeVisible({ timeout: 5000 });
        await expectBackInLobby(carol);

    } finally {
        // Cleanup: Alice leaves so the room gets marked done in Supabase
        try { await alice.click('button:has-text("Leave Room")', { timeout: 3000 }); } catch {}
        await ctx1.close();
        await ctx2.close();
        await ctx3.close();
    }
});
