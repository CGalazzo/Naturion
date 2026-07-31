import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;
const WORLD_MIN_Z = -23;
const OCCLUSION_BANDS = 8;
const ANIMATION_FRAMES = 4;

const createLayerMaterial = ({
  texture,
  transparent = false,
  opacity = 1,
  alphaTest = 0
}) => new THREE.MeshBasicMaterial({
  map: texture,
  transparent,
  opacity,
  alphaTest,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide
});

const makePlane = ({
  texture,
  width = WORLD_WIDTH,
  depth = WORLD_DEPTH,
  x = 0,
  z = 0,
  y = -0.1,
  transparent = false,
  opacity = 1,
  alphaTest = 0,
  renderOrder = 0,
  name = "Layer"
}) => {
  const material = createLayerMaterial({ texture, transparent, opacity, alphaTest });
  const geometry = new THREE.PlaneGeometry(width, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = true;
  return { mesh, material, geometry };
};

const createAnimatedLayer = ({ texture, name, y, renderOrder }) => {
  configureAtlasFrame(texture, { rows: ANIMATION_FRAMES, row: 0 });
  const layer = makePlane({
    texture,
    y,
    transparent: true,
    alphaTest: 0.035,
    renderOrder,
    name
  });
  layer.texture = texture;
  layer.frame = -1;
  return layer;
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
  const material = createLayerMaterial({
    texture,
    transparent: true,
    alphaTest: 0.045
  });
  const bandDepth = WORLD_DEPTH / OCCLUSION_BANDS;
  const meshes = [];
  const geometries = [];

  for (let index = 0; index < OCCLUSION_BANDS; index += 1) {
    const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, bandDepth + 0.04);
    setBandUvs(geometry, index);
    const z = WORLD_MIN_Z + ((index + 0.5) * bandDepth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `BosqueForegroundBand-${index}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -0.05, z);
    mesh.renderOrder = depthOrderForZ(z, 45);
    mesh.frustumCulled = true;
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
  state.root.name = "BosqueLuminalPrerenderedLayers";
  parent.add(state.root);

  const ground = makePlane({
    texture: materials.textures.ground,
    y: -0.12,
    renderOrder: -1000,
    name: "BosqueGround"
  });
  const shadows = makePlane({
    texture: materials.textures.shadows,
    y: -0.108,
    transparent: true,
    alphaTest: 0.02,
    renderOrder: -850,
    name: "BosquePaintedShadows"
  });
  const water = createAnimatedLayer({
    texture: materials.textures.waterAtlas,
    name: "BosqueWaterAnimation",
    y: -0.096,
    renderOrder: -700
  });
  const grass = createAnimatedLayer({
    texture: materials.textures.grassAtlas,
    name: "BosqueGrassAnimation",
    y: -0.086,
    renderOrder: -650
  });
  const effects = createAnimatedLayer({
    texture: materials.textures.effectsAtlas,
    name: "BosqueEffectsAnimation",
    y: -0.074,
    renderOrder: depthOrderForZ(23, 80)
  });
  const foreground = createForegroundBands(materials.textures.foreground);

  state.root.add(
    ground.mesh,
    shadows.mesh,
    water.mesh,
    grass.mesh,
    ...foreground.meshes,
    effects.mesh
  );

  state.layers = { ground, shadows, water, grass, effects, foreground };
  state.disposables.push(ground, shadows, water, grass, effects);
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
      updaterRegistered: false,
      root: null,
      layers: null,
      disposables: [],
      removeUpdater: null
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

export const createWaterSurface = ({ parent, engine, materials }) => {
  const state = ensureScene(parent, materials);
  if (!state.updaterRegistered) {
    state.updaterRegistered = true;
    state.removeUpdater = engine.addUpdater((delta, elapsed) => {
      if (document.hidden) return;
      const frame = Math.floor(elapsed * 3) % ANIMATION_FRAMES;
      [state.layers.water, state.layers.grass, state.layers.effects].forEach((layer) => {
        if (layer.frame === frame) return;
        configureAtlasFrame(layer.texture, { rows: ANIMATION_FRAMES, row: frame });
        layer.frame = frame;
      });
    });
  }
  return state.layers.water.mesh;
};

export const disposeEnvironmentMaterials = (materials) => {
  const state = materials?.sceneState;
  state?.removeUpdater?.();

  state?.disposables?.forEach((item) => {
    item.geometry?.dispose?.();
    item.material?.dispose?.();
  });

  const foreground = state?.layers?.foreground;
  foreground?.geometries?.forEach((geometry) => geometry.dispose());
  foreground?.material?.dispose?.();
  state?.root?.removeFromParent?.();

  [materials?.grass, materials?.path, materials?.stone, materials?.shore].forEach((material) => material?.dispose?.());
};
