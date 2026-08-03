const STYLE_ID = "idleTreadmillCss";
const SCREEN_ID = "echoOverworldScreen";

const bridge = () => window.NaturionOverworldBridge;

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = "src/overworld/idle/treadmill.css?v=1";
  document.head.append(link);
};

const layerMarkup = (depth) => `
  <div class="idle-treadmill-layer idle-treadmill-${depth}">
    <div class="idle-treadmill-strip">
      <span></span><span></span><span></span><span></span>
    </div>
  </div>`;

const enhanceScene = () => {
  const screen = document.getElementById(SCREEN_ID);
  const scene = screen?.querySelector(".idle-scene");
  const heroBox = scene?.querySelector(".idle-hero-box");
  const staticHero = heroBox?.querySelector(".idle-hero");
  if (!scene || !heroBox || !staticHero) return false;

  ensureStyles();

  if (!scene.querySelector(".idle-treadmill")) {
    const treadmill = document.createElement("div");
    treadmill.className = "idle-treadmill";
    treadmill.setAttribute("aria-hidden", "true");
    treadmill.innerHTML = ["far", "mid", "near"].map(layerMarkup).join("");
    scene.prepend(treadmill);
  }

  staticHero.classList.add("idle-hero-static");

  let walkSprite = heroBox.querySelector(".idle-hero-walk");
  if (!walkSprite) {
    walkSprite = document.createElement("span");
    walkSprite.className = "idle-hero-walk";
    walkSprite.setAttribute("aria-hidden", "true");
    heroBox.append(walkSprite);
  }

  const snapshot = bridge()?.getPlayer?.() || {};
  const variant = snapshot.character === "female" ? "female" : "male";
  heroBox.dataset.variant = variant;
  heroBox.setAttribute("aria-label", `${snapshot.name || "Protagonista"} caminhando para a direita`);

  const followers = scene.querySelector(".idle-followers");
  if (followers) followers.setAttribute("aria-label", "Naturion ativo acompanhando atrás do protagonista");

  scene.dataset.treadmillReady = "true";
  return true;
};

const enhanceAfterOpen = () => {
  requestAnimationFrame(() => {
    if (enhanceScene()) return;
    window.setTimeout(enhanceScene, 80);
  });
};

window.addEventListener("naturion:open-echo-overworld", enhanceAfterOpen);

// Protege retomadas por hot reload ou cache em que a tela já esteja montada.
if (document.getElementById(SCREEN_ID)?.querySelector(".idle-scene")) enhanceScene();
