import { THREE } from "../engine.js";

const cache = new Map();

const textureFromPainter = (key, size, painter) => {
  if (cache.has(key)) return cache.get(key);
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
  cache.set(key, texture);
  return texture;
};

const fill = (ctx, color, size) => {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
};

const drawRects = (ctx, color, rects) => {
  ctx.fillStyle = color;
  rects.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
};

const tile = (key, base, layers, size = 16) => textureFromPainter(key, size, (ctx) => {
  fill(ctx, base, size);
  layers.forEach(([color, rects]) => drawRects(ctx, color, rects));
});

const GRASS_TOP = [
  ["#2f6d38", [[0, 0, 16, 2], [1, 6, 3, 2], [10, 3, 4, 2], [6, 12, 3, 2]]],
  ["#73b958", [[2, 2, 4, 2], [8, 0, 3, 3], [12, 8, 3, 2], [0, 13, 4, 3]]],
  ["#a3d572", [[3, 3, 2, 1], [9, 1, 2, 1], [13, 9, 2, 1], [1, 14, 2, 1]]],
  ["#214f31", [[0, 8, 2, 3], [7, 6, 2, 3], [14, 1, 2, 3], [11, 13, 3, 3]]]
];

const DIRT = [
  ["#4d3428", [[0, 1, 4, 3], [8, 0, 4, 2], [12, 7, 4, 3], [3, 12, 5, 4]]],
  ["#9c6a43", [[4, 3, 3, 2], [10, 4, 3, 3], [0, 9, 3, 2], [9, 12, 4, 2]]],
  ["#c08a58", [[5, 4, 2, 1], [11, 5, 2, 1], [1, 10, 2, 1], [10, 13, 2, 1]]]
];

const STONE = [
  ["#3e504b", [[0, 0, 6, 3], [9, 1, 7, 4], [3, 8, 6, 4], [11, 11, 5, 5]]],
  ["#809087", [[2, 3, 5, 3], [10, 5, 4, 3], [0, 12, 4, 3], [7, 13, 3, 3]]],
  ["#a6b19f", [[3, 4, 3, 1], [11, 6, 2, 1], [1, 13, 2, 1]]],
  ["#273634", [[7, 0, 1, 5], [8, 6, 1, 6], [5, 12, 1, 4]]]
];

const PATH = [
  ["#795737", [[0, 0, 5, 3], [10, 1, 6, 3], [3, 8, 5, 4], [11, 11, 5, 5]]],
  ["#c69a60", [[4, 3, 4, 3], [9, 5, 4, 3], [0, 11, 4, 4], [7, 13, 3, 3]]],
  ["#e0bd7a", [[5, 4, 2, 1], [10, 6, 2, 1], [1, 12, 2, 1]]],
  ["#60462f", [[8, 0, 1, 5], [6, 9, 2, 2], [13, 8, 3, 2]]]
];

const BARK = [
  ["#3a2823", [[1, 0, 3, 16], [9, 0, 2, 16], [14, 0, 2, 16]]],
  ["#86583a", [[4, 0, 4, 16], [11, 0, 3, 16]]],
  ["#b47a4a", [[5, 1, 1, 6], [12, 8, 1, 6]]],
  ["#5c3d2d", [[6, 7, 2, 2], [2, 4, 2, 3], [11, 2, 3, 2]]]
];

const LEAF = [
  ["#1d4933", [[0, 0, 5, 5], [9, 0, 7, 4], [2, 9, 6, 7], [11, 10, 5, 6]]],
  ["#43824a", [[3, 3, 6, 5], [10, 4, 5, 6], [0, 12, 4, 4]]],
  ["#70b65a", [[5, 4, 3, 2], [11, 5, 2, 2], [1, 13, 2, 2]]],
  ["#a2d373", [[6, 4, 1, 1], [12, 5, 1, 1]]]
];

const WATER_FRAMES = [
  [[0, 3, 7, 1], [10, 2, 6, 1], [4, 9, 8, 1], [0, 14, 5, 1]],
  [[2, 3, 7, 1], [12, 2, 4, 1], [6, 9, 8, 1], [1, 14, 5, 1]],
  [[4, 3, 7, 1], [0, 6, 5, 1], [8, 9, 8, 1], [3, 14, 5, 1]]
];

