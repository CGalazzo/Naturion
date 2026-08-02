import { THREE } from "./engine.js";
import { depthOrderForZ } from "./depth.js";

const SOURCE_WIDTH = 216;
const SOURCE_HEIGHT = 156;
const WORLD_DEPTH = 46;
const WORLD_WIDTH = WORLD_DEPTH * (SOURCE_WIDTH / SOURCE_HEIGHT);
const WORLD_MIN_Z = -WORLD_DEPTH / 2;
const OCCLUSION_BANDS = 12;

const makePlane = ({
  texture,
  width = WORLD_WIDTH,
  depth = WORLD_DEPTH,
  y = 0.16,
  transparent = false,
  alphaTest = 0,
  depthTest = true,
  depthWrite = true,
  renderOrder = -1000,
  name
}) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    alphaTest,
    depthTest,
    depthWrite,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const geometry = new THREE.PlaneGeometry(width, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return { mesh, material, geometry };
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
    transparent: false,
    alphaTest: 0.08,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const bandDepth = WORLD_DEPTH / OCCLUSION_BANDS;
  const meshes = [];
  const geometries = [];

  for (let index = 0; index < OCCLUSION_BANDS; index += 1) {
    const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, bandDepth + 0.025);
    setBandUvs(geometry, index);
    const z = WORLD_MIN_Z + ((index + 0.5) * bandDepth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `BosqueApprovedForeground-${index}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.19, z);
    mesh.renderOrder = depthOrderForZ(z, 35);
    mesh.frustumCulled = true;
    meshes.push(mesh);
    geometries.push(geometry);
  }
  return { meshes, geometries, material };
};

const createDioramaBase = () => {
  const geometry = new THREE.BoxGeometry(WORLD_WIDTH + 0.35, 0.78, WORLD_DEPTH + 0.35);
  const material = new THREE.MeshBasicMaterial({ color: 0x10291f, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "BosqueApprovedDioramaBase";
  mesh.position.y = -0.25;
  mesh.renderOrder = -1200;
  return { mesh, material, geometry };
};

const createHeroLighting = (root) => {
  const hemisphere = new THREE.HemisphereLight(0xffe4a8, 0x163c32, 1.35);
  hemisphere.name = "BosqueApprovedHemisphere";
  root.add(hemisphere);
  const key = new THREE.DirectionalLight(0xffd18a, 1.55);
  key.name = "BosqueApprovedWarmKey";
  key.position.set(-12, 24, 15);
  root.add(key);
  const fill = new THREE.DirectionalLight(0x72b7a3, 0.28);
  fill.name = "BosqueApprovedCoolFill";
  fill.position.set(16, 10, -14);
  root.add(fill);
};

const ensureScene = (parent, materials) => {
  const state = materials.sceneState;
  if (state.initialized) return state;
  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "BosqueLuminalApprovedDiorama";
  state.root.userData.visualSource = "approved-reference-ground";
  state.root.userData.sourceResolution = `${SOURCE_WIDTH}x${SOURCE_HEIGHT}`;
  parent.add(state.root);

  const base = createDioramaBase();
  const ground = makePlane({
    texture: materials.textures.ground,
    name: "BosqueApprovedGround",
    renderOrder: -1000
  });
  const foreground = createForegroundBands(materials.textures.foreground);
  createHeroLighting(state.root);
  state.root.add(base.mesh, ground.mesh, ...foreground.meshes);
  state.layers = { base, ground, foreground };
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
// vegetação. Estes contratos continuam existindo para preservar mapa,
// interações e colisões sem desenhar objetos duplicados sobre a arte.
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
  layers?.base?.geometry?.dispose?.();
  layers?.base?.material?.dispose?.();
  layers?.ground?.geometry?.dispose?.();
  layers?.ground?.material?.dispose?.();
  layers?.foreground?.geometries?.forEach((geometry) => geometry.dispose());
  layers?.foreground?.material?.dispose?.();
  state?.root?.removeFromParent?.();
  [materials?.grass, materials?.path, materials?.stone, materials?.shore].forEach((material) => material?.dispose?.());
};

export const APPROVED_BOSQUE_WORLD_SIZE = Object.freeze({
  width: WORLD_WIDTH,
  depth: WORLD_DEPTH,
  sourceWidth: SOURCE_WIDTH,
  sourceHeight: SOURCE_HEIGHT
});
