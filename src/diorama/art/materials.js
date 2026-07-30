import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";
import { createTextureAtlas, cloneRepeatedTexture, disposeTextureAtlas } from "./texture-atlas.js";
import { createToonMaterial, disposeToonResources } from "./toon-materials.js";

const materialCache = new Map();

const cachedMaterial = (key, factory) => {
  if (!materialCache.has(key)) materialCache.set(key, factory());
  return materialCache.get(key);
};

const repeatToon = (key, texture, repeatX, repeatY, options = {}) => cachedMaterial(key, () => createToonMaterial({
  map: cloneRepeatedTexture(texture, repeatX, repeatY),
  ...options
}));

export const createDioramaMaterials = () => {
  const textures = createTextureAtlas();
  const palette = ART_DIRECTION.palette;
  return {
    textures,
    grass: repeatToon("mat-grass", textures.grass, 7, 6),
    grassLight: repeatToon("mat-grass-light", textures.grassLight, 6, 5),
    dirt: repeatToon("mat-dirt", textures.dirt, 5, 5),
    earthSide: repeatToon("mat-earth-side", textures.earthSide, 7, 4),
    path: repeatToon("mat-path", textures.path, 5, 4),
    wetSoil: repeatToon("mat-wet-soil", textures.wetSoil, 4, 4),
    stone: repeatToon("mat-stone", textures.stone, 3, 3),
    stoneDark: repeatToon("mat-stone-dark", textures.stoneDark, 3, 3),
    mossStone: repeatToon("mat-moss-stone", textures.mossStone, 3, 3),
    bark: repeatToon("mat-bark", textures.bark, 2, 4),
    barkDark: repeatToon("mat-bark-dark", textures.barkDark, 2, 4),
    leaf: repeatToon("mat-leaf", textures.leaf, 3, 3),
    leafLight: repeatToon("mat-leaf-light", textures.leafLight, 3, 3),
    leafAncient: repeatToon("mat-leaf-ancient", textures.leafAncient, 3, 3),
    leafMagic: repeatToon("mat-leaf-magic", textures.leafMagic, 3, 3, { emissive: palette.crystal[0], emissiveIntensity: 0.12 }),
    wood: repeatToon("mat-wood", textures.wood, 2, 4),
    rope: repeatToon("mat-rope", textures.rope, 1, 5),
    water: repeatToon("mat-water", textures.water, 5, 4, { transparent: true, opacity: 0.92, depthWrite: false }),
    waterFoam: cachedMaterial("mat-water-foam", () => new THREE.MeshBasicMaterial({
      map: cloneRepeatedTexture(textures.waterFoam, 4, 3),
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      side: THREE.DoubleSide
    })),
    crystal: repeatToon("mat-crystal", textures.crystal, 1, 1, {
      color: palette.crystal[3],
      transparent: true,
      opacity: 0.96,
      emissive: palette.crystal[1],
      emissiveIntensity: 0.72
    }),
    rune: repeatToon("mat-rune", textures.rune, 2, 2, { emissive: palette.crystal[0], emissiveIntensity: 0.3 }),
    gold: repeatToon("mat-gold", textures.gold, 1, 1, { emissive: palette.gold[0], emissiveIntensity: 0.22 }),
    clone(material, overrides = {}) {
      const copy = material.clone();
      Object.assign(copy, overrides);
      copy.needsUpdate = true;
      return copy;
    },
    tint(material, color, key = "") {
      const cacheKey = `tint-${material.uuid}-${String(color)}-${key}`;
      if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
      const copy = material.clone();
      copy.color = new THREE.Color(color);
      copy.needsUpdate = true;
      materialCache.set(cacheKey, copy);
      return copy;
    }
  };
};

export const disposeDioramaMaterials = () => {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
  disposeTextureAtlas();
  disposeToonResources();
};
