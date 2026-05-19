import { REWRITE_HEIGHT, TABLE_CENTER_Y } from '../../layout';

// --- Card display sizes (px) ---
export const CARD_WIDTH = 60; // hand slot cards (the cards in a player's hand)
export const CARD_HEIGHT = 88; // hand slot cards
export const PRIMARY_PILE_FRAME_WIDTH = 60; // hit-target / slot frame for the primary draw pile
export const PRIMARY_PILE_FRAME_HEIGHT = 88; // hit-target / slot frame for the primary draw pile
export const DISCARD_CARD_WIDTH = 70; // discard pile face-up card
export const DISCARD_CARD_HEIGHT = 98; // discard pile face-up card
export const TABLE_CARD_WIDTH = 74; // cards played to the center of the table (e.g. war battle cards)
export const TABLE_CARD_HEIGHT = 104; // cards played to the center of the table

export const OWNED_PILE_CARD_WIDTH = 60; // collected/won pile (compact, stacked at player zone edge)
export const OWNED_PILE_CARD_HEIGHT = 88; // collected/won pile
export const SUPPLEMENTAL_PILE_CARD_WIDTH = 52; // secondary piles (e.g. brisca trump reveal)
export const SUPPLEMENTAL_PILE_CARD_HEIGHT = 74; // secondary piles

// --- Layout positions ---
export const PRIMARY_PILE_VERTICAL_SHIFT = Math.round(REWRITE_HEIGHT * 0.1); // how far the draw pile sits above table center
export const PRIMARY_PILE_TARGET_CENTER_Y = TABLE_CENTER_Y; // y center for the draw pile slot
export const DEFAULT_HAND_SLOT_COUNT = 5; // number of card slots rendered per player hand
export const PLAYER_ZONE_LEFT_X = 330; // x boundary of the left player zone (player 0 hand area)
export const PLAYER_ZONE_RIGHT_X = 720; // x boundary of the right player zone (player 1 hand area)

// --- Colors ---
export const CARD_BACK_STROKE = 0xc4b06a; // gold border drawn on card backs
export const TABLE_TEXT_RESOLUTION = 2; // canvas resolution multiplier for crisp text rendering
export const TABLE_FONT_FAMILY = 'Georgia, Cambria, serif'; // serif font for labels and scores
export const TABLE_MONO_FONT_FAMILY = 'Trebuchet MS, Georgia, serif'; // monospaced-ish font for numeric displays
export const TABLE_GOLD = 0xffd166; // primary gold accent (highlights, borders)
export const TABLE_GOLD_DARK = 0x8b6f2e; // darker gold (shadows, inner borders)
export const TABLE_CREAM = '#f6ecd2'; // warm off-white for text
export const TABLE_CREAM_DIM = 'rgba(246,236,210,0.72)'; // dimmed cream for secondary text
export const TABLE_FELT = 0x0d231b; // main table surface (dark green felt)
export const TABLE_FELT_DARK = 0x06140f; // darker felt (vignette, pile backgrounds)
export const TABLE_PANEL = 0x08150f; // darkest panel tone (HUD backgrounds)

// --- Card interaction ---
export const SELECTED_CARD_SCALE = 1; // scale when a card is selected (1 = no scale, lift only)
export const HOVER_CARD_SCALE = 1.01; // subtle scale on hover
export const SELECTED_CARD_LIFT_Y = -8; // px upward shift when a card is selected
export const SELECTED_CARD_SHIFT_X = 5; // px rightward shift when a card is selected
export const HOVER_CARD_LIFT_Y = -4; // px upward shift on hover
export const HOVER_CARD_SHIFT_X = 3; // px rightward shift on hover
