import { THREE } from "./engine.js";

const textureCache = new Map();

const configureTexture = (texture, { colorSpace = THREE.SRGBColorSpace } = {}) => {
  texture.colorSpace = colorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
};

const paintLoadError = (context, label) => {
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#07150d";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.strokeStyle = "#e8bd35";
  context.lineWidth = 2;
  context.strokeRect(3, 3, context.canvas.width - 6, context.canvas.height - 6);
  context.fillStyle = "#fff8ad";
  context.font = "bold 8px monospace";
  context.textAlign = "center";
  context.fillText("ARTE DO BOSQUE", context.canvas.width / 2, context.canvas.height / 2 - 5);
  context.fillText(label, context.canvas.width / 2, context.canvas.height / 2 + 8);
};

const loadPixelCanvasTexture = (key, url, { transparent = false } = {}) => {
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1024;
  const context = canvas.getContext("2d", { alpha: transparent });
  if (!context) throw new Error("Não foi possível preparar a arte do Bosque Luminal.");
  context.imageSmoothingEnabled = false;
  if (transparent) context.clearRect(0, 0, canvas.width, canvas.height);
  else paintLoadError(context, "CARREGANDO...");

  const texture = configureTexture(new THREE.CanvasTexture(canvas));
  texture.name = key;
  texture.userData.ready = false;
  texture.userData.failed = false;
  textureCache.set(key, texture);

  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => {
    if (image.naturalWidth !== 1536 || image.naturalHeight !== 1024) {
      texture.userData.failed = true;
      if (!transparent) paintLoadError(context, "DIMENSÃO INVÁLIDA");
      texture.needsUpdate = true;
      window.dispatchEvent(new CustomEvent("naturion:overworld-art-error", {
        detail: { url, reason: `Dimensão ${image.naturalWidth}x${image.naturalHeight}` }
      }));
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0);
    texture.userData.ready = true;
    texture.needsUpdate = true;
  }, { once: true });
  image.addEventListener("error", () => {
    texture.userData.failed = true;
    if (!transparent) paintLoadError(context, "NÃO CARREGOU");
    texture.needsUpdate = true;
    window.dispatchEvent(new CustomEvent("naturion:overworld-art-error", {
      detail: { url, reason: "Falha de carregamento" }
    }));
  }, { once: true });
  image.src = url;
  return texture;
};

export const clonePixelTexture = (texture, name = `${texture.name || "pixel"}-clone`) => {
  const clone = texture.clone();
  clone.name = name;
  configureTexture(clone, { colorSpace: texture.colorSpace });
  clone.needsUpdate = true;
  return clone;
};

export const configureAtlasFrame = (texture, {
  columns = 1,
  rows = 1,
  column = 0,
  row = 0
} = {}) => {
  texture.repeat.set(1 / columns, 1 / rows);
  texture.offset.set(column / columns, 1 - ((row + 1) / rows));
  texture.needsUpdate = true;
  return texture;
};

export const createOverworldTextures = () => ({
  ground: loadPixelCanvasTexture(
    "bosque-approved-ground-v2",
    "assets/overworld/bosque-luminal/approved-ground.webp"
  ),
  foreground: loadPixelCanvasTexture(
    "bosque-approved-foreground-v2",
    "assets/overworld/bosque-luminal/approved-foreground.webp",
    { transparent: true }
  )
});

export const createPixelMaterial = (texture, {
  transparent = false,
  alphaTest = 0,
  side = THREE.FrontSide,
  color = 0xffffff,
  depthTest = true,
  depthWrite = true,
  toneMapped = false
} = {}) => new THREE.MeshBasicMaterial({
  map: texture || null,
  color,
  transparent,
  alphaTest,
  side,
  depthTest,
  depthWrite,
  toneMapped
});

export const createSpriteMaterial = (texture, options = {}) => new THREE.SpriteMaterial({
  map: texture,
  transparent: true,
  alphaTest: options.alphaTest ?? 0.05,
  depthWrite: false,
  depthTest: false,
  color: options.color ?? 0xffffff,
  fog: false,
  toneMapped: false
});

export const disposeOverworldTextures = () => {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
};
