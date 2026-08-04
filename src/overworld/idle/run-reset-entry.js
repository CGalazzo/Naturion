const MAP_ID = "clareira-dos-ecos-overworld";
const OPEN_EVENT = "naturion:open-echo-overworld";
const SOLVED_MARKER = "naturion:echo-puzzle-1-solved";
const BROKEN_SAVE_RECOVERY = "naturion:echo-broken-save-recovery-v1";

const bridge = () => window.NaturionOverworldBridge;

const consumeBrokenSaveRecovery = () => {
  try {
    if (window.localStorage.getItem(BROKEN_SAVE_RECOVERY) === "done") return false;
    window.localStorage.setItem(BROKEN_SAVE_RECOVERY, "done");
    window.localStorage.removeItem(SOLVED_MARKER);
    return true;
  } catch {
    return true;
  }
};

const hasRealPuzzleCompletion = (progress = {}) => {
  if (progress.puzzleOneSolvedAt) return true;
  try {
    return Boolean(window.localStorage.getItem(SOLVED_MARKER));
  } catch {
    return false;
  }
};

const installCompletionMarker = () => {
  const currentBridge = bridge();
  const currentSave = currentBridge?.saveEchoMapState;
  if (!currentSave || currentSave.__naturionPuzzleCompletionMarker) return;

  const originalSave = currentSave.bind(currentBridge);
  const wrappedSave = (payload = {}) => {
    const realCompletion = Boolean(
      payload.puzzleOneSolvedAt
      && payload.puzzles?.echoesSolved
      && payload.idleExpedition?.completed
    );

    if (realCompletion) {
      try {
        window.localStorage.setItem(SOLVED_MARKER, String(payload.puzzleOneSolvedAt));
      } catch {
        // O save principal continua funcionando mesmo sem localStorage.
      }
    }

    return originalSave(payload);
  };

  wrappedSave.__naturionPuzzleCompletionMarker = true;
  currentBridge.saveEchoMapState = wrappedSave;
};

const resetRunBeforeEntry = () => {
  installCompletionMarker();

  const currentBridge = bridge();
  if (!currentBridge?.getPlayer) return;

  const snapshot = currentBridge.getPlayer() || {};
  snapshot.echoOverworldProgress ||= {};
  const progress = snapshot.echoOverworldProgress;
  progress.puzzles ||= {};
  const forceRecovery = consumeBrokenSaveRecovery();

  // Após a limpeza única do estado quebrado, uma conclusão real volta a ser
  // preservada normalmente nas próximas entradas.
  if (!forceRecovery && hasRealPuzzleCompletion(progress)) return;

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
    lastResetReason: forceRecovery ? "broken-save-recovery" : "entry",
    updatedAt: new Date().toISOString()
  };

  // Corrige primeiro o objeto em memória, para que phase1.js nunca leia o
  // estado falso de 100% mostrado na captura.
  progress.idleExpedition = reset;
  progress.puzzles = { ...progress.puzzles, echoesSolved: false };
  delete progress.puzzleOneSolvedAt;

  currentBridge.saveEchoMapState?.({
    mapId: MAP_ID,
    idleExpedition: reset,
    puzzles: progress.puzzles,
    runResetAt: new Date().toISOString()
  });
};

installCompletionMarker();
window.addEventListener(OPEN_EVENT, resetRunBeforeEntry, { capture: true });
