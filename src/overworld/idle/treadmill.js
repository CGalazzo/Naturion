const STYLE_ID = "idleTreadmillCss";
const PATCH_STYLE_ID = "idleTreadmillPatchCss";
const SCREEN_ID = "echoOverworldScreen";
const bridge = () => window.NaturionOverworldBridge;

const appendStylesheet = (id, href) => {
  const existing = document.getElementById(id);
  if (existing) {
    if (existing.getAttribute("href") !== href) existing.setAttribute("href", href);
    return;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
};

const ensureStyles = () => {
  appendStylesheet(STYLE_ID, "src/overworld/idle/treadmill.css?v=3");
  appendStylesheet(PATCH_STYLE_ID, "src/overworld/idle/treadmill-patch.css?v=3");
};

const layerMarkup = (depth) => `
  <div class="idle-treadmill-layer idle-treadmill-${depth}">
    <div class="idle-treadmill-strip"><span></span><span></span><span></span><span></span></div>
  </div>`;

const loadRequestedBackground = async (scene) => {
  try {
    const { getTreadmillImageUrl } = await import("./treadmill-image.js?v=3");
    const url = getTreadmillImageUrl();
    const image = new Image();
    image.src = url;
    if (typeof image.decode === "function") await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    scene.style.setProperty("--treadmill-image", `url("${url}")`);
    scene.dataset.treadmillImageReady = "true";
  } catch (error) {
    scene.dataset.treadmillImageReady = "false";
    console.error("A imagem solicitada da esteira não pôde ser carregada; o fundo de segurança foi mantido.", error);
  }
};

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
  heroBox.dataset.variant = snapshot.character === "female" ? "female" : "male";
  heroBox.setAttribute("aria-label", `${snapshot.name || "Protagonista"} caminhando para a direita`);
  scene.querySelector(".idle-followers")?.setAttribute("aria-label", "Naturion ativo acompanhando atrás do protagonista");
  scene.dataset.treadmillReady = "true";
  void loadRequestedBackground(scene);
  return true;
};

const enhanceAfterOpen = () => requestAnimationFrame(() => {
  if (!enhanceScene()) window.setTimeout(enhanceScene, 80);
});

window.addEventListener("naturion:open-echo-overworld", enhanceAfterOpen);
if (document.getElementById(SCREEN_ID)?.querySelector(".idle-scene")) enhanceScene();