export const createVoxelTextureAtlas = () => {
  const textures = {
    grassTop: tile("voxel-grass-top", "#4f9847", GRASS_TOP),
    grassSide: tile("voxel-grass-side", "#744c32", [
      ["#4f9847", [[0, 0, 16, 4], [1, 4, 4, 2], [9, 4, 5, 2]]],
      ["#9c6942", [[0, 6, 5, 4], [7, 5, 5, 5], [11, 11, 5, 5]]],
      ["#4d3428", [[3, 10, 5, 6], [12, 6, 4, 4]]]
    ]),
    dirt: tile("voxel-dirt", "#724d33", DIRT),
    rootDirt: tile("voxel-root-dirt", "#67452f", [
      ...DIRT,
      ["#3a2823", [[2, 0, 2, 8], [4, 6, 5, 2], [11, 8, 2, 8], [8, 12, 4, 2]]]
    ]),
    darkDirt: tile("voxel-dark-dirt", "#4a352b", [["#2e2521", [[0, 0, 6, 4], [8, 5, 8, 4], [2, 12, 8, 4]]], ["#6a4935", [[4, 4, 5, 3], [10, 10, 4, 3]]]]),
    stone: tile("voxel-stone", "#64736c", STONE),
    deepStone: tile("voxel-deep-stone", "#3e4e49", [["#263532", [[0, 0, 7, 5], [9, 6, 7, 5], [2, 12, 8, 4]]], ["#5e7068", [[4, 4, 6, 4], [0, 9, 5, 4]]]]),
    mossStone: tile("voxel-moss-stone", "#5e7065", [...STONE, ["#4d8148", [[0, 0, 8, 3], [11, 3, 5, 3], [3, 8, 5, 2]]], ["#8bb264", [[2, 1, 3, 1], [12, 4, 2, 1]]]]),
    path: tile("voxel-path", "#a77d4f", PATH),
    pathStone: tile("voxel-path-stone", "#8f7b61", [["#5f574d", [[0, 0, 7, 5], [9, 2, 7, 5], [3, 10, 8, 6]]], ["#b7a27d", [[4, 4, 5, 3], [10, 8, 4, 3]]]]),
    mud: tile("voxel-mud", "#4e4738", [["#30342d", [[0, 0, 7, 5], [9, 4, 7, 5], [2, 11, 9, 5]]], ["#71664e", [[3, 3, 5, 3], [10, 9, 4, 3]]], ["#8b8c69", [[5, 4, 2, 1]]]]),
    shore: tile("voxel-shore", "#75664b", [["#4c493a", [[0, 0, 6, 4], [10, 2, 6, 5], [4, 11, 8, 5]]], ["#9b916d", [[3, 3, 5, 3], [0, 9, 5, 3]]], ["#6b9a62", [[0, 0, 16, 2], [12, 7, 4, 2]]]]),
    barkYoung: tile("voxel-bark-young", "#7f5538", BARK),
    barkCommon: tile("voxel-bark-common", "#68442f", BARK),
    barkAncient: tile("voxel-bark-ancient", "#4d3429", [...BARK, ["#263c32", [[0, 10, 5, 6], [11, 0, 5, 4]]]]),
    leafYoung: tile("voxel-leaf-young", "#5aa653", LEAF),
    leafCommon: tile("voxel-leaf-common", "#3d8149", LEAF),
    leafAncient: tile("voxel-leaf-ancient", "#2c6545", LEAF),
    leafLuminal: tile("voxel-leaf-luminal", "#3b9b79", [...LEAF, ["#8fe0b8", [[1, 1, 3, 2], [10, 6, 3, 2], [5, 13, 4, 2]]]]),
    wood: tile("voxel-wood", "#8b5b38", [["#4f3529", [[0, 2, 16, 2], [0, 8, 16, 2], [0, 14, 16, 2]]], ["#b57a49", [[0, 0, 16, 2], [0, 5, 16, 2], [0, 11, 16, 2]]], ["#d09a5c", [[3, 1, 6, 1], [8, 6, 5, 1]]]]),
    cutWood: tile("voxel-cut-wood", "#b77d4d", [["#7a4c32", [[1, 1, 14, 2], [1, 13, 14, 2], [1, 3, 2, 10], [13, 3, 2, 10], [5, 5, 6, 2], [5, 9, 6, 2]]], ["#d8a765", [[6, 6, 4, 4]]]]),
    rope: tile("voxel-rope", "#a98958", [["#6d573d", [[1, 0, 2, 16], [7, 0, 2, 16], [13, 0, 2, 16]]], ["#d0b477", [[3, 0, 3, 16], [9, 0, 3, 16]]]]),
    rune: tile("voxel-rune", "#405c54", [["#263d38", [[0, 0, 16, 3], [0, 13, 16, 3], [0, 3, 3, 10], [13, 3, 3, 10]]], ["#72d8bd", [[7, 3, 2, 4], [5, 7, 6, 2], [7, 9, 2, 4]]]]),
    crystal: tile("voxel-crystal", "#2c9ea3", [["#176775", [[0, 0, 5, 16], [12, 0, 4, 16]]], ["#67d8c8", [[5, 0, 7, 16]]], ["#c9ffe5", [[8, 1, 2, 11], [6, 4, 1, 5]]]]),
    flowerGold: tile("voxel-flower-gold", "rgba(0,0,0,0)", [["#e4a948", [[5, 1, 6, 5], [1, 5, 5, 6], [10, 5, 5, 6], [5, 10, 6, 5]]], ["#fff0a1", [[6, 6, 4, 4]]]]),
    flowerViolet: tile("voxel-flower-violet", "rgba(0,0,0,0)", [["#9c6ed5", [[5, 1, 6, 5], [1, 5, 5, 6], [10, 5, 5, 6], [5, 10, 6, 5]]], ["#f0d8ff", [[6, 6, 4, 4]]]])
  };

  const waterFrames = WATER_FRAMES.map((highlights, index) => tile(`voxel-water-${index}`, "#247e8d", [
    ["#195a6b", [[0, 0, 16, 4], [0, 10, 16, 6]]],
    ["#43b1b4", highlights],
    ["#9be1d5", highlights.map(([x, y, w, h]) => [Math.min(15, x + 1), y, Math.max(1, w - 2), h])]
  ]));

  return { textures, waterFrames };
};

export const disposeVoxelTextureAtlas = () => {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
};
