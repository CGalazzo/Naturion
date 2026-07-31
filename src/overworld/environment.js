import { THREE } from "./engine.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;

const createGroundLayer = (texture) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "BosqueLuminalReferenceGround";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.12;
  mesh.renderOrder = -1000;
  mesh.frustumCulled = true;
  return { mesh, material, geometry };
};

const ensureScene = (parent, materials) => {
  const state = materials.sceneState;
  if (state.initialized) return state;

  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "BosqueLuminalReferenceScene";
  parent.add(state.root);

  const ground = createGroundLayer(materials.textures.ground);
  state.root.add(ground.mesh);
  state.ground = ground;
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
    sceneState: {
      initialized: false,
      root: null,
      ground: null
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

const noVisual = () => new THREE.Group();

// A arte completa já contém esses elementos. As funções permanecem para
// preservar a API usada pelo mapa e manter colisões/interações independentes.
export const createTree = () => noVisual();
export const createHouse = () => noVisual();
export const createFenceSegment = () => noVisual();
export const createSign = () => noVisual();
export const createTallGrassPatch = () => noVisual();
export const createFlowerCluster = () => noVisual();
export const createRock = () => noVisual();
export const createRootGate = () => noVisual();

export const createPuzzleMarker = () => {
  const group = new THREE.Group();
  const crystal = new THREE.Object3D();
  crystal.visible = false;
  group.add(crystal);
  return { group, crystal };
};

export const createWaterSurface = ({ parent, materials }) => {
  const state = ensureScene(parent, materials);
  return state.ground.mesh;
};

export const disposeEnvironmentMaterials = (materials) => {
  const state = materials?.sceneState;
  state?.ground?.geometry?.dispose?.();
  state?.ground?.material?.dispose?.();
  state?.root?.removeFromParent?.();

  [materials?.grass, materials?.path, materials?.stone, materials?.shore].forEach((material) => material?.dispose?.());
};
