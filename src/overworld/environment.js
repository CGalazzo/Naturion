import { THREE } from "./engine.js";
import { clonePixelTexture, configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;
const WORLD_MIN_Z = -23;
const FOREGROUND_STRIPS = 32;
const ANIMATION_FRAMES = 4;

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
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    opacity,
    alphaTest,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  return { mesh, material };
};

const createAnimatedLayer = ({ texture, name, y, renderOrder }) => {
  const frameTexture = clonePixelTexture(texture, `${name}-texture`);
  configureAtlasFrame(frameTexture, { rows: ANIMATION_FRAMES, row: 0 });
  const layer = makePlane({
    texture: frameTexture,
    y,
    transparent: true,
    alphaTest: 0.01,
    renderOrder,
    name
  });
  layer.texture = frameTexture;
  layer.frame = -1;
  return layer;
};

const createForegroundStrips = (texture) => {
  const strips = [];
  const stripDepth = WORLD_DEPTH / FOREGROUND_STRIPS;
  for (let index = 0; index < FOREGROUND_STRIPS; index += 1) {
    const stripTexture = clonePixelTexture(texture, `bosque-foreground-strip-${index}`);
    configureAtlasFrame(stripTexture, {
      rows: FOREGROUND_STRIPS,
      row: index
    });
    const z = WORLD_MIN_Z + ((index + 0.5) * stripDepth);
    const strip = makePlane({
      texture: stripTexture,
      depth: stripDepth + 0.025,
      z,
      y: -0.05,
      transparent: true,
      alphaTest: 0.01,
      renderOrder: depthOrderForZ(z, 45),
      name: `BosqueForegroundStrip-${index}`
    });
    strip.texture = stripTexture;
    strips.push(strip);
  }
  return strips;
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
    y: -0.105,
    transparent: true,
    renderOrder: -850,
    name: "BosquePaintedShadows"
  });
  const water = createAnimatedLayer({
    texture: materials.textures.waterAtlas,
    name: "BosqueWaterAnimation",
    y: -0.095,
    renderOrder: -700
  });
  const grass = createAnimatedLayer({
    texture: materials.textures.grassAtlas,
    name: "BosqueGrassAnimation",
    y: -0.085,
    renderOrder: -650
  });
  const effects = createAnimatedLayer({
    texture: materials.textures.effectsAtlas,
    name: "BosqueEffectsAnimation",
    y: -0.075,
    renderOrder: depthOrderForZ(23, 80)
  });
  const foreground = createForegroundStrips(materials.textures.foreground);

  state.root.add(
    ground.mesh,
    shadows.mesh,
    water.mesh,
    grass.mesh,
    ...foreground.map((strip) => strip.mesh),
    effects.mesh
  );
  state.layers = { ground, shadows, water, grass, effects, foreground };
  state.disposables.push(ground, shadows, water, grass, effects, ...foreground);
  return state;
};

const hiddenMaterial = (color = 0x173d33, transparent = false) => new THREE.MeshBasicMaterial({
  color,
  transparent,
  opacity: transparent ? 0 : 1,
  depthWrite: false,
  depthTest: false,
  toneMapped: false
});

export const createEnvironmentMaterials = (textures) => {
  const materials = {
    textures,
    grass: hiddenMaterial(0x173d33),
    path: hiddenMaterial(0xffffff, true),
    stone: hiddenMaterial(0xffffff, true),
    shore: hiddenMaterial(0xffffff, true),
    water: [],
    sceneState: {
      initialized: false,
      updaterRegistered: false,
      root: null,
      layers: null,
      disposables: []
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
    item.mesh?.geometry?.dispose?.();
    item.material?.dispose?.();
    item.texture?.dispose?.();
  });
  state?.root?.removeFromParent?.();
  [materials?.grass, materials?.path, materials?.stone, materials?.shore].forEach((material) => material?.dispose?.());
};
