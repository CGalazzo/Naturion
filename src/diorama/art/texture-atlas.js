import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";

const textureCache = new Map();

const hex = (value) => `#${value.toString(16).padStart(6, "0")}`;

const setupCanvas = (size, base) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  context.fillStyle = typeof base === "number" ? hex(base) : base;
  context.fillRect(0, 0, size, size);
  return { canvas, context };
};

const rect = (context, color, x, y, width, height) => {
  context.fillStyle = typeof color === "number" ? hex(color) : color;
  context.fillRect(x, y, width, height);
};

const polygon = (context, color, points) => {
  context.fillStyle = typeof color === "number" ? hex(color) : color;
  context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath();
  context.fill();
};

const finish = (key, canvas) => {
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

const clusteredGrass = (key, palette, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[1]);
  const clusters = [
    [1, 2, 7, 3], [12, 1, 5, 4], [21, 3, 9, 3], [5, 10, 8, 4],
    [17, 9, 6, 3], [25, 13, 5, 5], [0, 20, 10, 4], [13, 21, 9, 5], [24, 25, 8, 4]
  ];
  clusters.forEach(([x, y, w, h], index) => rect(context, palette[index % 2 ? 2 : 0], x, y, w, h));
  [[4, 5], [15, 5], [27, 8], [9, 16], [20, 16], [4, 27], [18, 29]].forEach(([x, y], index) => {
    rect(context, palette[3], x, y, 2, 4);
    rect(context, index % 2 ? palette[4] : palette[2], x + 2, y - 1, 2, 3);
  });
  return finish(key, canvas);
};

const clusteredEarth = (key, palette, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[1]);
  [[0, 4, 12, 5], [17, 1, 13, 6], [5, 14, 10, 5], [20, 13, 12, 5], [0, 25, 15, 7], [19, 25, 13, 6]].forEach(([x, y, w, h], index) => {
    rect(context, index % 2 ? palette[2] : palette[0], x, y, w, h);
  });
  [[3, 9, 6, 2], [13, 8, 5, 2], [24, 9, 7, 2], [7, 20, 7, 2], [18, 21, 9, 2]].forEach(([x, y, w, h]) => rect(context, palette[3], x, y, w, h));
  return finish(key, canvas);
};

const clusteredStone = (key, palette, moss = false, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[1]);
  polygon(context, palette[0], [[0, 0], [13, 0], [10, 8], [0, 10]]);
  polygon(context, palette[2], [[13, 0], [32, 0], [32, 11], [24, 9], [18, 13], [10, 8]]);
  polygon(context, palette[0], [[0, 10], [10, 8], [18, 13], [14, 23], [0, 22]]);
  polygon(context, palette[3], [[18, 13], [24, 9], [32, 11], [32, 27], [22, 25], [14, 23]]);
  polygon(context, palette[1], [[0, 22], [14, 23], [22, 25], [32, 27], [32, 32], [0, 32]]);
  rect(context, palette[3], 4, 4, 5, 2);
  rect(context, palette[0], 20, 18, 7, 2);
  if (moss) {
    rect(context, ART_DIRECTION.palette.mossStone[2], 0, 0, 11, 3);
    rect(context, ART_DIRECTION.palette.mossStone[3], 5, 3, 7, 2);
    rect(context, ART_DIRECTION.palette.mossStone[1], 25, 0, 7, 4);
  }
  return finish(key, canvas);
};

const clusteredBark = (key, palette, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[1]);
  [[2, 0, 4, 16], [11, 0, 5, 12], [21, 0, 4, 18], [28, 0, 3, 14], [5, 20, 5, 12], [17, 16, 5, 16], [27, 20, 4, 12]].forEach(([x, y, w, h], index) => rect(context, index % 2 ? palette[2] : palette[0], x, y, w, h));
  [[0, 13, 8, 3], [9, 10, 10, 3], [18, 22, 12, 3], [2, 28, 9, 2]].forEach(([x, y, w, h]) => rect(context, palette[3], x, y, w, h));
  return finish(key, canvas);
};

const clusteredLeaves = (key, palette, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[1]);
  [[0, 0, 9, 8], [10, 1, 10, 6], [22, 0, 10, 10], [3, 11, 12, 8], [17, 10, 12, 9], [0, 22, 9, 10], [10, 21, 9, 8], [21, 22, 11, 10]].forEach(([x, y, w, h], index) => rect(context, palette[index % 3 === 0 ? 0 : index % 2 ? 2 : 1], x, y, w, h));
  [[4, 3, 4, 3], [14, 2, 4, 3], [25, 4, 5, 3], [7, 13, 5, 3], [20, 12, 5, 3], [3, 24, 4, 3], [13, 23, 5, 3], [24, 25, 5, 3]].forEach(([x, y, w, h], index) => rect(context, index % 2 ? palette[3] : palette[4], x, y, w, h));
  return finish(key, canvas);
};

