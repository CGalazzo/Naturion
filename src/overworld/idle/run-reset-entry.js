const MAP_ID = "clareira-dos-ecos-overworld";
const OPEN_EVENT = "naturion:open-echo-overworld";

const resetRunBeforeEntry = () => {
  const bridge = window.NaturionOverworldBridge;
  if (!bridge?.getPlayer) return;

  const snapshot = bridge.getPlayer() || {};
  snapshot.echoOverworldProgress ||= {};
  const progress = snapshot.echoOverworldProgress;
  progress.puzzles ||= {};

  // Depois que o Puzzle 1 foi concluído, o resultado permanece salvo.
  if (progress.puzzles.echoesSolved) return;

  const saved = progress.idleExpedition || {};
  const reset = {
    version: 1,
    progress: 0,
    running: false,
    speed: [1, 2, 3].includes(Number(saved.speed)) ? Number(saved.speed) : 1,
    completedEncounterIds: [],
    battlesWon: 0,
    captures: 0,
    defeats: 0,
    puzzleUnlocked: false,
    completed: false,
    lastResetReason: "entry",
    updatedAt: new Date().toISOString()
  };

  // Atualiza o objeto em memória antes de phase1.js ler o estado. A gravação
  // abaixo mantém o mesmo valor no save sem tocar em equipe, níveis ou capturas.
  progress.idleExpedition = reset;
  progress.puzzles = { ...progress.puzzles, echoesSolved: false };

  bridge.saveEchoMapState?.({
    mapId: MAP_ID,
    idleExpedition: reset,
    puzzles: progress.puzzles,
    runResetAt: new Date().toISOString()
  });
};

window.addEventListener(OPEN_EVENT, resetRunBeforeEntry, { capture: true });
