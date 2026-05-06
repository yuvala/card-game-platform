import type { CardGameViewModel } from "./viewModel";

export function applyPlayerPovViewModel(
    viewModel: CardGameViewModel,
    viewerId?: string | null
): CardGameViewModel {
    if (!viewerId) {
        return viewModel;
    }

    const viewerIndex = viewModel.players.findIndex((player) => player.id === viewerId);
    if (viewerIndex < 0) {
        return viewModel;
    }

    const orderedPlayers = [
        ...viewModel.players.slice(viewerIndex),
        ...viewModel.players.slice(0, viewerIndex)
    ];
    const povPlayers = orderedPlayers.map((player) => {
        if (player.id === viewerId) {
            return player;
        }

        return {
            ...player,
            hand: player.hand.map((card) => ({
                ...card,
                isFaceUp: false
            })),
            canInteract: false,
            cardClickAction: undefined
        };
    });
    const viewer = povPlayers.find((player) => player.id === viewerId);
    const canViewerAct = Boolean(viewer?.canInteract);

    return {
        ...viewModel,
        players: povPlayers,
        controls: {
            ...viewModel.controls,
            canPlay: viewModel.controls.canPlay && canViewerAct
        },
        primaryAction: canViewerAct ? viewModel.primaryAction : null
    };
}
