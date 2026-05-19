export interface ScenePoint {
    x: number;
    y: number;
}

export interface SeatLayout {
    labelX: number;
    labelY: number;
    labelAlign: 'left' | 'center' | 'right';
    handCenterX: number;
    handCenterY: number;
    gapX: number;
    gapY: number;
    angle: number;
}

export interface HandSlotOrigin {
    originX: number;
    originY: number;
    originAngle: number;
}

export interface HandSlotDisplayState {
    cardId: string | null;
    visible: boolean;
    interactiveEnabled: boolean;
    isSelected: boolean;
    isHovered: boolean;
    scale: number;
    depth: number;
    position: ScenePoint | null;
    angle: number | null;
}

export interface PrimaryPileLayout {
    drawCenterY: number;
    discardCenterY: number;
    frameWidth: number;
    frameHeight: number;
    drawTitleOffsetY: number;
    discardTitleOffsetY: number;
    discardTextOffsetY: number;
    discardCardWidth: number;
    discardCardHeight: number;
    titleFontSize: number;
    countFontSize: number;
    deckCountFontSize: number;
}
