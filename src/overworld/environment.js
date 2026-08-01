import { THREE } from "./engine.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;
const HALF_WIDTH = WORLD_WIDTH / 2;
const HALF_DEPTH = WORLD_DEPTH / 2;
const TEXTURE_SIZE = 32;

const ownedTextures = new Set();
const ownedMaterials = new Set();
const ownedGeometries = new Set();

const pixelTexture = ({ name, base, light, dark, marks = [] }) => {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = false;
  context.fillStyle = base;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  context.fillStyle = light;
  context.fillRect(0, 0, TEXTURE_SIZE, 3);
  context.fillRect(2, 5, 8, 3);
  context.fillRect(19, 9, 9, 3);
  context.fillRect(6, 20, 12, 3);
  context.fillRect(24, 26, 6, 3);

  context.fillStyle = dark;
  context.fillRect(0, 29, TEXTURE_SIZE, 3);
  context.fillRect(12, 6, 5, 3);
  context.fillRect(2, 13, 7, 3);
  context.fillRect(21, 17, 8, 3);
  context.fillRect(10, 27, 8, 2);

  marks.forEach(({ color, rects }) => {
    context.fillStyle = color;
    rects.forEach(([x, y, width, height]) => context.fillRect(x, y, width, height));
  });

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

const makeMaterial = (texture, { color = 0xffffff, emissive = 0x000000 } = {}) => {
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    color,
    emissive,
    flatShading: true
  });
  material.toneMapped = false;
  ownedMaterials.add(material);
  return material;
};

const box = ({ width, height, depth, material, x = 0, y = 0, z = 0, name = "PhaseOneBlock" }) => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  ownedGeometries.add(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.frustumCulled = true;
  return mesh;
};

const createTextures = () => ({
  grass: pixelTexture({
    name: "phase1-grass",
    base: "#4f8739",
    light: "#73a84c",
    dark: "#2d5f31",
    marks: [
      { color: "#91bd5c", rects: [[14, 14, 2, 4], [4, 24, 2, 3], [27, 5, 2, 4]] },
      { color: "#234c2c", rects: [[15, 18, 2, 2], [5, 27, 2, 2], [28, 9, 2, 2]] }
    ]
  }),
  path: pixelTexture({
    name: "phase1-path",
    base: "#b48750",
    light: "#d2ad72",
    dark: "#765637",
    marks: [
      { color: "#e3c68b", rects: [[4, 9, 5, 2], [20, 22, 6, 2], [13, 3, 3, 2]] },
      { color: "#5b4633", rects: [[11, 16, 6, 2], [25, 8, 3, 2], [2, 25, 4, 2]] }
    ]
  }),
  pathEdge: pixelTexture({
    name: "phase1-path-edge",
    base: "#8d693f",
    light: "#ae8450",
    dark: "#513d2e"
  }),
  cliff: pixelTexture({
    name: "phase1-cliff",
    base: "#5f4934",
    light: "#866548",
    dark: "#332c28",
    marks: [
      { color: "#416044", rects: [[1, 4, 9, 3], [20, 14, 11, 3], [7, 25, 8, 3]] }
    ]
  }),
  border: pixelTexture({
    name: "phase1-border",
    base: "#244f33",
    light: "#3c7140",
    dark: "#143226"
  }),
  accent: pixelTexture({
    name: "phase1-accent",
    base: "#5c963f",
    light: "#83b756",
    dark: "#356c34"
  })
});

const addGroundBase = (root, materials) => {
  const cliff = box({
    width: WORLD_WIDTH,
    height: 1.2,
    depth: WORLD_DEPTH,
    material: materials.cliff,
    y: -0.68,
    name: "ClareiraPhaseOneCliffBase"
  });
  root.add(cliff);

  const grass = box({
    width: WORLD_WIDTH - 1,
    height: 0.24,
    depth: WORLD_DEPTH - 1,
    material: materials.grass,
    y: 0.01,
    name: "ClareiraPhaseOneGrassTop"
  });
  grass.material.map.repeat.set(14.25, 11.25);
  root.add(grass);
};

const addPathTile = (root, materials, x, z, width = 1.65, depth = 1.55, rotation = 0) => {
  const edge = box({
    width: width + 0.18,
    height: 0.12,
    depth: depth + 0.18,
    material: materials.pathEdge,
    x,
    y: 0.19,
    z,
    name: "ClareiraPhaseOnePathEdge"
  });
  edge.rotation.y = rotation;
  root.add(edge);

  const tile = box({
    width,
    height: 0.11,
    depth,
    material: materials.path,
    x,
    y: 0.27,
    z,
    name: "ClareiraPhaseOnePathTile"
  });
  tile.rotation.y = rotation;
  root.add(tile);
};

