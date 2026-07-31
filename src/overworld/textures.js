import { THREE } from "./engine.js";

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

const configureTexture = (texture, { colorSpace = THREE.SRGBColorSpace } = {}) => {
  texture.colorSpace = colorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
};

export const loadPixelTexture = (key, url, options = {}) => {
  if (textureCache.has(key)) return textureCache.get(key);
  const texture = configureTexture(textureLoader.load(url), options);
  texture.name = key;
  textureCache.set(key, texture);
  return texture;
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
  fallbackGround: loadPixelTexture("bosque-fallback-ground", "assets/overworld/bosque-luminal/ground.webp"),
  validationGround: loadPixelTexture("visual-reset-validation-ground", "assets/overworld/visual-reset/validation/validation-ground.webp"),
  validationOcclusion: loadPixelTexture("visual-reset-validation-occlusion", "assets/overworld/visual-reset/validation/validation-occlusion.png"),
  validationEffects: loadPixelTexture("visual-reset-validation-effects", "assets/overworld/visual-reset/validation/validation-effects.png")
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
  depthWrite: options.depthWrite ?? false,
  depthTest: options.depthTest ?? false,
  color: options.color ?? 0xffffff,
  fog: false,
  toneMapped: false
});

export const disposeOverworldTextures = () => {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
};
