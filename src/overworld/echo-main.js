const OPEN_EVENT = "naturion:open-echo-overworld";

let coreReady = false;
let corePromise = null;
let enhancementsPromise = null;
let redispatching = false;
let pendingDetail;

const showLoadError = () => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = "Não foi possível carregar a Clareira dos Ecos. Tente novamente.";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
};

const loadCore = () => {
  if (coreReady) return Promise.resolve();
  if (!corePromise) {
    corePromise = (async () => {
      // O ciclo de entrada/saída é carregado antes do controlador para que o
      // reset em 0% aconteça antes de phase1.js ler o save.
      await import("./idle/run-lifecycle-core.js?v=1");
      await import("./idle/phase1-compat.js?v=4");
      await import("./idle/phase1.js?v=4");
      coreReady = true;
    })().catch((error) => {
      corePromise = null;
      console.error("[Naturion] Falha ao carregar a Clareira dos Ecos.", error);
      showLoadError();
      throw error;
    });
  }
  return corePromise;
};

const loadEnhancements = () => {
  if (enhancementsPromise) return enhancementsPromise;

  // Melhorias visuais nunca podem impedir a abertura da Clareira.
  const modules = [
    ["./idle/background-fix.js?v=4", "fundo"],
    ["./idle/treadmill.js?v=7", "esteira"],
    ["./idle/battle-encounter-polish.js?v=4", "encontros e EXP"]
  ];

  enhancementsPromise = Promise.allSettled(modules.map(([path, label]) => (
    import(path).catch((error) => {
      console.error(`[Naturion] Falha no módulo opcional: ${label}.`, error);
      throw error;
    })
  )));

  return enhancementsPromise;
};

const openAfterCoreLoad = () => {
  const detail = pendingDetail;
  pendingDetail = undefined;
  redispatching = true;
  try {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));
  } finally {
    redispatching = false;
  }

  window.requestAnimationFrame(() => { void loadEnhancements(); });
};

window.addEventListener(OPEN_EVENT, (event) => {
  if (coreReady || redispatching) return;

  event.stopImmediatePropagation();
  pendingDetail = event.detail;

  if (corePromise) return;
  void loadCore().then(openAfterCoreLoad).catch(() => {});
}, { capture: true });
