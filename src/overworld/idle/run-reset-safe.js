const MAP_ID = "clareira-dos-ecos-overworld";
const OPEN_EVENT = "naturion:open-echo-overworld";
const SCREEN_ID = "echoOverworldScreen";

let puzzleSolvedForRun = false;

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

const showToast = (message) => {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2300);
};

const syncSolvedTotem = () => {
  const totem = document.querySelector(`#${SCREEN_ID} .idle-totem`);
  if (!totem) return false;

  if (totem.dataset.entryResetObserver !== "true") {
    totem.dataset.entryResetObserver = "true";
    new MutationObserver(syncSolvedTotem).observe(totem, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  if (!puzzleSolvedForRun || !totem.classList.contains("visible")) return true;

  const label = totem.querySelector("small");
  const paragraph = totem.querySelector("p");
  const button = totem.querySelector("[data-action='puzzle']");
  const objective = document.querySelector(`#${SCREEN_ID} [data-objective]`);

  if (label) label.textContent = "Puzzle 1 já concluído";
  if (paragraph) {
    paragraph.textContent = "O Círculo dos Ecos já foi resolvido. Conclua esta expedição sem repetir o desafio.";
  }
  if (button) {
    button.textContent = "Concluir expedição";
    button.disabled = false;
    button.removeAttribute("aria-disabled");
  }
  if (objective) objective.textContent = " conclua a expedição e retorne ao mapa.";
  return true;
};

const scheduleTotemSync = () => {
  window.requestAnimationFrame(() => {
    if (!syncSolvedTotem()) window.setTimeout(syncSolvedTotem, 100);
  });
};

const prepareFreshEntry = () => {
  const currentBridge = bridge();
  const originalGetPlayer = currentBridge?.getPlayer;
  if (typeof originalGetPlayer !== "function") return;

  const actualSnapshot = originalGetPlayer.call(currentBridge) || {};
  const actualProgress = actualSnapshot.echoOverworldProgress || {};
  const actualPuzzles = actualProgress.puzzles || {};
  puzzleSolvedForRun = Boolean(actualPuzzles.echoesSolved);

  const reset = freshRun(actualProgress.idleExpedition);
  const entrySnapshot = {
    ...actualSnapshot,
    echoOverworldProgress: {
      ...actualProgress,
      idleExpedition: reset,
      puzzles: {
        ...actualPuzzles,
        // Somente a leitura inicial recebe false. A conclusão real é restaurada
        // logo após o controlador criar o estado local em 0%.
        echoesSolved: false
      }
    }
  };

  const entryGetPlayer = () => entrySnapshot;
  currentBridge.getPlayer = entryGetPlayer;

  window.setTimeout(() => {
    if (currentBridge.getPlayer === entryGetPlayer) {
      currentBridge.getPlayer = originalGetPlayer;
    }

    currentBridge.saveEchoMapState?.({
      mapId: MAP_ID,
      idleExpedition: reset,
      puzzles: {
        ...actualPuzzles,
        echoesSolved: puzzleSolvedForRun
      },
      runResetAt: new Date().toISOString()
    });

    scheduleTotemSync();
  }, 0);
};

// Este listener roda antes do listener do controlador da expedição. Assim,
// phase1.js cria o estado interno em 0%, mesmo quando o puzzle já foi concluído.
window.addEventListener(OPEN_EVENT, prepareFreshEntry, { capture: true });

// Quando o puzzle já está concluído, o mesmo botão do Totem encerra a nova
// expedição e retorna ao mapa sem abrir novamente a tela do desafio.
document.addEventListener("click", (event) => {
  const button = event.target?.closest?.(`#${SCREEN_ID} [data-action='puzzle']`);
  if (!button || !puzzleSolvedForRun) return;

  const totem = button.closest(".idle-totem");
  if (!totem?.classList.contains("visible")) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  button.disabled = true;
  showToast("Expedição concluída · Puzzle 1 já estava resolvido.");
  document.querySelector(`#${SCREEN_ID} [data-action='map']`)?.click();
}, true);
