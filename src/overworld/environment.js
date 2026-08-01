import { THREE } from "./engine.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;
const TERRAIN_WIDTH = 384;
const TERRAIN_HEIGHT = 288;
const TERRAIN_SEGMENTS_X = 64;
const TERRAIN_SEGMENTS_Z = 48;

const ownedTextures = new Set();
const ownedMaterials = new Set();
const ownedGeometries = new Set();

const PATH_LINES = Object.freeze([
  Object.freeze([
    Object.freeze({ x: 0, z: 22 }),
    Object.freeze({ x: 0.35, z: 15 }),
    Object.freeze({ x: -0.35, z: 8 }),
    Object.freeze({ x: 0.55, z: 0 }),
    Object.freeze({ x: -0.4, z: -10 }),
    Object.freeze({ x: 0, z: -21 })
  ]),
  Object.freeze([
    Object.freeze({ x: -20, z: -4.4 }),
    Object.freeze({ x: -12, z: -4.05 }),
    Object.freeze({ x: -4, z: -3.7 }),
    Object.freeze({ x: 5, z: -4.15 }),
    Object.freeze({ x: 19, z: -3.85 })
  ]),
  Object.freeze([
    Object.freeze({ x: -14, z: 9.25 }),
    Object.freeze({ x: -7, z: 8.8 }),
    Object.freeze({ x: 0, z: 9.05 }),
    Object.freeze({ x: 7, z: 8.7 }),
    Object.freeze({ x: 14, z: 9.15 })
  ])
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

const hash = (x, y, seed = 0) => {
  let value = Math.imul((x | 0) ^ Math.imul(seed + 17, 374761393), 668265263);
  value = Math.imul(value ^ Math.imul(y | 0, 2246822519), 3266489917);
  value ^= value >>> 15;
  value = Math.imul(value, 2246822519);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967295;
};

const valueNoise = (x, y, seed = 0) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  const top = THREE.MathUtils.lerp(a, b, tx);
  const bottom = THREE.MathUtils.lerp(c, d, tx);
  return THREE.MathUtils.lerp(top, bottom, ty);
};

const distanceToSegment = (x, z, a, b) => {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz || 1;
  const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / lengthSquared, 0, 1);
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
};

const distanceToPath = (x, z) => {
  let distance = Infinity;
  PATH_LINES.forEach((line) => {
    for (let index = 0; index < line.length - 1; index += 1) {
      distance = Math.min(distance, distanceToSegment(x, z, line[index], line[index + 1]));
    }
  });
  return distance;
};

const PALETTE = Object.freeze({
  forestDeep: "#10251a",
  forestShadow: "#18351c",
  grassDark: "#254a22",
  grassMid: "#3e702b",
  grassLight: "#537f30",
  grassSun: "#789943",
  moss: "#9bae60",
  mossLight: "#b4c385",
  pathDeep: "#5e4729",
  pathDark: "#815b31",
  pathMid: "#bd9156",
  pathLight: "#d5b272",
  pathSun: "#dfc996",
  stoneDark: "#4b4d3f",
  stoneMid: "#686553",
  stoneLight: "#a6a078",
  tealShadow: "#1e363d"
});

const hexToRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const RGB = Object.fromEntries(Object.entries(PALETTE).map(([key, value]) => [key, hexToRgb(value)]));

const writePixel = (data, index, color) => {
  const offset = index * 4;
  data[offset] = color.r;
  data[offset + 1] = color.g;
  data[offset + 2] = color.b;
  data[offset + 3] = 255;
};

const texturePixelToWorld = (px, py) => ({
  x: ((px + 0.5) / TERRAIN_WIDTH - 0.5) * WORLD_WIDTH,
  z: (0.5 - (py + 0.5) / TERRAIN_HEIGHT) * WORLD_DEPTH
});

const worldToTexturePixel = (x, z) => ({
  x: Math.round((x / WORLD_WIDTH + 0.5) * TERRAIN_WIDTH),
  y: Math.round((0.5 - z / WORLD_DEPTH) * TERRAIN_HEIGHT)
});

