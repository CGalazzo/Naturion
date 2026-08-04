const MAP_ID = "clareira-dos-ecos-overworld";
const SCREEN_ID = "echoOverworldScreen";
const OPEN_EVENT = "naturion:open-echo-overworld";
const STYLE_ID = "idleTotemRunResetCss";

const bridge = () => window.NaturionOverworldBridge;
const player = () => bridge()?.getPlayer?.() || {};
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const puzzleSolved = () => Boolean(player().echoOverworldProgress?.puzzles?.echoesSolved);

const uniqueRoster = () => {
  const snapshot = player();
  const seen = new Set();
  return [snapshot.starter, ...(snapshot.team || [])].filter(Boolean).filter((member) => {
    const key = member.uid || `${member.formId || member.id}-${member.name || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const healRoster = () => {
  uniqueRoster().forEach((member) => {
    const maxHp = Math.max(1, Number(member.maxHp) || Number(member.hp) || Number(member.currentHp) || 1);
    member.maxHp = maxHp;
    member.currentHp = maxHp;
    if ("hp" in member) member.hp = maxHp;
  });
};

const resetPayload = (reason) => {
  const saved = player().echoOverworldProgress?.idleExpedition || {};
  return {
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
    lastResetReason: reason,
    updatedAt: new Date().toISOString()
  };
};

const resetSavedRun = (reason, { heal = true } = {}) => {
  if (puzzleSolved()) return false;
  if (heal) healRoster();
  const snapshot = player();
  bridge()?.saveEchoMapState?.({
    mapId: MAP_ID,
    idleExpedition: resetPayload(reason),
    puzzles: {
      ...(snapshot.echoOverworldProgress?.puzzles || {}),
      echoesSolved: false
    },
    runResetAt: new Date().toISOString()
  });
  return true;
};

const showRecoveredToast = () => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = "A equipe foi recuperada. A expedição recomeçou em 0%.";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
};

// A regra principal fica antes do controlador da expedição: phase1.js sempre
// lê um estado zerado ao entrar novamente, salvo se o Puzzle 1 já foi concluído.
window.addEventListener(OPEN_EVENT, () => {
  resetSavedRun("entry");
}, { capture: true });

// O botão do mapa salva o estado local no próprio clique. O reset é gravado no
// próximo ciclo para prevalecer sobre esse save e garantir a próxima entrada em 0%.
document.addEventListener("click", (event) => {
  const button = event.target?.closest?.(`#${SCREEN_ID} [data-action="map"]`);
  if (!button || puzzleSolved()) return;
  window.setTimeout(() => resetSavedRun("exit"), 0);
});

let wrappedStartBattle = null;

const installDefeatReset = () => {
  const currentBridge = bridge();
  const currentStartBattle = currentBridge?.startBattle;
  if (!currentStartBattle || currentStartBattle === wrappedStartBattle || currentStartBattle.__naturionIdleRunResetWrapper) return;

  const originalStartBattle = currentStartBattle;
  const wrapped = async function startBattleWithRunReset(payload) {
    const result = await originalStartBattle.apply(this, arguments);
    const screen = document.getElementById(SCREEN_ID);
    const idleBattle = payload?.stageId === MAP_ID && screen?.classList.contains("idle-host");

    if (idleBattle && result?.outcome === "defeat") {
      window.setTimeout(() => {
        resetSavedRun("defeat");

        // Fecha e reabre a própria Clareira para substituir também o estado
        // mantido em memória pelo controlador, não apenas o conteúdo do save.
        const mapButton = document.querySelector(`#${SCREEN_ID} [data-action="map"]`);
        if (mapButton && !mapButton.disabled) mapButton.click();
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent(OPEN_EVENT));
          showRecoveredToast();
        }, 120);
      }, 0);
    }

    return result;
  };

  wrapped.__naturionIdleRunResetWrapper = true;
  currentBridge.startBattle = wrapped;
  wrappedStartBattle = wrapped;
};

const ensureStyles = () => {
  let link = document.getElementById(STYLE_ID);
  const href = "src/overworld/idle/totem-run-reset.css?v=2";
  if (!link) {
    link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    document.head.append(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
};

const totemDuration = () => {
  const speed = clamp(Number(document.querySelector(".idle-app")?.style.getPropertyValue("--speed")) || 1, 1, 3);
  return reducedMotion() ? 80 : Math.max(780, Math.round(2200 / speed));
};

const setSceneCopy = (scene, title, message) => {
  const titleNode = scene?.querySelector("[data-scene-title]");
  const messageNode = scene?.querySelector("[data-scene-message]");
  if (titleNode) titleNode.textContent = title;
  if (messageNode) messageNode.textContent = message;
};

const startTotemApproach = (totem) => {
  const scene = totem?.closest(".idle-scene");
  const image = totem?.querySelector("img");
  const copy = totem?.querySelector(".idle-totem-copy");
  if (!scene || !image || !copy || !totem.classList.contains("visible") || totem.dataset.approachState) return;

  const duration = totemDuration();
  const token = `${Date.now()}-${Math.random()}`;
  totem.dataset.approachState = "moving";
  totem.dataset.approachToken = token;
  totem.style.setProperty("--totem-approach-duration", `${duration}ms`);
  totem.classList.remove("arrived");
  totem.classList.add("approaching");
  scene.classList.add("totem-approach");
  setSceneCopy(scene, "Santuário à frente", "A equipe se aproxima de uma presença ancestral.");

  window.setTimeout(() => {
    if (!totem.isConnected || !totem.classList.contains("visible") || totem.dataset.approachToken !== token) return;
    totem.classList.remove("approaching");
    totem.classList.add("arrived");
    totem.dataset.approachState = "arrived";
    scene.classList.remove("totem-approach");
    setSceneCopy(scene, "Santuário Oeste alcançado", "O Totem respondeu. Examine-o para iniciar o Puzzle 1.");

    // Segurança: mesmo que uma animação CSS falhe, o botão continua utilizável.
    const button = copy.querySelector("[data-action=" + '"puzzle"' + "]");
    if (button) {
      button.disabled = false;
      button.style.visibility = "visible";
      button.style.pointerEvents = "auto";
    }
  }, duration + (reducedMotion() ? 0 : 140));
};

const clearTotemApproach = (totem) => {
  const scene = totem?.closest(".idle-scene");
  totem?.classList.remove("approaching", "arrived");
  if (totem?.dataset) {
    delete totem.dataset.approachState;
    delete totem.dataset.approachToken;
  }
  totem?.style.removeProperty("--totem-approach-duration");
  scene?.classList.remove("totem-approach");
};

const observeTotem = () => {
  const totem = document.querySelector(`#${SCREEN_ID} .idle-totem`);
  if (!totem || totem.dataset.runLifecycleObserver === "true") return Boolean(totem);
  totem.dataset.runLifecycleObserver = "true";

  const sync = () => {
    if (totem.classList.contains("visible")) startTotemApproach(totem);
    else clearTotemApproach(totem);
  };

  new MutationObserver(sync).observe(totem, { attributes: true, attributeFilter: ["class"] });
  sync();
  return true;
};

const prepareClareiraLifecycle = () => {
  ensureStyles();
  installDefeatReset();
  window.requestAnimationFrame(() => {
    if (!observeTotem()) window.setTimeout(observeTotem, 100);
  });
  window.setTimeout(installDefeatReset, 200);
};

window.addEventListener(OPEN_EVENT, prepareClareiraLifecycle);
