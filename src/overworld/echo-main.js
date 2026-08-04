const OPEN_EVENT = "naturion:open-echo-overworld";

let coreReady = false;
let loadingPromise = null;
let pendingDetail;

const showLoadError = () => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = "Não foi possível carregar a Clareira dos Ecos. Tente novamente.";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
};

const loadCore = async () => {
  await import("./idle/phase1-compat.js?v=2");
  await import("./idle/background-fix.js?v=2");
  await import("./idle/phase1.js?v=2");
  coreReady = true;
};

const loadEnhancements = async () => {
  const modules = [
    ["./idle/treadmill.js?v=5", "esteira"],
    ["./idle/battle-encounter-polish.js?v=2", "encontros e experiência"]
  ];

  const results = await Promise.allSettled(modules.map(([path]) => import(path)));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[Naturion] Falha ao carregar ${modules[index][1]}.`, result.reason);
    }
  });
};

window.addEventListener(OPEN_EVENT, (event) => {
  if (coreReady) return;

  // Segura somente a primeira abertura. A tela inicial não carrega nem executa
  // os módulos pesados da expedição idle.
  event.stopImmediatePropagation();
  pendingDetail = event.detail;

  if (loadingPromise) return;

  loadingPromise = loadCore()
    .then(() => {
      const detail = pendingDetail;
      pendingDetail = undefined;

      // phase1.js já registrou o listener neste ponto. Reenviar o evento abre
      // a Clareira normalmente sem depender das melhorias opcionais.
      window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));

      // Fundo, esteira, encontros e EXP entram depois que a tela já foi aberta.
      window.requestAnimationFrame(() => { void loadEnhancements(); });
    })
    .catch((error) => {
      console.error("[Naturion] Falha ao carregar a Clareira dos Ecos.", error);
      showLoadError();
    })
    .finally(() => {
      loadingPromise = null;
    });
}, { capture: true });
