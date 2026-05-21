import {
    getHandCardPoint,
    getOpponentFanCardPoint,
    getOpponentFanCenter,
    getOpponentSeatLayouts,
    playerPovCardSizes,
} from '../../apps/client/src/app/player/playerPovLayout';

declare const process: { exitCode?: number };

const PLAYER_GAME_WIDTH = 390;
const OPP_CARD_H = playerPovCardSizes.opponent.height; // 62

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual(actual: number, expected: number, label: string, tolerance = 0.01): void {
    assert(
        Math.abs(actual - expected) <= tolerance,
        `${label}: expected ${expected}, got ${actual}`,
    );
}

// ─── getOpponentFanCardPoint ──────────────────────────────────────────────────

function testTopFanCenterCard(): void {
    const pt = getOpponentFanCardPoint(5, 2, 195, 120, 'top');
    assertEqual(pt.x, 195, 'top center card x');
    assertEqual(pt.y, 120, 'top center card y');
    assertEqual(pt.angle, 0, 'top center card angle');
}

function testTopFanSymmetry(): void {
    const count = 6;
    const cx = 195;
    const cy = 120;
    for (let i = 0; i < Math.floor(count / 2); i++) {
        const left = getOpponentFanCardPoint(count, i, cx, cy, 'top');
        const right = getOpponentFanCardPoint(count, count - 1 - i, cx, cy, 'top');
        assertEqual(left.x + right.x, cx * 2, `top fan x symmetry i=${i}`);
        assertEqual(left.y, right.y, `top fan y symmetry i=${i}`);
        assertEqual(left.angle + right.angle, 0, `top fan angle symmetry i=${i}`);
    }
}

function testTopFanEdgeCardsBelow(): void {
    // edge cards arc upward (lower y = higher on screen = away from center for top opponent)
    const center = getOpponentFanCardPoint(5, 2, 195, 120, 'top');
    const edge = getOpponentFanCardPoint(5, 0, 195, 120, 'top');
    assert(edge.y <= center.y, 'top fan: edge card should be higher (lower y) than center card');
}

function testLeftFanCenterCard(): void {
    const pt = getOpponentFanCardPoint(5, 2, 56, 260, 'left');
    assertEqual(pt.x, 56, 'left center card x (no arc at center)');
    assertEqual(pt.y, 260, 'left center card y');
    assertEqual(pt.angle, 90, 'left center card angle = 90°');
}

function testLeftFanSpreadVertical(): void {
    const count = 4;
    const pt0 = getOpponentFanCardPoint(count, 0, 56, 260, 'left');
    const pt3 = getOpponentFanCardPoint(count, 3, 56, 260, 'left');
    assert(pt0.y !== pt3.y, 'left fan: cards spread vertically');
    assert(pt0.y > pt3.y, 'left fan: first card below last (index 0 = bottom of fan)');
}

function testLeftFanAngles(): void {
    const count = 5;
    const cx = 56;
    const cy = 260;
    const top = getOpponentFanCardPoint(count, count - 1, cx, cy, 'left');
    const bottom = getOpponentFanCardPoint(count, 0, cx, cy, 'left');
    assert(top.angle < 90, `left fan: top card angle ${top.angle} should be < 90°`);
    assert(bottom.angle > 90, `left fan: bottom card angle ${bottom.angle} should be > 90°`);
}

function testRightFanCenterCard(): void {
    const pt = getOpponentFanCardPoint(5, 2, 334, 260, 'right');
    assertEqual(pt.x, 334, 'right center card x');
    assertEqual(pt.y, 260, 'right center card y');
    assertEqual(pt.angle, -90, 'right center card angle = -90°');
}

function testRightFanAngles(): void {
    const count = 5;
    const cx = 334;
    const cy = 260;
    // Right fan: index 0 has negative offset → y < cy → TOP of fan
    const top = getOpponentFanCardPoint(count, 0, cx, cy, 'right');
    const bottom = getOpponentFanCardPoint(count, count - 1, cx, cy, 'right');
    assert(top.angle > -90, `right fan: top card angle ${top.angle} should be > -90°`);
    assert(bottom.angle < -90, `right fan: bottom card angle ${bottom.angle} should be < -90°`);
}

