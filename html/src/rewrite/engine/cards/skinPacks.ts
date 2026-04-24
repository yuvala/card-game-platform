export type CardSkinId = "vintage-european";

export type SuitEmblemKind =
    | "heart"
    | "spade"
    | "diamond"
    | "club"
    | "coin"
    | "cup"
    | "sword"
    | "baton";

export interface CardSuitAppearance {
    emblem: SuitEmblemKind;
    primaryColor: string;
    secondaryColor: string;
}

export interface CardSkinDefinition {
    id: CardSkinId;
    label: string;
    paperLight: string;
    paperDark: string;
    borderDark: string;
    borderSoft: string;
    inkDark: string;
    backBase: string;
    backAccent: string;
    backLine: string;
    getSuitAppearance: (deckId: string, suitId: string) => CardSuitAppearance;
}

export const DEFAULT_CARD_SKIN_ID: CardSkinId = "vintage-european";

const frenchSuitStyles: Record<string, CardSuitAppearance> = {
    hearts: {
        emblem: "heart",
        primaryColor: "#b84a3d",
        secondaryColor: "#d9875b"
    },
    diamonds: {
        emblem: "diamond",
        primaryColor: "#b6693f",
        secondaryColor: "#d9a25f"
    },
    spades: {
        emblem: "spade",
        primaryColor: "#37455a",
        secondaryColor: "#70839a"
    },
    clubs: {
        emblem: "club",
        primaryColor: "#36513d",
        secondaryColor: "#69836d"
    }
};

const iberianSuitStyles: Record<string, CardSuitAppearance> = {
    oros: {
        emblem: "coin",
        primaryColor: "#bf8b30",
        secondaryColor: "#e2be68"
    },
    coins: {
        emblem: "coin",
        primaryColor: "#bf8b30",
        secondaryColor: "#e2be68"
    },
    copas: {
        emblem: "cup",
        primaryColor: "#8d5a36",
        secondaryColor: "#d3ad78"
    },
    cups: {
        emblem: "cup",
        primaryColor: "#8d5a36",
        secondaryColor: "#d3ad78"
    },
    espadas: {
        emblem: "sword",
        primaryColor: "#4f5978",
        secondaryColor: "#97a3bd"
    },
    swords: {
        emblem: "sword",
        primaryColor: "#4f5978",
        secondaryColor: "#97a3bd"
    },
    bastos: {
        emblem: "baton",
        primaryColor: "#5f4d2a",
        secondaryColor: "#9f8652"
    },
    batons: {
        emblem: "baton",
        primaryColor: "#5f4d2a",
        secondaryColor: "#9f8652"
    }
};

const fallbackSuitStyle: CardSuitAppearance = {
    emblem: "coin",
    primaryColor: "#745a37",
    secondaryColor: "#c9a876"
};

export const vintageEuropeanCardSkin: CardSkinDefinition = {
    id: "vintage-european",
    label: "Vintage European",
    paperLight: "#f7f1de",
    paperDark: "#e4d4b0",
    borderDark: "#4b3621",
    borderSoft: "#b99758",
    inkDark: "#1d1a17",
    backBase: "#27453f",
    backAccent: "#d6b878",
    backLine: "#183028",
    getSuitAppearance: (deckId, suitId) => {
        if (deckId === "french") {
            return frenchSuitStyles[suitId] ?? fallbackSuitStyle;
        }

        return iberianSuitStyles[suitId] ?? fallbackSuitStyle;
    }
};

export function getCardSkinById(skinId: string | null | undefined): CardSkinDefinition {
    switch (skinId) {
        case "vintage-european":
        default:
            return vintageEuropeanCardSkin;
    }
}
