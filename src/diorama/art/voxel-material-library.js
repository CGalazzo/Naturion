import { THREE } from "../engine.js";
import { createVoxelTextureAtlas, disposeVoxelTextureAtlas } from "./voxel-texture-atlas.js";

const materialCache = new Map();
let libraryCache = null;

const makeMaterial = (key, map, options = {}) => {
  if (materialCache.has(key)) return materialCache.get(key);
  const material = new THREE.MeshLambertMaterial({
    map,
    color: options.color ?? 0xffffff,
    flatShading: true,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    alphaTest: options.alphaTest ?? 0,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1
  });
  materialCache.set(key, material);
  return material;
};

const faceSet = (side, top = side, bottom = side) => [side, side, top, bottom, side, side];

const parseHex = (hex) => {
  const value = typeof hex === "number" ? hex : Number.parseInt(String(hex).replace("#", ""), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const mixColor = (a, b, amount) => {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const mix = (from, to) => Math.round(from + (to - from) * amount);
  return `rgb(${mix(ca.r, cb.r)}, ${mix(ca.g, cb.g)}, ${mix(ca.b, cb.b)})`;
};

export const createDioramaMaterials = () => {
  if (libraryCache) return libraryCache;
  const { textures, waterFrames } = createVoxelTextureAtlas();
  const materials = {
    grassTop: makeMaterial("def-grass-top", textures.grassTop),
    grassSide: makeMaterial("def-grass-side", textures.grassSide),
    dirt: makeMaterial("def-dirt", textures.dirt),
    rootDirt: makeMaterial("def-root-dirt", textures.rootDirt),
    earthSide: makeMaterial("def-earth-side", textures.rootDirt),
    darkDirt: makeMaterial("def-dark-dirt", textures.darkDirt),
    stone: makeMaterial("def-stone", textures.stone),
    stoneDark: makeMaterial("def-deep-stone", textures.deepStone),
    mossStone: makeMaterial("def-moss-stone", textures.mossStone),
    path: makeMaterial("def-path", textures.path),
    pathStone: makeMaterial("def-path-stone", textures.pathStone),
    wetSoil: makeMaterial("def-mud", textures.mud),
    shore: makeMaterial("def-shore", textures.shore),
    barkYoung: makeMaterial("def-bark-young", textures.barkYoung),
    bark: makeMaterial("def-bark-common", textures.barkCommon),
    barkDark: makeMaterial("def-bark-ancient", textures.barkAncient),
    leafLight: makeMaterial("def-leaf-young", textures.leafYoung),
    leaf: makeMaterial("def-leaf-common", textures.leafCommon),
    leafAncient: makeMaterial("def-leaf-ancient", textures.leafAncient),
    leafLuminal: makeMaterial("def-leaf-luminal", textures.leafLuminal),
    wood: makeMaterial("def-wood", textures.wood),
    cutWood: makeMaterial("def-cut-wood", textures.cutWood),
    rope: makeMaterial("def-rope", textures.rope),
    rune: makeMaterial("def-rune", textures.rune, { emissive: 0x164c43, emissiveIntensity: 0.34 }),
    crystal: makeMaterial("def-crystal", textures.crystal, { color: 0xd0fff0, transparent: true, opacity: 0.95, emissive: 0x176f68, emissiveIntensity: 0.6 }),
    flowerGold: makeMaterial("def-flower-gold", textures.flowerGold, { transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }),
    flowerViolet: makeMaterial("def-flower-violet", textures.flowerViolet, { transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }),
    water: makeMaterial("def-water", waterFrames[0], { transparent: false, opacity: 1, depthWrite: true }),
    waterFoam: makeMaterial("def-water-foam", waterFrames[2], { transparent: true, opacity: 0.72, depthWrite: false }),
    waterFrames,
    grass: null,
    grassLight: null,
    blockFaces(top, side, bottom = side) {
      return faceSet(side, top, bottom);
    },
    clone(material, overrides = {}) {
      const copy = material.clone();
      Object.assign(copy, overrides);
      copy.needsUpdate = true;
      return copy;
    },
    tint(material, color, key = "") {
      const cacheKey = `def-tint-${material.uuid}-${String(color)}-${key}`;
      if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
      const copy = material.clone();
      copy.color = new THREE.Color(color);
      materialCache.set(cacheKey, copy);
      return copy;
    },
    mixColor
  };
  materials.grass = materials.grassTop;
  materials.grassLight = materials.tint(materials.grassTop, 0xa8d57b, "grass-light");
  materials.grassBlock = faceSet(materials.grassSide, materials.grassTop, materials.dirt);
  materials.grassLightBlock = faceSet(materials.grassSide, materials.grassLight, materials.dirt);
  materials.dirtBlock = faceSet(materials.dirt);
  materials.rootDirtBlock = faceSet(materials.rootDirt);
  materials.stoneBlock = faceSet(materials.stone);
  materials.deepStoneBlock = faceSet(materials.stoneDark);
  materials.mossStoneBlock = faceSet(materials.stone, materials.mossStone, materials.stoneDark);
  materials.pathBlock = faceSet(materials.dirt, materials.path, materials.dirt);
  materials.pathStoneBlock = faceSet(materials.stone, materials.pathStone, materials.stoneDark);
  materials.mudBlock = faceSet(materials.wetSoil);
  materials.shoreBlock = faceSet(materials.wetSoil, materials.shore, materials.dirt);
  libraryCache = materials;
  return materials;
};

export const disposeDioramaMaterials = () => {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
  libraryCache = null;
  disposeVoxelTextureAtlas();
};
