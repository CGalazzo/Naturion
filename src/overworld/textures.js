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

const loadTexture = (key, url, options = {}) => {
  if (textureCache.has(key)) return textureCache.get(key);
  const texture = configureTexture(textureLoader.load(url), options);
  texture.name = key;
  textureCache.set(key, texture);
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
  ground: loadTexture("bosque-ground", "assets/overworld/bosque-luminal/ground.webp"),
  foreground: loadTexture("bosque-foreground", "assets/overworld/bosque-luminal/foreground.webp"),
  shadows: loadTexture("bosque-shadows", "assets/overworld/bosque-luminal/shadows.webp"),
  collisionMask: loadTexture("bosque-collision-mask", "assets/overworld/bosque-luminal/collision-mask.png", { colorSpace: THREE.NoColorSpace }),
  depthMask: loadTexture("bosque-depth-mask", "assets/overworld/bosque-luminal/depth-mask.png", { colorSpace: THREE.NoColorSpace }),
  waterAtlas: loadTexture("bosque-water-frames", "assets/overworld/bosque-luminal/water-frames.webp"),
  grassAtlas: loadTexture("bosque-grass-frames", "assets/overworld/bosque-luminal/grass-frames.webp"),
  effectsAtlas: loadTexture("bosque-effects-frames", "assets/overworld/bosque-luminal/effects.webp")
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
  fog: options.fog ?? false,
  toneMapped: false
});

export const disposeOverworldTextures = () => {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
};
