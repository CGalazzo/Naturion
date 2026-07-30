import { THREE } from "./engine.js";

const textureCache = new Map();

const createCanvasTexture = (key, size, painter) => {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  painter(context, size);
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

const paintRects = (context, base, layers, size = 16) => {
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  layers.forEach(([color, rects]) => {
    context.fillStyle = color;
    rects.forEach(([x, y, width, height]) => context.fillRect(x, y, width, height));
  });
};

const tile = (key, base, layers, size = 16) => createCanvasTexture(key, size, (context) => paintRects(context, base, layers, size));

const transparentTile = (key, layers, size = 32) => createCanvasTexture(key, size, (context) => {
  context.clearRect(0, 0, size, size);
  layers.forEach(([color, rects]) => {
    context.fillStyle = color;
    rects.forEach(([x, y, width, height]) => context.fillRect(x, y, width, height));
  });
});

export const createOverworldTextures = () => {
  const grass = tile("ow-grass", "#4f9848", [
    ["#2f6e3b", [[0, 0, 16, 2], [1, 8, 4, 2], [10, 4, 5, 2], [6, 13, 3, 2]]],
    ["#72bd58", [[2, 2, 4, 2], [8, 0, 3, 3], [12, 9, 3, 2], [0, 13, 4, 3]]],
    ["#a5d776", [[3, 3, 2, 1], [9, 1, 2, 1], [13, 10, 2, 1]]]
  ]);
  const path = tile("ow-path", "#b68c55", [
    ["#85613e", [[0, 0, 5, 3], [10, 1, 6, 3], [3, 9, 5, 4], [11, 12, 5, 4]]],
    ["#d0a66a", [[4, 3, 4, 3], [9, 5, 4, 3], [0, 11, 4, 4], [7, 13, 3, 3]]],
    ["#6e5035", [[8, 0, 1, 5], [6, 9, 2, 2], [13, 8, 3, 2]]]
  ]);
  const stone = tile("ow-stone", "#71817a", [
    ["#465a55", [[0, 0, 6, 3], [9, 1, 7, 4], [3, 8, 6, 4], [11, 11, 5, 5]]],
    ["#9ba89c", [[2, 3, 5, 3], [10, 5, 4, 3], [0, 12, 4, 3]]],
    ["#31433f", [[7, 0, 1, 5], [8, 6, 1, 6], [5, 12, 1, 4]]]
  ]);
  const shore = tile("ow-shore", "#76684c", [
    ["#4e4b3b", [[0, 0, 6, 4], [10, 2, 6, 5], [4, 11, 8, 5]]],
    ["#9c916d", [[3, 3, 5, 3], [0, 9, 5, 3]]],
    ["#6aa063", [[0, 0, 16, 2], [12, 7, 4, 2]]]
  ]);
  const wall = tile("ow-wall", "#d7bd84", [
    ["#b79562", [[0, 0, 16, 2], [0, 8, 16, 2], [0, 15, 16, 1]]],
    ["#f1dda4", [[1, 2, 6, 5], [9, 10, 6, 5]]],
    ["#8a6d4b", [[7, 2, 2, 6], [0, 10, 2, 5]]]
  ]);
  const roof = tile("ow-roof", "#8b3f3c", [
    ["#582b35", [[0, 0, 16, 2], [0, 6, 16, 2], [0, 12, 16, 2]]],
    ["#bd5a45", [[0, 2, 7, 4], [9, 8, 7, 4], [2, 14, 7, 2]]],
    ["#e07857", [[2, 2, 4, 1], [11, 8, 3, 1]]]
  ]);
  const wood = tile("ow-wood", "#8b5b38", [
    ["#4f3529", [[0, 2, 16, 2], [0, 8, 16, 2], [0, 14, 16, 2]]],
    ["#b57a49", [[0, 0, 16, 2], [0, 5, 16, 2], [0, 11, 16, 2]]],
    ["#d09a5c", [[3, 1, 6, 1], [8, 6, 5, 1]]]
  ]);
  const bark = tile("ow-bark", "#68452f", [
    ["#3d2b27", [[1, 0, 3, 16], [9, 0, 2, 16], [14, 0, 2, 16]]],
    ["#986441", [[4, 0, 4, 16], [11, 0, 3, 16]]],
    ["#bd8050", [[5, 1, 1, 6], [12, 8, 1, 6]]]
  ]);
  const waterFrames = [0, 1, 2].map((frame) => tile(`ow-water-${frame}`, "#2d8f9f", [
    ["#1f657a", [[0, 0, 16, 3], [0, 10, 16, 2]]],
    ["#54c2bd", frame === 0
      ? [[0, 4, 7, 1], [10, 3, 6, 1], [4, 13, 8, 1]]
      : frame === 1
        ? [[2, 4, 7, 1], [12, 3, 4, 1], [6, 13, 8, 1]]
        : [[4, 4, 7, 1], [0, 7, 5, 1], [8, 13, 8, 1]]],
    ["#b9f0dc", frame === 0 ? [[2, 5, 3, 1], [11, 4, 3, 1]] : frame === 1 ? [[4, 5, 3, 1], [13, 4, 2, 1]] : [[6, 5, 3, 1], [1, 8, 3, 1]]]
  ]));

  const leaf = transparentTile("ow-leaf", [
    ["#244d36", [[5, 2, 21, 3], [2, 6, 28, 18], [6, 24, 20, 5]]],
    ["#43834a", [[5, 7, 12, 8], [16, 5, 11, 12], [8, 17, 17, 8]]],
    ["#75bc5b", [[8, 8, 6, 4], [18, 7, 6, 5], [12, 18, 7, 4]]],
    ["#a6d779", [[10, 8, 3, 2], [20, 8, 3, 2]]]
  ]);
  const tallGrass = transparentTile("ow-tall-grass", [
    ["#245c39", [[4, 14, 3, 16], [10, 8, 3, 22], [17, 11, 3, 19], [24, 5, 3, 25]]],
    ["#4d9848", [[6, 10, 3, 20], [13, 4, 3, 26], [20, 8, 3, 22], [27, 13, 2, 17]]],
    ["#8bc967", [[14, 5, 1, 14], [25, 6, 1, 13]]]
  ]);
  const flower = transparentTile("ow-flower", [
    ["#2e6b3d", [[15, 13, 2, 18], [11, 20, 6, 2]]],
    ["#e6b957", [[10, 5, 7, 7], [16, 3, 7, 7], [18, 10, 7, 7], [8, 11, 7, 7]]],
    ["#fff1a5", [[15, 8, 5, 5]]]
  ]);
  const sign = tile("ow-sign", "#9a673d", [
    ["#563726", [[0, 0, 16, 2], [0, 14, 16, 2], [0, 0, 2, 16], [14, 0, 2, 16]]],
    ["#d39a5e", [[3, 3, 10, 4], [3, 9, 7, 2]]]
  ]);

  return { grass, path, stone, shore, wall, roof, wood, bark, waterFrames, leaf, tallGrass, flower, sign };
};

export const createPixelMaterial = (texture, { transparent = false, alphaTest = 0, side = THREE.FrontSide, color = 0xffffff } = {}) => new THREE.MeshLambertMaterial({
  map: texture,
  color,
  transparent,
  alphaTest,
  side,
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
