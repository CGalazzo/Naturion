import { THREE } from "../engine.js";

const textureCache = new Map();
const materialCache = new Map();

const hash = (value) => {
  let seed = value | 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return (seed ^ (seed >>> 16)) >>> 0;
};

const seeded = (seed) => {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const parseHex = (hex) => {
  const value = typeof hex === "number" ? hex : Number.parseInt(String(hex).replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const mixColor = (a, b, amount) => {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const mix = (from, to) => Math.round(from + (to - from) * amount);
  return `rgb(${mix(ca.r, cb.r)}, ${mix(ca.g, cb.g)}, ${mix(ca.b, cb.b)})`;
};

const paintPixelTexture = ({
  key,
  size = 32,
  base,
  light,
  dark,
  accent,
  seed = 1,
  density = 0.16,
  horizontal = false,
  vertical = false,
  speckles = true
}) => {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  const random = seeded(seed);

  if (horizontal) {
    for (let y = 2; y < size; y += 5) {
      context.fillStyle = random() > 0.5 ? dark : light;
      context.fillRect(0, y, size, 1);
      if (accent && random() > 0.45) {
        context.fillStyle = accent;
        context.fillRect(Math.floor(random() * size * 0.7), y + 1, 3 + Math.floor(random() * 7), 1);
      }
    }
  }

  if (vertical) {
    for (let x = 2; x < size; x += 6) {
      context.fillStyle = random() > 0.5 ? dark : light;
      context.fillRect(x, 0, 1, size);
      if (accent && random() > 0.5) {
        context.fillStyle = accent;
        context.fillRect(x + 1, Math.floor(random() * size * 0.7), 1, 4 + Math.floor(random() * 8));
      }
    }
  }

  if (speckles) {
    const count = Math.round(size * size * density);
    for (let index = 0; index < count; index += 1) {
      const x = Math.floor(random() * size);
      const y = Math.floor(random() * size);
      const roll = random();
      context.fillStyle = roll > 0.72 && accent ? accent : roll > 0.42 ? light : dark;
      const pixel = random() > 0.87 ? 2 : 1;
      context.fillRect(x, y, pixel, pixel);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

const makeMaterial = (key, texture, options = {}) => {
  if (materialCache.has(key)) return materialCache.get(key);
  const material = new THREE.MeshLambertMaterial({
    map: texture,
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

const configureRepeat = (texture, x, y) => {
  const copy = texture.clone();
  copy.needsUpdate = true;
  copy.repeat.set(x, y);
  copy.offset.set(0, 0);
  return copy;
};

export const createDioramaMaterials = () => {
  const textures = {
    grass: paintPixelTexture({ key: "grass", base: "#4f9448", light: "#6fb858", dark: "#326f3c", accent: "#91cc62", seed: 11, density: 0.2 }),
    grassLight: paintPixelTexture({ key: "grass-light", base: "#65a650", light: "#85c866", dark: "#428044", accent: "#b2db75", seed: 12, density: 0.19 }),
    dirt: paintPixelTexture({ key: "dirt", base: "#775234", light: "#9c7147", dark: "#4f3627", accent: "#c0925c", seed: 21, density: 0.21 }),
    earthSide: paintPixelTexture({ key: "earth-side", base: "#5c422d", light: "#7a5839", dark: "#372a22", accent: "#a07143", seed: 23, density: 0.12, horizontal: true }),
    path: paintPixelTexture({ key: "path", base: "#ad8755", light: "#d2aa6c", dark: "#765938", accent: "#e2c286", seed: 31, density: 0.17 }),
    wetSoil: paintPixelTexture({ key: "wet-soil", base: "#594936", light: "#76634a", dark: "#35342b", accent: "#78916d", seed: 32, density: 0.18 }),
    stone: paintPixelTexture({ key: "stone", base: "#69766d", light: "#93a08f", dark: "#414c47", accent: "#a5b0a0", seed: 41, density: 0.16, horizontal: true }),
    stoneDark: paintPixelTexture({ key: "stone-dark", base: "#48534d", light: "#65736a", dark: "#29322f", accent: "#849188", seed: 42, density: 0.15 }),
    mossStone: paintPixelTexture({ key: "moss-stone", base: "#5f6d62", light: "#87977f", dark: "#3b4741", accent: "#618f4b", seed: 43, density: 0.22 }),
    bark: paintPixelTexture({ key: "bark", base: "#70492f", light: "#986642", dark: "#422d24", accent: "#ba7d4c", seed: 51, density: 0.12, vertical: true }),
    barkDark: paintPixelTexture({ key: "bark-dark", base: "#503729", light: "#76513a", dark: "#2d2520", accent: "#8f6544", seed: 52, density: 0.1, vertical: true }),
    leaf: paintPixelTexture({ key: "leaf", base: "#2f7440", light: "#4e9850", dark: "#1f5035", accent: "#72b858", seed: 61, density: 0.24 }),
    leafLight: paintPixelTexture({ key: "leaf-light", base: "#4c9248", light: "#72b75a", dark: "#2c653b", accent: "#9acf67", seed: 62, density: 0.23 }),
    leafAncient: paintPixelTexture({ key: "leaf-ancient", base: "#245f43", light: "#477f52", dark: "#193d32", accent: "#6aa05b", seed: 63, density: 0.22 }),
    wood: paintPixelTexture({ key: "wood", base: "#8a5b37", light: "#b47b48", dark: "#573a2a", accent: "#d39a5a", seed: 71, density: 0.08, horizontal: true, vertical: true }),
    rope: paintPixelTexture({ key: "rope", base: "#a8895c", light: "#c8ac78", dark: "#6b563c", accent: "#e0c48d", seed: 72, density: 0.08, vertical: true }),
    water: paintPixelTexture({ key: "water", base: "#2c8f9a", light: "#58c0bd", dark: "#1d6174", accent: "#94ddd2", seed: 81, density: 0.12, horizontal: true }),
    waterFoam: paintPixelTexture({ key: "water-foam", base: "rgba(57,151,162,.12)", light: "rgba(179,241,221,.8)", dark: "rgba(29,97,116,.08)", accent: "rgba(230,255,238,.95)", seed: 82, density: 0.08, horizontal: true }),
    crystal: paintPixelTexture({ key: "crystal", base: "#58d7d2", light: "#d2fff1", dark: "#267c8d", accent: "#fff0a5", seed: 91, density: 0.16 }),
    rune: paintPixelTexture({ key: "rune", base: "#4b645a", light: "#88a88f", dark: "#293a34", accent: "#75f0ce", seed: 92, density: 0.12 })
  };

  return {
    textures,
    grass: makeMaterial("mat-grass", configureRepeat(textures.grass, 8, 7)),
    grassLight: makeMaterial("mat-grass-light", configureRepeat(textures.grassLight, 5, 5)),
    dirt: makeMaterial("mat-dirt", configureRepeat(textures.dirt, 6, 5)),
    earthSide: makeMaterial("mat-earth-side", configureRepeat(textures.earthSide, 8, 3)),
    path: makeMaterial("mat-path", configureRepeat(textures.path, 4, 3)),
    wetSoil: makeMaterial("mat-wet-soil", configureRepeat(textures.wetSoil, 4, 4)),
    stone: makeMaterial("mat-stone", configureRepeat(textures.stone, 3, 3)),
    stoneDark: makeMaterial("mat-stone-dark", configureRepeat(textures.stoneDark, 3, 3)),
    mossStone: makeMaterial("mat-moss-stone", configureRepeat(textures.mossStone, 3, 3)),
    bark: makeMaterial("mat-bark", configureRepeat(textures.bark, 2, 4)),
    barkDark: makeMaterial("mat-bark-dark", configureRepeat(textures.barkDark, 2, 4)),
    leaf: makeMaterial("mat-leaf", configureRepeat(textures.leaf, 3, 3)),
    leafLight: makeMaterial("mat-leaf-light", configureRepeat(textures.leafLight, 3, 3)),
    leafAncient: makeMaterial("mat-leaf-ancient", configureRepeat(textures.leafAncient, 3, 3)),
    wood: makeMaterial("mat-wood", configureRepeat(textures.wood, 2, 4)),
    rope: makeMaterial("mat-rope", configureRepeat(textures.rope, 1, 4)),
    water: makeMaterial("mat-water", configureRepeat(textures.water, 5, 4), { transparent: true, opacity: 0.9, depthWrite: false }),
    waterFoam: makeMaterial("mat-water-foam", configureRepeat(textures.waterFoam, 4, 3), { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
    crystal: makeMaterial("mat-crystal", textures.crystal, { color: 0xc6fff2, transparent: true, opacity: 0.94, emissive: 0x226f69, emissiveIntensity: 0.65 }),
    rune: makeMaterial("mat-rune", textures.rune, { emissive: 0x164c43, emissiveIntensity: 0.35 }),
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
      materialCache.set(cacheKey, copy);
      return copy;
    },
    mixColor
  };
};

export const disposeDioramaMaterials = () => {
  textureCache.forEach((texture) => texture.dispose());
  materialCache.forEach((material) => material.dispose());
  textureCache.clear();
  materialCache.clear();
};
