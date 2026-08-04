const OPEN_EVENT = "naturion:open-echo-overworld";
const SCREEN_ID = "echoOverworldScreen";

if (!document.getElementById("idlePhaseOneBackgroundFix")) {
  const style = document.createElement("style");
  style.id = "idlePhaseOneBackgroundFix";
  style.textContent = `
    .idle-app::before {
      background-image: url("assets/overworld/clareira-dos-ecos/ground-v2.webp?v=idle-phase1") !important;
    }
    .idle-puzzle::before {
      background-image: url("assets/overworld/clareira-dos-ecos/ground-v2.webp?v=idle-puzzle1") !important;
    }
    #echoOverworldScreen .idle-scene[data-background-recovered="true"] {
      background-color: #092116 !important;
      background-image: var(--idle-recovered-background) !important;
      background-position: center bottom !important;
      background-repeat: no-repeat !important;
      background-size: cover !important;
    }
  `;
  document.head.append(style);
}

const applyRequestedBackground = async () => {
  const scene = document.querySelector(`#${SCREEN_ID} .idle-scene`);
  if (!scene) return false;

  try {
    const { getTreadmillImageUrl } = await import("./treadmill-image.js?v=4");
    const url = getTreadmillImageUrl();
    scene.style.setProperty("--idle-recovered-background", `url("${url}")`);
    scene.dataset.backgroundRecovered = "true";
    return true;
  } catch (error) {
    console.error("[Naturion] Não foi possível aplicar o fundo da Clareira.", error);
    return false;
  }
};

const recoverAfterOpen = () => window.requestAnimationFrame(() => {
  void applyRequestedBackground().then((applied) => {
    if (!applied) window.setTimeout(() => { void applyRequestedBackground(); }, 120);
  });
});

window.addEventListener(OPEN_EVENT, recoverAfterOpen);
if (document.querySelector(`#${SCREEN_ID} .idle-scene`)) void applyRequestedBackground();