const clusteredWater = (key, palette, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[1]);
  [[0, 3, 13, 3], [18, 2, 12, 3], [5, 10, 17, 3], [24, 11, 8, 3], [0, 18, 10, 3], [14, 19, 14, 3], [4, 27, 18, 3], [25, 26, 7, 3]].forEach(([x, y, w, h], index) => rect(context, index % 2 ? palette[2] : palette[0], x, y, w, h));
  [[2, 1, 6, 2], [20, 7, 8, 2], [8, 15, 10, 2], [1, 24, 7, 2], [22, 23, 8, 2]].forEach(([x, y, w, h]) => rect(context, palette[3], x, y, w, h));
  [[5, 0, 4, 1], [25, 6, 4, 1], [12, 14, 5, 1], [3, 23, 4, 1], [26, 22, 4, 1]].forEach(([x, y, w, h]) => rect(context, palette[4], x, y, w, h));
  return finish(key, canvas);
};

const clusteredCrystal = (key, palette, size = 32) => {
  const { canvas, context } = setupCanvas(size, palette[0]);
  polygon(context, palette[1], [[0, 4], [12, 0], [17, 8], [11, 16], [0, 13]]);
  polygon(context, palette[2], [[12, 0], [32, 3], [27, 15], [17, 8]]);
  polygon(context, palette[1], [[11, 16], [17, 8], [27, 15], [24, 31], [7, 32]]);
  polygon(context, palette[3], [[17, 8], [24, 5], [22, 15], [17, 19], [14, 14]]);
  rect(context, "rgba(255,255,255,.7)", 19, 6, 3, 7);
  return finish(key, canvas);
};

export const createTextureAtlas = () => {
  const cached = textureCache.get("atlas-bundle");
  if (cached) return cached;
  const palette = ART_DIRECTION.palette;
  const atlas = {
    grass: clusteredGrass("grass-cluster", palette.grass),
    grassLight: clusteredGrass("grass-warm-cluster", [...palette.grassWarm, palette.grass[4]]),
    dirt: clusteredEarth("earth-cluster", palette.earth),
    earthSide: clusteredEarth("earth-side-cluster", [palette.earth[0], palette.earth[1], palette.earth[2], palette.bark[2]]),
    path: clusteredEarth("path-cluster", palette.path),
    wetSoil: clusteredEarth("wet-soil-cluster", palette.wetSoil),
    stone: clusteredStone("stone-cluster", palette.stone),
    stoneDark: clusteredStone("stone-dark-cluster", [palette.deepShadow, palette.stone[0], palette.stone[1], palette.stone[2]]),
    mossStone: clusteredStone("moss-stone-cluster", palette.stone, true),
    bark: clusteredBark("bark-cluster", palette.bark),
    barkDark: clusteredBark("bark-dark-cluster", [palette.deepShadow, palette.bark[0], palette.bark[1], palette.bark[2]]),
    leaf: clusteredLeaves("leaf-cluster", palette.leaf),
    leafLight: clusteredLeaves("leaf-light-cluster", [palette.leaf[1], palette.leaf[2], palette.leaf[3], palette.leaf[4], 0xb6df7b]),
    leafAncient: clusteredLeaves("leaf-ancient-cluster", [palette.deepShadow, palette.leaf[0], palette.leaf[1], palette.leaf[2], palette.leafMagic[2]]),
    leafMagic: clusteredLeaves("leaf-magic-cluster", [...palette.leafMagic, palette.crystal[3]]),
    wood: clusteredBark("wood-cluster", [palette.bark[0], palette.bark[1], palette.bark[2], palette.bark[3]]),
    rope: clusteredBark("rope-cluster", [0x65513d, 0x887154, 0xb29668, 0xd1b883], 16),
    water: clusteredWater("water-cluster", palette.water),
    waterFoam: clusteredWater("water-foam-cluster", [0x184f5b, 0x2b7d89, 0x58b9b4, 0x9ce0cd, 0xe1ffe7]),
    crystal: clusteredCrystal("crystal-cluster", palette.crystal),
    rune: clusteredStone("rune-cluster", [palette.deepShadow, palette.stone[0], palette.stone[1], palette.crystal[2]]),
    gold: clusteredCrystal("gold-cluster", palette.gold)
  };
  textureCache.set("atlas-bundle", atlas);
  return atlas;
};

export const cloneRepeatedTexture = (texture, x = 1, y = 1) => {
  const copy = texture.clone();
  copy.wrapS = THREE.RepeatWrapping;
  copy.wrapT = THREE.RepeatWrapping;
  copy.repeat.set(x, y);
  copy.magFilter = THREE.NearestFilter;
  copy.minFilter = THREE.NearestFilter;
  copy.generateMipmaps = false;
  copy.needsUpdate = true;
  return copy;
};

export const disposeTextureAtlas = () => {
  const unique = new Set();
  textureCache.forEach((value) => {
    if (value?.isTexture) unique.add(value);
    else if (value && typeof value === "object") Object.values(value).forEach((texture) => texture?.isTexture && unique.add(texture));
  });
  unique.forEach((texture) => texture.dispose());
  textureCache.clear();
};
