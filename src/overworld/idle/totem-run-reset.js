const MAP_ID = "clareira-dos-ecos-overworld";
const SCREEN_ID = "echoOverworldScreen";
const STYLE_ID = "idleTotemRunResetCss";
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const bridge = () => window.NaturionOverworldBridge;

const ensureStyles = () => {
  let link = document.getElementById(STYLE_ID);
  const href = "src/overworld/idle/totem-run-reset.css?v=1";
  if (!link) {
    link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    document.head.append(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
};

const player = () => bridge()?.getPlayer?.() || {};
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
    const maxHp = Math.max(1, Number(member.maxHp) || Number(member.hp) || 1);
    member.maxHp = maxHp;
    member.currentHp = maxHp;
    if ("hp" in member) member.hp = maxHp;
  });
};

const resetPayload = (reason) => {
  const saved = player().echoOverworldProgress?.idleExpedition || {};
  return {
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

const resetRun = (reason, { reopen = false } = {}) => {
  if (puzzleSolved()) return;
  healRoster();
  const snapshot = player();
  const puzzles = { ...(snapshot.echoOverworldProgress?.puzzles || {}), echoesSolved: false };
  bridge()?.saveEchoMapState?.({
    mapId: MAP_ID,
    idleExpedition: resetPayload(reason),
    puzzles,
    runResetAt: new Date().toISOString()
  });
  if (reopen) {
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("naturion:open-echo-overworld")), 80);
  }
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
  if (!scene || !totem.classList.contains("visible") || totem.dataset.approachState) return;
  const image = totem.querySelector("img");
  const copy = totem.querySelector(".idle-totem-copy");
  if (!image || !copy) return;

  const duration = totemDuration();
  const token = `${Date.now()}-${Math.random()}`;
  totem.dataset.approachState = "moving";
  totem.dataset.approachToken = token;
  totem.style.setProperty("--totem-approach-duration", `${duration}ms`);
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
    copy.querySelector("button")?.focus?.();
  }, duration + (reducedMotion() ? 0 : 120));
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
  if (!totem || totem.dataset.runResetObserver === "true") return;
  totem.dataset.runResetObserver = "true";
  const sync = () => {
    if (totem.classList.contains("visible")) startTotemApproach(totem);
    else clearTotemApproach(totem);
  };
  new MutationObserver(sync).observe(totem, { attributes: true, attributeFilter: ["class"] });
  sync();
};

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
        resetRun("defeat", { reopen: true });
        const toast = document.getElementById("toast");
        if (toast) {
          toast.textContent = "A equipe foi recuperada. A expedição recomeçou em 0%.";
          toast.classList.add("show");
          window.setTimeout(() => toast.classList.remove("show"), 2600);
        }
      }, 0);
    }
    return result;
  };

  wrapped.__naturionIdleRunResetWrapper = true;
  currentBridge.startBattle = wrapped;
  wrappedStartBattle = wrapped;
};

const handleMapExit = (event) => {
  const button = event.target?.closest?.(`#${SCREEN_ID} [data-action="map"]`);
  if (!button || puzzleSolved()) return;
  window.setTimeout(() => resetRun("exit"), 0);
};

const refresh = () => {
  ensureStyles();
  observeTotem();
  installDefeatReset();
};

document.addEventListener("click", handleMapExit);
window.addEventListener("naturion:open-echo-overworld", () => requestAnimationFrame(refresh));

// O módulo é carregado somente ao entrar na Clareira. Não observar o documento
// inteiro nem manter timers globais evita bloquear a tela inicial do jogo.
refresh();
