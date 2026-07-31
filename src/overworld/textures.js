import { THREE } from "./engine.js";

const textureCache = new Map();

const createCanvasTexture = (key, width, height, painter, { repeat = true } = {}) => {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  painter(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

const rect = (context, color, x, y, width, height) => {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
};

const tile = (key, base, layers, size = 16) => createCanvasTexture(key, size, size, (context) => {
  rect(context, base, 0, 0, size, size);
  layers.forEach(([color, shapes]) => shapes.forEach(([x, y, width, height]) => rect(context, color, x, y, width, height)));
});

const alphaTile = (key, layers, size = 32) => createCanvasTexture(key, size, size, (context) => {
  layers.forEach(([color, shapes]) => shapes.forEach(([x, y, width, height]) => rect(context, color, x, y, width, height)));
}, { repeat: false });

export const createOverworldTextures = () => {
  const grass = tile("ow3d-grass", "#4b9146", [
    ["#2e6a3b", [[0, 0, 16, 2], [0, 10, 5, 2], [9, 5, 7, 2], [5, 14, 4, 2]]],
    ["#71b957", [[2, 2, 5, 2], [10, 1, 4, 3], [11, 10, 4, 2], [0, 13, 4, 3]]],
    ["#a2d477", [[3, 3, 2, 1], [11, 2, 2, 1], [13, 11, 2, 1], [6, 7, 1, 2]]]
  ]);

  const path = tile("ow3d-path", "#b88d57", [
    ["#805d3d", [[0, 0, 5, 3], [10, 1, 6, 3], [3, 9, 5, 4], [11, 12, 5, 4], [7, 5, 2, 2]]],
    ["#d1a76c", [[4, 3, 4, 3], [9, 5, 4, 3], [0, 11, 4, 4], [7, 13, 3, 3]]],
    ["#6c4d33", [[8, 0, 1, 5], [6, 9, 2, 2], [13, 8, 3, 2]]]
  ]);

  const stone = tile("ow3d-stone", "#74847d", [
    ["#485d57", [[0, 0, 6, 3], [9, 1, 7, 4], [3, 8, 6, 4], [11, 11, 5, 5]]],
    ["#a0aea1", [[2, 3, 5, 3], [10, 5, 4, 3], [0, 12, 4, 3], [7, 13, 3, 2]]],
    ["#31433f", [[7, 0, 1, 5], [8, 6, 1, 6], [5, 12, 1, 4]]],
    ["#4e7856", [[12, 0, 4, 2], [0, 7, 3, 2]]]
  ]);

  const shore = tile("ow3d-shore", "#76684c", [
    ["#4e4b3b", [[0, 0, 6, 4], [10, 2, 6, 5], [4, 11, 8, 5]]],
    ["#a09671", [[3, 3, 5, 3], [0, 9, 5, 3]]],
    ["#62985f", [[0, 0, 16, 2], [12, 7, 4, 2]]]
  ]);

  const wall = tile("ow3d-wall", "#d8bd84", [
    ["#b18e5e", [[0, 0, 16, 2], [0, 8, 16, 2], [0, 15, 16, 1]]],
    ["#f0dda7", [[1, 2, 6, 5], [9, 10, 6, 5]]],
    ["#806244", [[7, 2, 2, 6], [0, 10, 2, 5]]]
  ]);

  const roof = tile("ow3d-roof", "#8f413e", [
    ["#542a34", [[0, 0, 16, 2], [0, 6, 16, 2], [0, 12, 16, 2]]],
    ["#bd5c46", [[0, 2, 7, 4], [9, 8, 7, 4], [2, 14, 7, 2]]],
    ["#e17d59", [[2, 2, 4, 1], [11, 8, 3, 1]]]
  ]);

  const wood = tile("ow3d-wood", "#8d5c38", [
    ["#4d3428", [[0, 2, 16, 2], [0, 8, 16, 2], [0, 14, 16, 2]]],
    ["#b57b49", [[0, 0, 16, 2], [0, 5, 16, 2], [0, 11, 16, 2]]],
    ["#d09a5c", [[3, 1, 6, 1], [8, 6, 5, 1]]]
  ]);

  const bark = tile("ow3d-bark", "#68452f", [
    ["#3c2a26", [[1, 0, 3, 16], [9, 0, 2, 16], [14, 0, 2, 16]]],
    ["#976441", [[4, 0, 4, 16], [11, 0, 3, 16]]],
    ["#bd8050", [[5, 1, 1, 6], [12, 8, 1, 6]]]
  ]);

  const leaf = alphaTile("ow3d-leaf", [
    ["#1c4431", [[6, 1, 20, 3], [2, 5, 28, 20], [6, 25, 20, 5]]],
    ["#357845", [[5, 7, 12, 9], [16, 5, 11, 13], [8, 18, 17, 8]]],
    ["#62a951", [[8, 8, 7, 5], [18, 7, 7, 6], [12, 18, 8, 5]]],
    ["#9bd16f", [[10, 8, 3, 2], [21, 8, 3, 2], [14, 20, 3, 2]]]
  ]);

  const tallGrass = alphaTile("ow3d-tall-grass", [
    ["#214f35", [[4, 14, 3, 16], [10, 8, 3, 22], [17, 11, 3, 19], [24, 5, 3, 25]]],
    ["#438a45", [[6, 10, 3, 20], [13, 4, 3, 26], [20, 8, 3, 22], [27, 13, 2, 17]]],
    ["#83c45f", [[14, 5, 1, 14], [25, 6, 1, 13]]]
  ]);

  const flower = alphaTile("ow3d-flower", [
    ["#2b663c", [[15, 13, 2, 18], [11, 20, 6, 2]]],
    ["#e8b957", [[10, 5, 7, 7], [16, 3, 7, 7], [18, 10, 7, 7], [8, 11, 7, 7]]],
    ["#fff1a5", [[15, 8, 5, 5]]]
  ]);

  const sign = tile("ow3d-sign", "#9b673d", [
    ["#553626", [[0, 0, 16, 2], [0, 14, 16, 2], [0, 0, 2, 16], [14, 0, 2, 16]]],
    ["#d59d61", [[3, 3, 10, 4], [3, 9, 7, 2]]]
  ]);

  const waterFrames = [0, 1, 2].map((frame) => tile(`ow3d-water-${frame}`, "#2c899a", [
    ["#1d6175", [[0, 0, 16, 3], [0, 10, 16, 2]]],
    ["#50bdb7", frame === 0
      ? [[0, 4, 7, 1], [10, 3, 6, 1], [4, 13, 8, 1]]
      : frame === 1
        ? [[2, 4, 7, 1], [12, 3, 4, 1], [6, 13, 8, 1]]
        : [[4, 4, 7, 1], [0, 7, 5, 1], [8, 13, 8, 1]]],
    ["#b9efdb", frame === 0 ? [[2, 5, 3, 1], [11, 4, 3, 1]] : frame === 1 ? [[4, 5, 3, 1], [13, 4, 2, 1]] : [[6, 5, 3, 1], [1, 8, 3, 1]]]
  ]));

  return { grass, path, stone, shore, wall, roof, wood, bark, waterFrames, leaf, tallGrass, flower, sign };
};

export const createPixelMaterial = (texture, {
  transparent = false,
  alphaTest = 0,
  side = THREE.FrontSide,
  color = 0xffffff,
  emissive = 0x000000,
  emissiveIntensity = 0
} = {}) => new THREE.MeshLambertMaterial({
  map: texture,
  color,
  transparent,
  alphaTest,
  side,
  emissive,
  emissiveIntensity,
  flatShading: true
});

export const createSpriteMaterial = (texture, options = {}) => new THREE.SpriteMaterial({
  map: texture,
  transparent: true,
  alphaTest: options.alphaTest ?? 0.05,
  depthWrite: options.depthWrite ?? true,
  color: options.color ?? 0xffffff,
  fog: options.fog ?? true
});

export const disposeOverworldTextures = () => {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
};
