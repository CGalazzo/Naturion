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

// Fase 1: o terreno é construído em 3D por environment.js.
// Nenhuma arte de mapa pré-renderizada é carregada nesta etapa.
export const createOverworldTextures = () => ({});

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