const grassColorFor = (worldX, worldZ, px, py) => {
  const broad = valueNoise(worldX * 0.105, worldZ * 0.105, 11);
  const cluster = valueNoise(worldX * 0.31, worldZ * 0.31, 23);
  const dapple = valueNoise(worldX * 0.18 - 4, worldZ * 0.18 + 3, 41);
  const edgeShade = Math.min(Math.abs(worldX) / (WORLD_WIDTH * 0.5), 1) * 0.4
    + Math.min(Math.abs(worldZ) / (WORLD_DEPTH * 0.5), 1) * 0.28;
  const checker = ((Math.floor(px / 3) + Math.floor(py / 3)) & 1) ? 0.025 : -0.025;
  const light = broad * 0.42 + cluster * 0.24 + dapple * 0.34 + checker - edgeShade;
  if (light < 0.17) return RGB.forestShadow;
  if (light < 0.30) return RGB.grassDark;
  if (light < 0.48) return RGB.grassMid;
  if (light < 0.67) return RGB.grassLight;
  if (light < 0.82) return RGB.grassSun;
  return RGB.moss;
};

const pathColorFor = (worldX, worldZ, px, py, distance, pathRadius) => {
  const broad = valueNoise(worldX * 0.22, worldZ * 0.22, 67);
  const blocks = hash(Math.floor(px / 5), Math.floor(py / 4), 71);
  const centerLight = 1 - clamp(distance / Math.max(0.001, pathRadius), 0, 1);
  const light = broad * 0.35 + blocks * 0.25 + centerLight * 0.4;
  if (light < 0.22) return RGB.pathDeep;
  if (light < 0.43) return RGB.pathDark;
  if (light < 0.70) return RGB.pathMid;
  if (light < 0.88) return RGB.pathLight;
  return RGB.pathSun;
};

const createTerrainTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = TERRAIN_WIDTH;
  canvas.height = TERRAIN_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Não foi possível criar a arte-base da Clareira dos Ecos.");
  context.imageSmoothingEnabled = false;

  const image = context.createImageData(TERRAIN_WIDTH, TERRAIN_HEIGHT);
  const data = image.data;
  for (let py = 0; py < TERRAIN_HEIGHT; py += 1) {
    for (let px = 0; px < TERRAIN_WIDTH; px += 1) {
      const { x: worldX, z: worldZ } = texturePixelToWorld(px, py);
      const distance = distanceToPath(worldX, worldZ);
      const organic = (valueNoise(worldX * 0.19, worldZ * 0.19, 53) - 0.5) * 0.68;
      const pathRadius = 1.82 + organic;
      const edgeRadius = 2.55 + organic * 0.55;
      let color;
      if (distance <= pathRadius) {
        color = pathColorFor(worldX, worldZ, px, py, distance, pathRadius);
      } else if (distance <= edgeRadius) {
        const edgeMix = (distance - pathRadius) / Math.max(0.001, edgeRadius - pathRadius);
        const edgeNoise = valueNoise(worldX * 0.34, worldZ * 0.34, 79);
        if (edgeMix < 0.30) color = edgeNoise > 0.52 ? RGB.pathDark : RGB.pathDeep;
        else if (edgeMix < 0.67) color = edgeNoise > 0.58 ? RGB.stoneMid : RGB.grassDark;
        else color = edgeNoise > 0.66 ? RGB.grassLight : RGB.grassMid;
      } else {
        color = grassColorFor(worldX, worldZ, px, py);
      }
      writePixel(data, py * TERRAIN_WIDTH + px, color);
    }
  }
  context.putImageData(image, 0, 0);

  for (let index = 0; index < 118; index += 1) {
    const worldX = (hash(index, 3, 101) - 0.5) * (WORLD_WIDTH - 5);
    const worldZ = (hash(index, 7, 103) - 0.5) * (WORLD_DEPTH - 5);
    if (distanceToPath(worldX, worldZ) < 3.0) continue;
    const point = worldToTexturePixel(worldX, worldZ);
    const width = 3 + Math.floor(hash(index, 11, 107) * 8);
    const height = 2 + Math.floor(hash(index, 13, 109) * 5);
    const bright = hash(index, 17, 113) > 0.62;
    context.fillStyle = bright ? PALETTE.moss : PALETTE.grassDark;
    context.fillRect(point.x, point.y, width, height);
    if (bright && width > 6) {
      context.fillStyle = PALETTE.mossLight;
      context.fillRect(point.x + 2, point.y, Math.max(2, width - 4), 1);
    }
  }

  for (let index = 0; index < 96; index += 1) {
    const line = PATH_LINES[index % PATH_LINES.length];
    const segmentIndex = Math.floor(hash(index, 19, 127) * (line.length - 1));
    const a = line[segmentIndex];
    const b = line[segmentIndex + 1];
    const t = hash(index, 23, 131);
    const side = (hash(index, 29, 137) - 0.5) * 2.3;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz) || 1;
    const x = THREE.MathUtils.lerp(a.x, b.x, t) - (dz / length) * side;
    const z = THREE.MathUtils.lerp(a.z, b.z, t) + (dx / length) * side;
    const point = worldToTexturePixel(x, z);
    const width = 2 + Math.floor(hash(index, 31, 139) * 5);
    const height = 1 + Math.floor(hash(index, 37, 149) * 3);
    context.fillStyle = hash(index, 41, 151) > 0.52 ? PALETTE.pathSun : PALETTE.pathDeep;
    context.fillRect(point.x, point.y, width, height);
    if (width >= 4) {
      context.fillStyle = PALETTE.pathLight;
      context.fillRect(point.x + 1, point.y, width - 2, 1);
    }
  }

  for (let index = 0; index < 82; index += 1) {
    const worldX = (hash(index, 43, 157) - 0.5) * (WORLD_WIDTH - 7);
    const worldZ = (hash(index, 47, 163) - 0.5) * (WORLD_DEPTH - 7);
    if (distanceToPath(worldX, worldZ) < 2.9) continue;
    const point = worldToTexturePixel(worldX, worldZ);
    context.fillStyle = hash(index, 53, 167) > 0.45 ? PALETTE.grassSun : PALETTE.forestShadow;
    context.fillRect(point.x, point.y + 2, 1, 4);
    context.fillRect(point.x + 2, point.y, 1, 6);
    context.fillRect(point.x + 4, point.y + 2, 1, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = "ClareiraReferenceStyleTerrain";
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  ownedTextures.add(texture);
  return texture;
};

const createCliffTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Não foi possível criar a borda da Clareira.");
  context.imageSmoothingEnabled = false;
  context.fillStyle = PALETTE.forestDeep;
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = PALETTE.tealShadow;
  context.fillRect(0, 0, 64, 6);
  context.fillRect(4, 14, 24, 8);
  context.fillRect(36, 31, 28, 7);
  context.fillStyle = PALETTE.forestShadow;
  context.fillRect(0, 48, 64, 16);
  context.fillStyle = PALETTE.stoneDark;
  context.fillRect(8, 24, 13, 5);
  context.fillRect(43, 9, 15, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = "ClareiraReferenceStyleCliff";
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 6);
  texture.needsUpdate = true;
  ownedTextures.add(texture);
  return texture;
};

const ownGeometry = (geometry) => {
  ownedGeometries.add(geometry);
  return geometry;
};
const ownMaterial = (material) => {
  material.toneMapped = false;
  ownedMaterials.add(material);
  return material;
};

