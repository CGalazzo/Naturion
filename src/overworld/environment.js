import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";
import { VALIDATION_AREA, VALIDATION_OCCLUDERS, VALIDATION_EFFECT } from "./rendering/validation-area.js";
import { shouldAnimateLocalEffect, isWithinRadius } from "./rendering/visibility-controller.js";

const WORLD_WIDTH = 58;
const WORLD_DEPTH = 46;
const EFFECT_FRAMES = 4;

const makePlane = ({ texture, width, depth, x = 0, z = 0, y, transparent = false, alphaTest = 0, renderOrder = 0, name }) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
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
  return { mesh, material };
};

const createAtlasPlaneGeometry = ({ columns, cell }) => {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const u0 = cell / columns;
  const u1 = (cell + 1) / columns;
  const uv = geometry.getAttribute("uv");
  uv.setXY(0, u0, 1);
  uv.setXY(1, u1, 1);
  uv.setXY(2, u0, 0);
  uv.setXY(3, u1, 0);
  uv.needsUpdate = true;
  return geometry;
};

const ensureScene = (parent, materials, engine) => {
  const state = materials.sceneState;
  if (state.initialized) return state;
  state.initialized = true;
  state.root = new THREE.Group();
  state.root.name = "BosqueLuminalVisualResetValidation";
  parent.add(state.root);

  const fallback = makePlane({
    texture: materials.textures.fallbackGround,
    width: WORLD_WIDTH,
    depth: WORLD_DEPTH,
    y: -0.13,
    renderOrder: -1000,
    name: "BosqueFallbackGround"
  });
  const validation = makePlane({
    texture: materials.textures.validationGround,
    width: VALIDATION_AREA.width,
    depth: VALIDATION_AREA.depth,
    x: VALIDATION_AREA.centerX,
    z: VALIDATION_AREA.centerZ,
    y: -0.115,
    renderOrder: -900,
    name: "BosqueValidationGround"
  });

  const occlusionMaterial = new THREE.MeshBasicMaterial({
    map: materials.textures.validationOcclusion,
    transparent: true,
    alphaTest: 0.06,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const occluders = VALIDATION_OCCLUDERS.map((definition) => {
    const mesh = new THREE.Mesh(
      createAtlasPlaneGeometry({ columns: 4, cell: definition.atlasCell }),
      occlusionMaterial
    );
    mesh.name = `ValidationOccluder-${definition.id}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(definition.x, -0.045, definition.z);
    mesh.scale.set(definition.width, definition.depth, 1);
    mesh.renderOrder = depthOrderForZ(definition.sortZ, 45);
    state.root.add(mesh);
    return { definition, mesh };
  });

  const effectTexture = materials.textures.validationEffects;
  configureAtlasFrame(effectTexture, { columns: EFFECT_FRAMES, column: 0 });
  const effect = makePlane({
    texture: effectTexture,
    width: VALIDATION_EFFECT.width,
    depth: VALIDATION_EFFECT.depth,
    x: VALIDATION_EFFECT.x,
    z: VALIDATION_EFFECT.z,
    y: -0.035,
    transparent: true,
    alphaTest: 0.04,
    renderOrder: depthOrderForZ(VALIDATION_EFFECT.z, 10),
    name: "BosqueValidationLocalEffect"
  });

  state.root.add(fallback.mesh, validation.mesh, effect.mesh);
  state.layers = { fallback, validation, effect, occluders, occlusionMaterial };
  state.frame = -1;
  state.removeUpdater = engine.addUpdater((delta, elapsed) => {
    const player = engine.scene.getObjectByName("OverworldPlayer");
    const playerPosition = player?.position;
    const animate = shouldAnimateLocalEffect({ playerPosition, effect: VALIDATION_EFFECT, screenActive: engine.running });
    effect.mesh.visible = animate;
    if (animate) {
      const frame = Math.floor(elapsed * 5) % EFFECT_FRAMES;
      if (frame !== state.frame) {
        configureAtlasFrame(effectTexture, { columns: EFFECT_FRAMES, column: frame });
        state.frame = frame;
      }
    }
    occluders.forEach(({ definition, mesh }) => {
      const near = isWithinRadius(playerPosition, definition, 22);
      mesh.visible = near;
      if (!near || !playerPosition) return;
      const playerBehind = playerPosition.z < definition.sortZ;
      mesh.renderOrder = depthOrderForZ(definition.sortZ, playerBehind ? 80 : -80);
    });
  });
  return state;
};

const hiddenMaterial = () => new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
  toneMapped: false
});

export const createEnvironmentMaterials = (textures) => {
  const proxy = hiddenMaterial();
  const materials = {
    textures,
    grass: proxy,
    path: proxy,
    stone: proxy,
    shore: proxy,
    water: [],
    sceneState: { initialized: false, root: null, layers: null, removeUpdater: null }
  };
  proxy.userData.environmentMaterials = materials;
  return materials;
};

export const createTileInstances = () => null;

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
  const state = ensureScene(parent, materials, engine);
  return state.layers.effect.mesh;
};

export const disposeEnvironmentMaterials = (materials) => {
  const state = materials?.sceneState;
  state?.removeUpdater?.();
  if (state?.layers) {
    state.layers.fallback.mesh.geometry.dispose();
    state.layers.fallback.material.dispose();
    state.layers.validation.mesh.geometry.dispose();
    state.layers.validation.material.dispose();
    state.layers.effect.mesh.geometry.dispose();
    state.layers.effect.material.dispose();
    state.layers.occluders.forEach(({ mesh }) => mesh.geometry.dispose());
    state.layers.occlusionMaterial.dispose();
  }
  state?.root?.removeFromParent?.();
  materials?.grass?.dispose?.();
};
