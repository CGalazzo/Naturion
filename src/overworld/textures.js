import { THREE } from "./engine.js";

const textureCache = new Map();
const atlasFrameCache = new Map();

const loadTexture = (path) => {
  if (textureCache.has(path)) return textureCache.get(path);
  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  textureCache.set(path, texture);
  return texture;
};

export const cloneAtlasTexture = (texture, columns, rows, column = 0, row = 0, key = "") => {
  const cacheKey = key || `${texture.uuid}:${columns}:${rows}:${column}:${row}`;
  if (atlasFrameCache.has(cacheKey)) return atlasFrameCache.get(cacheKey);
  const clone = texture.clone();
  clone.needsUpdate = true;
  clone.repeat.set(1 / columns, 1 / rows);
  clone.offset.set(column / columns, 1 - (row + 1) / rows);
  clone.magFilter = THREE.NearestFilter;
  clone.minFilter = THREE.NearestFilter;
  clone.generateMipmaps = false;
  atlasFrameCache.set(cacheKey, clone);
  return clone;
};

const tileFrame = (atlas, index, key) => cloneAtlasTexture(atlas, 4, 2, index % 4, Math.floor(index / 4), key);
const environmentFrame = (atlas, index, key) => cloneAtlasTexture(atlas, 4, 4, index % 4, Math.floor(index / 4), key);

export const createOverworldTextures = () => {
  const tiles = loadTexture("assets/overworld/tiles/tiles-atlas.png");
  const environment = loadTexture("assets/overworld/environment/environment-atlas.png");
  return {
    grass: tileFrame(tiles, 0, "tile-grass"),
    path: tileFrame(tiles, 1, "tile-path"),
    stone: tileFrame(tiles, 2, "tile-stone"),
    shore: tileFrame(tiles, 3, "tile-shore"),
    waterFrames: [4, 5, 6].map((index) => tileFrame(tiles, index, `tile-water-${index - 4}`)),
    tree: [0, 1, 2, 3].map((index) => environmentFrame(environment, index, `environment-tree-${index}`)),
    houses: {
      red: environmentFrame(environment, 4, "environment-house-red"),
      blue: environmentFrame(environment, 5, "environment-house-blue")
    },
    gate: environmentFrame(environment, 6, "environment-gate"),
    altar: environmentFrame(environment, 7, "environment-altar"),
    fence: environmentFrame(environment, 8, "environment-fence"),
    sign: environmentFrame(environment, 9, "environment-sign"),
    rock: environmentFrame(environment, 10, "environment-rock"),
    tallGrass: environmentFrame(environment, 11, "environment-tall-grass"),
    flowers: environmentFrame(environment, 12, "environment-flowers"),
    heroMale: loadTexture("assets/overworld/characters/hero-male/hero-male-sheet.png"),
    heroFemale: loadTexture("assets/overworld/characters/hero-female/hero-female-sheet.png"),
    npcs: loadTexture("assets/overworld/characters/npcs/npc-sheet.png")
  };
};

export const createPixelMaterial = (texture, { transparent = false, alphaTest = 0, side = THREE.FrontSide, color = 0xffffff } = {}) => new THREE.MeshLambertMaterial({
  map: texture, color, transparent, alphaTest, side, flatShading: true
});

export const createSpriteMaterial = (texture, options = {}) => new THREE.SpriteMaterial({
  map: texture,
  transparent: true,
  alphaTest: options.alphaTest ?? 0.06,
  depthWrite: options.depthWrite ?? true,
  depthTest: options.depthTest ?? true,
  color: options.color ?? 0xffffff,
  fog: options.fog ?? true
});

export const disposeOverworldTextures = () => {
  atlasFrameCache.forEach((texture) => texture.dispose());
  atlasFrameCache.clear();
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
};