const createTerrainGeometry = () => {
  const geometry = ownGeometry(new THREE.PlaneGeometry(
    WORLD_WIDTH - 1,
    WORLD_DEPTH - 1,
    TERRAIN_SEGMENTS_X,
    TERRAIN_SEGMENTS_Z
  ));
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getY(index);
    const distance = distanceToPath(x, z);
    const broad = valueNoise(x * 0.115, z * 0.115, 181);
    const medium = valueNoise(x * 0.24, z * 0.24, 191);
    const pathInset = distance < 2.35 ? -0.025 : 0;
    positions.setZ(index, 0.025 + broad * 0.055 + medium * 0.022 + pathInset);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

const createLighting = (root) => {
  const hemisphere = new THREE.HemisphereLight(0xd8e8ad, 0x102b28, 1.42);
  hemisphere.name = "ClareiraReferenceHemisphere";
  root.add(hemisphere);
  const key = new THREE.DirectionalLight(0xffd891, 1.48);
  key.name = "ClareiraReferenceWarmKey";
  key.position.set(-17, 29, 16);
  root.add(key);
  const coolFill = new THREE.DirectionalLight(0x5a9aa0, 0.24);
  coolFill.name = "ClareiraReferenceCoolFill";
  coolFill.position.set(19, 12, -16);
  root.add(coolFill);
};

const createSceneBase = (root, materials) => {
  const cliff = new THREE.Mesh(
    ownGeometry(new THREE.BoxGeometry(WORLD_WIDTH, 0.72, WORLD_DEPTH)),
    materials.cliff
  );
  cliff.name = "ClareiraReferenceCliffBase";
  cliff.position.y = -0.23;
  cliff.receiveShadow = false;
  cliff.castShadow = false;
  root.add(cliff);

  const terrain = new THREE.Mesh(createTerrainGeometry(), materials.terrain);
  terrain.name = "ClareiraReferenceTerrain";
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = 0.17;
  terrain.receiveShadow = false;
  terrain.castShadow = false;
  terrain.frustumCulled = true;
  root.add(terrain);
  return { cliff, terrain, grass: terrain };
};

const ensureScene = (parent, materials) => {
  const state = materials.sceneState;
  if (state.initialized) return state;
  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "ClareiraDosEcosReferencePhaseOne";
  state.root.userData.phase = 1;
  state.root.userData.visualReference = "approved-3d-pixel-art-image";
  parent.add(state.root);
  createLighting(state.root);
  state.ground = createSceneBase(state.root, materials);
  return state;
};

const hiddenGroup = () => {
  const group = new THREE.Group();
  group.visible = false;
  return group;
};

export const createEnvironmentMaterials = () => {
  const terrainTexture = createTerrainTexture();
  const cliffTexture = createCliffTexture();
  const terrain = ownMaterial(new THREE.MeshLambertMaterial({ map: terrainTexture, flatShading: true }));
  const cliff = ownMaterial(new THREE.MeshLambertMaterial({ map: cliffTexture, flatShading: true }));
  const fallback = ownMaterial(new THREE.MeshBasicMaterial({ color: 0x10251a }));
  const materials = {
    textures: { terrain: terrainTexture, cliff: cliffTexture },
    terrain,
    cliff,
    grass: fallback,
    path: fallback,
    stone: fallback,
    shore: fallback,
    water: [],
    sceneState: { initialized: false, root: null, ground: null }
  };
  [materials.grass, materials.path, materials.stone, materials.shore].forEach((material) => {
    material.userData.environmentMaterials = materials;
  });
  return materials;
};

export const createTileInstances = ({ parent, material }) => {
  const materials = material?.userData?.environmentMaterials;
  if (materials) ensureScene(parent, materials);
  return null;
};

export const createTree = () => hiddenGroup();
export const createHouse = () => hiddenGroup();
export const createFenceSegment = () => hiddenGroup();
export const createSign = () => hiddenGroup();
export const createTallGrassPatch = () => hiddenGroup();
export const createFlowerCluster = () => hiddenGroup();
export const createRock = () => hiddenGroup();
export const createRootGate = () => hiddenGroup();

export const createPuzzleMarker = () => {
  const group = hiddenGroup();
  const crystal = new THREE.Object3D();
  crystal.visible = false;
  group.add(crystal);
  return { group, crystal };
};

export const createWaterSurface = ({ parent, materials }) => {
  const state = ensureScene(parent, materials);
  return state.ground.terrain;
};

export const disposeEnvironmentMaterials = (materials) => {
  materials?.sceneState?.root?.removeFromParent?.();
  ownedGeometries.forEach((geometry) => geometry.dispose());
  ownedMaterials.forEach((material) => material.dispose());
  ownedTextures.forEach((texture) => texture.dispose());
  ownedGeometries.clear();
  ownedMaterials.clear();
  ownedTextures.clear();
};
