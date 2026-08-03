import "./idle/phase1-compat.js?v=1";
import "./idle/background-fix.js?v=1";
import "./idle/phase1.js?v=1";
import "./idle/treadmill.js?v=4";
import "./idle/battle-encounter-polish.js?v=1";

// O módulo do Totem só é necessário dentro da expedição. Carregá-lo na tela
// inicial instalava observadores globais antes de o jogo terminar de iniciar.
let totemRunResetModule = null;

const loadTotemRunReset = () => {
  if (!totemRunResetModule) {
    totemRunResetModule = import("./idle/totem-run-reset.js?v=2").catch((error) => {
      console.error("[Naturion] Falha ao carregar o encontro final da Clareira.", error);
      totemRunResetModule = null;
    });
  }
  return totemRunResetModule;
};

window.addEventListener("naturion:open-echo-overworld", loadTotemRunReset);