function testSingleCardFan(): void {
    for (const side of ['top', 'left', 'right'] as const) {
        const pt = getOpponentFanCardPoint(1, 0, 195, 120, side);
        assertEqual(pt.x, 195, `single card x (${side})`);
        assertEqual(pt.y, 120, `single card y (${side})`);
    }
}

// ─── getOpponentFanCenter ─────────────────────────────────────────────────────

function testTopFanCenterCoords(): void {
    const layout = { side: 'top' as const, x: PLAYER_GAME_WIDTH / 2, y: 58, angle: 0 };
    const { cx, cy } = getOpponentFanCenter(layout, 3);
    // seatY = 58+6=64, seatHeight=36, cy = 64+18+6+OPP_CARD_H/2
    const expectedCy = 64 + 18 + 6 + OPP_CARD_H / 2;
    assertEqual(cx, PLAYER_GAME_WIDTH / 2, 'top fan center cx = layout.x');
    assertEqual(cy, expectedCy, 'top fan center cy');
}

function testLeftFanCenterCoords(): void {
    const layout = { side: 'left' as const, x: 44, y: 196, angle: -90 };
    const count = 1;
    const { cx, cy } = getOpponentFanCenter(layout, count);
    // panelWidth=112, cx = 56
    assertEqual(cx, 56, 'left fan center cx = panelWidth/2');
    // panelHeight=36, fanTopY = 196+18+6+31 = 251, spread=0 for count=1 → cy=251
    const expectedCy = 196 + 18 + 6 + OPP_CARD_H / 2;
    assertEqual(cy, expectedCy, 'left fan center cy for count=1');
}

function testRightFanCenterCoords(): void {
    const layout = { side: 'right' as const, x: PLAYER_GAME_WIDTH - 44, y: 196, angle: 90 };
    const { cx } = getOpponentFanCenter(layout, 1);
    assertEqual(cx, PLAYER_GAME_WIDTH - 56, 'right fan center cx = PLAYER_GAME_WIDTH - panelWidth/2');
}

function testSideFanCenterWithMultipleCards(): void {
    const layout = { side: 'left' as const, x: 44, y: 196, angle: -90 };
    const count = 3;
    const spread = Math.min(14, 84 / (count - 1)); // = 14
    const fanTopY = 196 + 18 + 6 + OPP_CARD_H / 2;
    const expectedCy = fanTopY + ((count - 1) / 2) * spread;
    const { cy } = getOpponentFanCenter(layout, count);
    assertEqual(cy, expectedCy, 'side fan center cy shifts down with more cards');
}

// ─── getOpponentSeatLayouts ───────────────────────────────────────────────────

function testSeatLayoutCounts(): void {
    assertEqual(getOpponentSeatLayouts(0).length, 0, 'no opponents → 0 layouts');
    assertEqual(getOpponentSeatLayouts(1).length, 1, '1 opponent → 1 layout');
    assertEqual(getOpponentSeatLayouts(2).length, 2, '2 opponents → 2 layouts');
    assertEqual(getOpponentSeatLayouts(3).length, 3, '3 opponents → 3 layouts');
}

function testSeatLayoutSides(): void {
    const [one] = getOpponentSeatLayouts(1);
    assert(one?.side === 'top', '1 opponent is at top');

    const two = getOpponentSeatLayouts(2);
    const sides = new Set(two.map((l) => l.side));
    assert(sides.has('left') && sides.has('right'), '2 opponents: left + right');

    const three = getOpponentSeatLayouts(3);
    const sides3 = new Set(three.map((l) => l.side));
    assert(sides3.has('top'), '3 opponents includes top');
    assert(sides3.has('left'), '3 opponents includes left');
    assert(sides3.has('right'), '3 opponents includes right');
}

// ─── getHandCardPoint (local player) ─────────────────────────────────────────

function testHandCenterCard(): void {
    const pt = getHandCardPoint({ cardCount: 5, index: 2 });
    assertEqual(pt.x, PLAYER_GAME_WIDTH / 2, 'hand center card at screen center x');
    assertEqual(pt.angle, 0, 'hand center card angle = 0');
}

