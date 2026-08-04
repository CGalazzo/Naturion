const MAP_ID = "clareira-dos-ecos-overworld";
const OPEN_EVENT = "naturion:open-echo-overworld";
const SCREEN_ID = "echoOverworldScreen";

let solvedBeforeEntry = false;

const bridge = () => window.NaturionOverworldBridge;

const freshRun = (saved = {}) => ({
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
  resetAt: new Date().toISOString()
});

const ensureSolvedTotemState = () => {
  const totem = document.querySelector(`#${SCREEN_ID} .idle-totem`);
  if (!totem) return false;

  const sync = () => {
    if (!solvedBeforeEntry || !totem.classList.contains("visible")) return;

    const small = totem.querySelector("small");
    const paragraph = totem.querySelector("p");
    const button = totem.querySelector("[data-action='puzzle']");

    if (small) small.textContent = "Puzzle 1 já concluído";
    if (paragraph) paragraph.textContent = "O Círculo dos Ecos já foi resolvido nesta jornada. Não é necessário repetir o desafio.";
    if (button) {
      button.textContent = "Puzzle já concluído";
      button.disabled = true;
    }
  };

  if (totem.dataset.safeResetObserver !== "true") {
    totem.dataset.safeResetObserver = "true";
    new MutationObserver(sync).observe(totem, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  sync();
  return true;
};

const resetBeforeEntry = () => {
  const currentBridge = bridge();
  if (!currentBridge?.getPlayer) return;

  const snapshot = currentBridge.getPlayer() || {};
  snapshot.echoOverworldProgress ||= {};
  const progress = snapshot.echoOverworldProgress;
  progress.puzzles ||= {};

  solvedBeforeEntry = Boolean(progress.puzzles.echoesSolved);
  const reset = freshRun(progress.idleExpedition);

  // O controlador original considera um puzzle resolvido como progresso 100%.
  // A flag é ocultada apenas durante esta abertura para que ele leia 0%.
  progress.idleExpedition = reset;
  progress.puzzles.echoesSolved = false;

  queueMicrotask(() => {
    progress.puzzles.echoesSolved = solvedBeforeEntry;
    currentBridge.saveEchoMapState?.({
      mapId: MAP_ID,
      idleExpedition: reset,
      puzzles: {
        ...progress.puzzles,
        echoesSolved: solvedBeforeEntry
      },
      runResetAt: new Date().toISOString()
    });

    window.requestAnimationFrame(() => {
      if (!ensureSolvedTotemState()) {
        window.setTimeout(ensureSolvedTotemState, 100);
      }
    });
  });
};

window.addEventListener(OPEN_EVENT, resetBeforeEntry, { capture: true });
