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
      // Apenas a regra de reset e o controlador original da expedição.
      // Nenhum CSS, imagem ou observador visual é executado antes da tela.
      await import("./idle/run-reset-entry.js?v=1");
      await import("./idle/phase1-compat.js?v=3");
      await import("./idle/phase1.js?v=3");
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

  // Restaura exatamente os complementos visuais usados antes da regressão.
  // Qualquer falha individual não impede a abertura da Clareira.
  const modules = [
    ["./idle/background-fix.js?v=3", "fundo"],
    ["./idle/treadmill.js?v=6", "esteira"],
    ["./idle/battle-encounter-polish.js?v=3", "encontros e EXP"],
    ["./idle/totem-run-reset.js?v=4", "Totem e reinício"]
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
