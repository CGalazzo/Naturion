import { THREE } from "./engine.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;
const TERRAIN_TEXTURE_WIDTH = 256;
const TERRAIN_TEXTURE_HEIGHT = 192;
const TERRAIN_SEGMENTS_X = 72;
const TERRAIN_SEGMENTS_Z = 56;

const ownedTextures = new Set();
const ownedMaterials = new Set();
const ownedGeometries = new Set();

const PATH_LINES = Object.freeze([
  Object.freeze([
    Object.freeze({ x: 0, z: 22 }),
    Object.freeze({ x: 0.45, z: 14 }),
    Object.freeze({ x: -0.2, z: 7 }),
    Object.freeze({ x: 0.55, z: -1 }),
    Object.freeze({ x: -0.35, z: -10 }),
    Object.freeze({ x: 0, z: -21 })
  ]),
  Object.freeze([
    Object.freeze({ x: -20, z: -4.4 }),
    Object.freeze({ x: -11, z: -4.05 }),
    Object.freeze({ x: -3, z: -3.7 }),
    Object.freeze({ x: 5, z: -4.2 }),
    Object.freeze({ x: 19, z: -3.85 })
  ]),
  Object.freeze([
    Object.freeze({ x: -14, z: 9.2 }),
    Object.freeze({ x: -7, z: 8.75 }),
    Object.freeze({ x: 0, z: 9.05 }),
    Object.freeze({ x: 7, z: 8.65 }),
    Object.freeze({ x: 14, z: 9.1 })
  ])
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const hash = (x, y, seed = 0) => {
  let value = Math.imul((x | 0) ^ (seed * 374761393), 668265263);
  value = Math.imul(value ^ ((y | 0) * 2246822519), 3266489917);
  value ^= value >>> 15;
  value = Math.imul(value, 2246822519);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967295;
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

const hexToRgb = (hex) => ({
  r: (hex >> 16) & 255,
  g: (hex >> 8) & 255,
  b: hex & 255
});

const GRASS_PALETTE = [
  0x315f2c,
  0x3d7331,
  0x4d8536,
  0x5e963d,
  0x73aa48,
  0x86bb55
].map(hexToRgb);

const PATH_PALETTE = [
  0x65472f,
  0x7f5b39,
  0x9b7041,
  0xb48750,
  0xc99d60,
  0xdfba78
].map(hexToRgb);

const PATH_EDGE_PALETTE = [
  0x40572c,
  0x56683a,
  0x726846,
  0x8a7349
].map(hexToRgb);

const writePixel = (data, index, color) => {
  const offset = index * 4;
  data[offset] = color.r;
  data[offset + 1] = color.g;
  data[offset + 2] = color.b;
  data[offset + 3] = 255;
};

const createTerrainTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = TERRAIN_TEXTURE_WIDTH;
  canvas.height = TERRAIN_TEXTURE_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Não foi possível criar a textura principal da Clareira dos Ecos.");
  context.imageSmoothingEnabled = false;

  const image = context.createImageData(TERRAIN_TEXTURE_WIDTH, TERRAIN_TEXTURE_HEIGHT);
  const data = image.data;

  for (let py = 0; py < TERRAIN_TEXTURE_HEIGHT; py += 1) {
    for (let px = 0; px < TERRAIN_TEXTURE_WIDTH; px += 1) {
      const worldX = ((px + 0.5) / TERRAIN_TEXTURE_WIDTH - 0.5) * WORLD_WIDTH;
      const worldZ = (0.5 - (py + 0.5) / TERRAIN_TEXTURE_HEIGHT) * WORLD_DEPTH;
      const distance = distanceToPath(worldX, worldZ);
      const coarse = hash(Math.floor(px / 4), Math.floor(py / 4), 11);
      const medium = hash(Math.floor(px / 2), Math.floor(py / 2), 29);
      const fine = hash(px, py, 47);
      const pathJitter = (coarse - 0.5) * 0.42 + (medium - 0.5) * 0.16;
      const pathRadius = 1.72 + pathJitter;
      const edgeRadius = 2.38 + pathJitter * 0.72;
      let color;

      if (distance <= pathRadius) {
        let shade = 3;
        if (coarse < 0.18) shade = 2;
        if (coarse > 0.82) shade = 4;
        if (fine > 0.965) shade = 5;
        if (fine < 0.035) shade = 1;
        color = PATH_PALETTE[shade];

        const cobble = hash(Math.floor(px / 3), Math.floor(py / 2), 83);
        if (distance < pathRadius * 0.88 && cobble > 0.91) {
          color = PATH_PALETTE[cobble > 0.97 ? 5 : 1];
        }
      } else if (distance <= edgeRadius) {
        const edgeShade = clamp(Math.floor(coarse * PATH_EDGE_PALETTE.length), 0, PATH_EDGE_PALETTE.length - 1);
        color = PATH_EDGE_PALETTE[edgeShade];
      } else {
        let shade = 2;
        if (coarse < 0.18) shade = 1;
        if (coarse > 0.78) shade = 3;
        if (medium > 0.9) shade = 4;
        if (fine > 0.985) shade = 5;
        if (fine < 0.018) shade = 0;
        color = GRASS_PALETTE[shade];
      }

      writePixel(data, py * TERRAIN_TEXTURE_WIDTH + px, color);
    }
  }

  context.putImageData(image, 0, 0);

  const clusterCount = 190;
  for (let index = 0; index < clusterCount; index += 1) {
    const px = Math.floor(hash(index, 7, 101) * (TERRAIN_TEXTURE_WIDTH - 5));
    const py = Math.floor(hash(index, 13, 103) * (TERRAIN_TEXTURE_HEIGHT - 5));
    const worldX = ((px + 2) / TERRAIN_TEXTURE_WIDTH - 0.5) * WORLD_WIDTH;
    const worldZ = (0.5 - (py + 2) / TERRAIN_TEXTURE_HEIGHT) * WORLD_DEPTH;
    if (distanceToPath(worldX, worldZ) < 2.65) continue;
    const bright = hash(index, 19, 107) > 0.56;
    context.fillStyle = bright ? "#79aa49" : "#28532a";
    const width = 1 + Math.floor(hash(index, 23, 109) * 3);
    const height = 1 + Math.floor(hash(index, 29, 113) * 2);
    context.fillRect(px, py, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = "ClareiraPhaseOneAuthoredTerrain";
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

const createRepeatTexture = ({ name, size = 32, base, light, dark, accent }) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error(`Não foi possível criar a textura ${name}.`);
  context.imageSmoothingEnabled = false;
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  context.fillStyle = light;
  context.fillRect(0, 0, size, 3);
  context.fillRect(3, 8, 10, 3);
  context.fillRect(18, 18, 12, 3);
  context.fillStyle = dark;
  context.fillRect(0, size - 4, size, 4);
  context.fillRect(14, 5, 7, 3);
  context.fillRect(4, 22, 9, 3);
  if (accent) {
    context.fillStyle = accent;
    context.fillRect(22, 7, 7, 3);
    context.fillRect(9, 14, 6, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  ownedTextures.add(texture);
  return texture;
};

const createToonGradient = () => {
  const data = new Uint8Array([58, 112, 174, 236, 255]);
  const texture = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  texture.name = "ClareiraPhaseOneToonGradient";
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  ownedTextures.add(texture);
  return texture;
};

const ownMaterial = (material) => {
  material.toneMapped = false;
  ownedMaterials.add(material);
  return material;
};

const ownGeometry = (geometry) => {
  ownedGeometries.add(geometry);
  return geometry;
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
    const planeY = positions.getY(index);
    const z = -planeY;
    const distance = distanceToPath(x, z);
    const macro = Math.sin(x * 0.23) * Math.cos(z * 0.19) * 0.045;
    const coarse = (hash(Math.round((x + 30) * 1.4), Math.round((z + 24) * 1.4), 151) - 0.5) * 0.085;
    const pathBlend = clamp((distance - 1.2) / 2.0, 0, 1);
    const height = 0.24 + (macro + coarse) * pathBlend;
    positions.setZ(index, Math.round(height * 64) / 64);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);
  return geometry;
};

const createPlaceholderMaterial = () => ownMaterial(new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false,
  side: THREE.DoubleSide
}));

const createSceneMaterials = () => {
  const terrainTexture = createTerrainTexture();
  const cliffTexture = createRepeatTexture({
    name: "ClareiraPhaseOneSoilCliff",
    base: "#4b3829",
    light: "#6b5036",
    dark: "#261f1b",
    accent: "#355237"
  });
  cliffTexture.repeat.set(12, 9);
  const outsideTexture = createRepeatTexture({
    name: "ClareiraPhaseOneOutsideGround",
    base: "#173728",
    light: "#234c31",
    dark: "#0c211a",
    accent: "#2e5b36"
  });
  outsideTexture.repeat.set(20, 16);
  const gradientMap = createToonGradient();

  return {
    terrainTexture,
    cliffTexture,
    outsideTexture,
    gradientMap,
    terrain: ownMaterial(new THREE.MeshToonMaterial({
      map: terrainTexture,
      gradientMap,
      color: 0xffffff,
      flatShading: true
    })),
    cliff: ownMaterial(new THREE.MeshToonMaterial({
      map: cliffTexture,
      gradientMap,
      color: 0xffffff,
      flatShading: true
    })),
    outside: ownMaterial(new THREE.MeshToonMaterial({
      map: outsideTexture,
      gradientMap,
      color: 0xffffff,
      flatShading: true
    }))
  };
};

const addTerrain = (root, sceneMaterials) => {
  const outside = new THREE.Mesh(
    ownGeometry(new THREE.PlaneGeometry(104, 88, 1, 1)),
    sceneMaterials.outside
  );
  outside.name = "ClareiraPhaseOneLowerForestFloor";
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -1.38;
  outside.receiveShadow = false;
  root.add(outside);

  const cliff = new THREE.Mesh(
    ownGeometry(new THREE.BoxGeometry(WORLD_WIDTH, 1.45, WORLD_DEPTH)),
    sceneMaterials.cliff
  );
  cliff.name = "ClareiraPhaseOnePlateauCliff";
  cliff.position.y = -0.62;
  cliff.castShadow = false;
  cliff.receiveShadow = false;
  root.add(cliff);

  const grass = new THREE.Mesh(createTerrainGeometry(), sceneMaterials.terrain);
  grass.name = "ClareiraPhaseOnePixelTerrain";
  grass.position.y = 0;
  grass.castShadow = false;
  grass.receiveShadow = false;
  root.add(grass);

  return { cliff, grass, outside };
};

const addLighting = (root) => {
  const hemisphere = new THREE.HemisphereLight(0xd9f0b2, 0x193529, 1.55);
  hemisphere.name = "ClareiraPhaseOneHemisphere";
  root.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffd28f, 1.72);
  key.name = "ClareiraPhaseOneWarmKey";
  key.position.set(-19, 31, 17);
  root.add(key);

  const fill = new THREE.DirectionalLight(0x74b7a0, 0.48);
  fill.name = "ClareiraPhaseOneCoolFill";
  fill.position.set(20, 17, -16);
  root.add(fill);
};

const ensureScene = (parent, materials) => {
  const state = materials.sceneState;
  if (state.initialized) return state;

  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "ClareiraDosEcosPhaseOneRebuilt";
  state.root.userData.phase = 1;
  state.root.userData.visualStyle = "authored-3d-pixel-art";
  parent.add(state.root);

  const scene = parent.parent;
  if (scene?.isScene) scene.background = new THREE.Color(0x153528);

  addLighting(state.root);
  state.ground = addTerrain(state.root, materials.sceneMaterials);
  return state;
};

const noVisual = () => {
  const group = new THREE.Group();
  group.visible = false;
  return group;
};

export const createEnvironmentMaterials = () => {
  const sceneMaterials = createSceneMaterials();
  const materials = {
    sceneMaterials,
    grass: createPlaceholderMaterial(),
    path: createPlaceholderMaterial(),
    stone: createPlaceholderMaterial(),
    shore: createPlaceholderMaterial(),
    cliff: sceneMaterials.cliff,
    border: createPlaceholderMaterial(),
    accent: createPlaceholderMaterial(),
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

export const createTree = () => noVisual();
export const createHouse = () => noVisual();
export const createFenceSegment = () => noVisual();
export const createSign = () => noVisual();
export const createTallGrassPatch = () => noVisual();
export const createFlowerCluster = () => noVisual();
export const createRock = () => noVisual();
export const createRootGate = () => noVisual();

export const createPuzzleMarker = () => {
  const group = noVisual();
  const crystal = new THREE.Object3D();
  crystal.visible = false;
  group.add(crystal);
  return { group, crystal };
};

export const createWaterSurface = ({ parent, materials }) => {
  const state = ensureScene(parent, materials);
  return state.ground.grass;
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