const addPath = (root, materials) => {
  for (let z = -21; z <= 20; z += 1.35) {
    const bend = Math.sin((z + 5) * 0.18) * 0.55;
    const width = z > 11 ? 2.0 : z < -13 ? 1.9 : 1.7;
    addPathTile(root, materials, bend, z, width, 1.55, Math.sin(z * 0.21) * 0.035);
  }

  for (let x = -18; x <= 17; x += 1.4) {
    const z = -3.8 + Math.sin(x * 0.22) * 0.45;
    addPathTile(root, materials, x, z, 1.6, 1.45, Math.sin(x * 0.19) * 0.04);
  }

  for (let x = -12; x <= 12; x += 1.45) {
    const z = 8.8 + Math.sin(x * 0.27) * 0.4;
    addPathTile(root, materials, x, z, 1.65, 1.5, Math.sin(x * 0.15) * 0.03);
  }

  for (let x = -4.2; x <= 4.2; x += 1.4) {
    for (let z = 13; z <= 17.4; z += 1.35) {
      addPathTile(root, materials, x, z, 1.55, 1.5, 0);
    }
  }
};

const addGroundAccents = (root, materials) => {
  const placements = [
    [-21, -16, 2.8, 1.9], [-16, -10, 2.2, 1.4], [-22, 2, 3.1, 1.7],
    [-17, 15, 2.5, 1.5], [-10, 18, 2.0, 1.2], [10, 18, 2.2, 1.2],
    [18, 13, 2.6, 1.6], [22, 2, 2.7, 1.5], [18, -11, 2.3, 1.3],
    [23, -17, 3.0, 1.8], [-10, -17, 2.2, 1.4], [11, -16, 2.5, 1.4]
  ];

  placements.forEach(([x, z, width, depth], index) => {
    const patch = box({
      width,
      height: 0.035,
      depth,
      material: materials.accent,
      x,
      y: 0.155,
      z,
      name: "ClareiraPhaseOneGroundAccent"
    });
    patch.rotation.y = (index % 3 - 1) * 0.12;
    root.add(patch);
  });
};

const addBoundary = (root, materials) => {
  const segment = 2.25;
  const opening = 3.8;

  for (let x = -HALF_WIDTH + 1; x <= HALF_WIDTH - 1; x += segment) {
    const isOpening = Math.abs(x) < opening;
    if (!isOpening) {
      const northHeight = 1.05 + ((Math.round(x / segment) & 1) ? 0.2 : 0);
      root.add(box({
        width: segment + 0.15,
        height: northHeight,
        depth: 1.75,
        material: materials.border,
        x,
        y: 0.52,
        z: -HALF_DEPTH + 0.6,
        name: "ClareiraPhaseOneBoundary"
      }));
      root.add(box({
        width: segment + 0.15,
        height: northHeight + 0.15,
        depth: 1.75,
        material: materials.border,
        x,
        y: 0.59,
        z: HALF_DEPTH - 0.6,
        name: "ClareiraPhaseOneBoundary"
      }));
    }
  }

  for (let z = -HALF_DEPTH + 1; z <= HALF_DEPTH - 1; z += segment) {
    const height = 1.05 + ((Math.round(z / segment) & 1) ? 0.18 : 0);
    root.add(box({
      width: 1.75,
      height,
      depth: segment + 0.15,
      material: materials.border,
      x: -HALF_WIDTH + 0.6,
      y: 0.52,
      z,
      name: "ClareiraPhaseOneBoundary"
    }));
    root.add(box({
      width: 1.75,
      height: height + 0.12,
      depth: segment + 0.15,
      material: materials.border,
      x: HALF_WIDTH - 0.6,
      y: 0.58,
      z,
      name: "ClareiraPhaseOneBoundary"
    }));
  }
};

const addLighting = (root) => {
  const ambient = new THREE.HemisphereLight(0xbfe5c0, 0x253a2f, 1.55);
  ambient.name = "ClareiraPhaseOneAmbient";
  root.add(ambient);

  const key = new THREE.DirectionalLight(0xffe5ae, 1.45);
  key.name = "ClareiraPhaseOneKey";
  key.position.set(-18, 28, 12);
  root.add(key);

  const fill = new THREE.DirectionalLight(0x8fd8c4, 0.42);
  fill.name = "ClareiraPhaseOneFill";
  fill.position.set(18, 14, -15);
  root.add(fill);
};

const ensureScene = (parent, materials) => {
  const state = materials.sceneState;
  if (state.initialized) return state;

  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "ClareiraDosEcosPhaseOne";
  state.root.userData.phase = 1;
  parent.add(state.root);

  addLighting(state.root);
  addGroundBase(state.root, materials);
  addPath(state.root, materials);
  addGroundAccents(state.root, materials);
  addBoundary(state.root, materials);
  return state;
};

const noVisual = () => {
  const group = new THREE.Group();
  group.visible = false;
  return group;
};

export const createEnvironmentMaterials = () => {
  const textures = createTextures();
  const materials = {
    textures,
    grass: makeMaterial(textures.grass),
    path: makeMaterial(textures.path),
    stone: makeMaterial(textures.cliff),
    shore: makeMaterial(textures.pathEdge),
    cliff: makeMaterial(textures.cliff),
    border: makeMaterial(textures.border),
    accent: makeMaterial(textures.accent),
    water: [],
    sceneState: {
      initialized: false,
      root: null
    }
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
  return state.root;
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
