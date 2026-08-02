import { THREE } from "./engine.js";
import { depthOrderForZ } from "./depth.js";

const SOURCE_WIDTH = 1536;
const SOURCE_HEIGHT = 1024;
const WORLD_DEPTH = 46;
const CAMERA_OFFSET_Y = 29.5;
const CAMERA_OFFSET_Z = 22.5;
const CAMERA_DISTANCE = Math.hypot(CAMERA_OFFSET_Y, CAMERA_OFFSET_Z);
const SCREEN_UP_Y = CAMERA_OFFSET_Z / CAMERA_DISTANCE;
const SCREEN_UP_Z = -(CAMERA_OFFSET_Y / CAMERA_DISTANCE);
const DEPTH_PROJECTION = Math.abs(SCREEN_UP_Z);
const PROJECTED_HEIGHT = WORLD_DEPTH * DEPTH_PROJECTION;
const WORLD_WIDTH = PROJECTED_HEIGHT * (SOURCE_WIDTH / SOURCE_HEIGHT);
const PLANE_ROTATION_X = -Math.atan2(CAMERA_OFFSET_Y, CAMERA_OFFSET_Z);
const OCCLUSION_BANDS = 16;

const createArtworkPlane = ({ texture, name, renderOrder }) => {
  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, PROJECTED_HEIGHT);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.rotation.x = PLANE_ROTATION_X;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  return { mesh, geometry, material };
};

const setBandUvs = (geometry, index) => {
  const top = 1 - (index / OCCLUSION_BANDS);
  const bottom = 1 - ((index + 1) / OCCLUSION_BANDS);
  const uv = geometry.attributes.uv;
  uv.setXY(0, 0, top);
  uv.setXY(1, 1, top);
  uv.setXY(2, 0, bottom);
  uv.setXY(3, 1, bottom);
  uv.needsUpdate = true;
};

const createForegroundBands = (texture) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.025,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const bandHeight = PROJECTED_HEIGHT / OCCLUSION_BANDS;
  const meshes = [];
  const geometries = [];

  for (let index = 0; index < OCCLUSION_BANDS; index += 1) {
    const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, bandHeight + 0.02);
    setBandUvs(geometry, index);
    const localY = PROJECTED_HEIGHT * 0.5 - ((index + 0.5) * bandHeight);
    const logicalZ = -localY / DEPTH_PROJECTION;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `BosqueApprovedForeground-${index}`;
    mesh.rotation.x = PLANE_ROTATION_X;
    mesh.position.set(0, localY * SCREEN_UP_Y, localY * SCREEN_UP_Z);
    mesh.renderOrder = depthOrderForZ(logicalZ, 35);
    mesh.frustumCulled = false;
    meshes.push(mesh);
    geometries.push(geometry);
  }

  return { meshes, geometries, material };
};

const ensureScene = (parent, materials) => {
  const state = materials.sceneState;
  if (state.initialized) return state;
  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "BosqueLuminalApprovedDiorama";
  state.root.userData.visualSource = "approved-high-resolution-artwork";
  state.root.userData.sourceResolution = `${SOURCE_WIDTH}x${SOURCE_HEIGHT}`;
  parent.add(state.root);

  const ground = createArtworkPlane({
    texture: materials.textures.ground,
    name: "BosqueApprovedGround",
    renderOrder: -1000
  });
  const foreground = createForegroundBands(materials.textures.foreground);
  state.root.add(ground.mesh, ...foreground.meshes);
  state.layers = { ground, foreground };
  return state;
};

const hiddenMaterial = () => {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  material.visible = false;
  return material;
};

export const createEnvironmentMaterials = (textures) => {
  const materials = {
    textures,
    grass: hiddenMaterial(),
    path: hiddenMaterial(),
    stone: hiddenMaterial(),
    shore: hiddenMaterial(),
    water: [],
    sceneState: { initialized: false, root: null, layers: null }
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

const hiddenGroup = () => {
  const group = new THREE.Group();
  group.visible = false;
  return group;
};

// A composição aprovada já contém árvores, construções, caminhos, pedras e
// vegetação. Os contratos permanecem para preservar os sistemas existentes.
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
  return state.layers.ground.mesh;
};

export const disposeEnvironmentMaterials = (materials) => {
  const state = materials?.sceneState;
  const layers = state?.layers;
  layers?.ground?.geometry?.dispose?.();
  layers?.ground?.material?.dispose?.();
  layers?.foreground?.geometries?.forEach((geometry) => geometry.dispose());
  layers?.foreground?.material?.dispose?.();
  state?.root?.removeFromParent?.();
  [materials?.grass, materials?.path, materials?.stone, materials?.shore]
    .forEach((material) => material?.dispose?.());
};

export const APPROVED_BOSQUE_WORLD_SIZE = Object.freeze({
  width: WORLD_WIDTH,
  depth: WORLD_DEPTH,
  projectedHeight: PROJECTED_HEIGHT,
  sourceWidth: SOURCE_WIDTH,
  sourceHeight: SOURCE_HEIGHT
});
