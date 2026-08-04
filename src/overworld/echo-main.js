const OPEN_EVENT = "naturion:open-echo-overworld";

let idleModulesReady = false;
let idleModulesPromise = null;
let redispatching = false;

const showLoadError = () => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = "Não foi possível carregar a Clareira dos Ecos. Tente novamente.";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
};

const loadIdleModules = async () => {
  if (idleModulesReady) return;
  if (!idleModulesPromise) {
    idleModulesPromise = (async () => {
      await import("./idle/phase1-compat.js?v=2");
      await import("./idle/background-fix.js?v=2");
      await import("./idle/phase1.js?v=2");
      await import("./idle/treadmill.js?v=5");
      await import("./idle/battle-encounter-polish.js?v=2");
      await import("./idle/totem-run-reset.js?v=3");
      idleModulesReady = true;
    })().catch((error) => {
      idleModulesPromise = null;
      console.error("[Naturion] Falha ao carregar os módulos da expedição idle.", error);
      showLoadError();
      throw error;
    });
  }
  await idleModulesPromise;
};

window.addEventListener(OPEN_EVENT, async (event) => {
  if (idleModulesReady || redispatching) return;

  // Impede que uma abertura parcial continue enquanto os módulos ainda não
  // existem. A abertura é reenviada assim que todos estiverem prontos.
  event.stopImmediatePropagation();
  const detail = event.detail;

  try {
    await loadIdleModules();
    redispatching = true;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));
  } finally {
    redispatching = false;
  }
}, { capture: true });
