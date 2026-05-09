import { supportedDeckDefinitions } from "@engine/engine/cards/deckDefinitions";
import { createCardSandboxGame, type CardSandboxSection } from "./createCardSandboxGame";

const rootElement = document.getElementById("card-sandbox-root");
const deckSelectElement = document.getElementById("card-sandbox-deck");
const replayButtonElement = document.getElementById("card-sandbox-replay");
const sectionButtonElements = Array.from(document.querySelectorAll("[data-card-sandbox-section]"));

if (
    !rootElement ||
    !(deckSelectElement instanceof HTMLSelectElement) ||
    !(replayButtonElement instanceof HTMLButtonElement) ||
    sectionButtonElements.some((element) => !(element instanceof HTMLButtonElement))
) {
    throw new Error("Card sandbox requires #card-sandbox-root, #card-sandbox-deck, #card-sandbox-replay, and section tabs.");
}

const deckIds = Object.keys(supportedDeckDefinitions);
deckSelectElement.replaceChildren(...deckIds.map((deckId) => {
    const deckDefinition = supportedDeckDefinitions[deckId as keyof typeof supportedDeckDefinitions];
    const option = document.createElement("option");
    option.value = deckId;
    option.textContent = deckDefinition.name;
    option.selected = deckId === "french";
    return option;
}));

const sandboxGame = createCardSandboxGame("card-sandbox-root", deckSelectElement.value);

deckSelectElement.addEventListener("change", () => {
    sandboxGame.setDeck(deckSelectElement.value);
});

replayButtonElement.addEventListener("click", () => {
    sandboxGame.replay();
});

sectionButtonElements.forEach((element) => {
    const button = element as HTMLButtonElement;
    button.addEventListener("click", () => {
        const section = button.dataset.cardSandboxSection as CardSandboxSection | undefined;
        if (!section) {
            return;
        }

        sandboxGame.setSection(section);
        sectionButtonElements.forEach((candidate) => {
            candidate.classList.toggle("is-active", candidate === button);
        });
    });
});