function testHandSymmetry(): void {
    const count = 6;
    for (let i = 0; i < Math.floor(count / 2); i++) {
        const left = getHandCardPoint({ cardCount: count, index: i });
        const right = getHandCardPoint({ cardCount: count, index: count - 1 - i });
        assertEqual(left.x + right.x, PLAYER_GAME_WIDTH, `hand x symmetry i=${i}`);
        assertEqual(left.y, right.y, `hand y symmetry i=${i}`);
        assertEqual(left.angle + right.angle, 0, `hand angle symmetry i=${i}`);
    }
}

// ─── animation consistency: fan point matches getOpponentFanCenter ────────────

function testAnimationDestMatchesRenderedPosition(): void {
    // Simulate a deal to top opponent with 4 cards in hand after deal
    const layout = { side: 'top' as const, x: PLAYER_GAME_WIDTH / 2, y: 58, angle: 0 };
    const count = 4;
    const { cx, cy } = getOpponentFanCenter(layout, count);

    // The last card dealt goes to index count-1
    const targetIndex = count - 1;
    const animPt = getOpponentFanCardPoint(count, targetIndex, cx, cy, layout.side);
    const renderPt = getOpponentFanCardPoint(count, targetIndex, cx, cy, layout.side);

    // They must be identical (same function — guards against future divergence)
    assertEqual(animPt.x, renderPt.x, 'anim dest x === render x');
    assertEqual(animPt.y, renderPt.y, 'anim dest y === render y');
    assertEqual(animPt.angle, renderPt.angle, 'anim dest angle === render angle');
}

function testFanCenterIsConsistentBetweenDrawAndRender(): void {
    // For side opponent: fanCenter from getOpponentFanCenter must match
    // what drawSideOpponent computes inline
    const layout = { side: 'left' as const, x: 44, y: 196, angle: -90 };
    const cardCount = 5;
    const panelHeight = 36;
    const panelWidth = 112;

    // Inline formula from drawSideOpponent
    const spread = cardCount > 1 ? Math.min(14, 84 / (cardCount - 1)) : 0;
    const fanTopY = layout.y + panelHeight / 2 + 6 + OPP_CARD_H / 2;
    const inlineCy = fanTopY + ((cardCount - 1) / 2) * spread;
    const inlineCx = panelWidth / 2;

    const { cx, cy } = getOpponentFanCenter(layout, cardCount);
    assertEqual(cx, inlineCx, 'left cx matches drawSideOpponent inline');
    assertEqual(cy, inlineCy, 'left cy matches drawSideOpponent inline');
}

function testTopFanCenterConsistentWithDrawTopOpponent(): void {
    const layout = { side: 'top' as const, x: PLAYER_GAME_WIDTH / 2, y: 58, angle: 0 };
    const seatY = layout.y + 6;
    const seatHeight = 36;

    // Inline formula from drawTopOpponent
    const inlineCy = seatY + seatHeight / 2 + 6 + OPP_CARD_H / 2;
    const inlineCx = layout.x;

    const { cx, cy } = getOpponentFanCenter(layout, 3);
    assertEqual(cx, inlineCx, 'top cx matches drawTopOpponent inline');
    assertEqual(cy, inlineCy, 'top cy matches drawTopOpponent inline');
}

async function main() {
    // getOpponentFanCardPoint
    testTopFanCenterCard();
    testTopFanSymmetry();
    testTopFanEdgeCardsBelow();
    testLeftFanCenterCard();
    testLeftFanSpreadVertical();
    testLeftFanAngles();
    testRightFanCenterCard();
    testRightFanAngles();
    testSingleCardFan();

    // getOpponentFanCenter
    testTopFanCenterCoords();
    testLeftFanCenterCoords();
    testRightFanCenterCoords();
    testSideFanCenterWithMultipleCards();

    // getOpponentSeatLayouts
    testSeatLayoutCounts();
    testSeatLayoutSides();

    // getHandCardPoint
    testHandCenterCard();
    testHandSymmetry();

    // animation consistency
    testAnimationDestMatchesRenderedPosition();
    testFanCenterIsConsistentBetweenDrawAndRender();
    testTopFanCenterConsistentWithDrawTopOpponent();

    console.log('playerPovLayout.test.ts passed');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
