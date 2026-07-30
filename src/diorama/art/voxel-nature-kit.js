import { THREE } from "../engine.js";
import { createVoxelBlock } from "./voxel-world-kit.js";

const addBlock = (parent, material, x, y, z, width, height = width, depth = width, castShadow = false) => createVoxelBlock({
  parent, x, y: y - height * 0.5, z, width, height, depth, material, castShadow
});

const addVoxelLine = ({ parent, material, from, to, size = 0.24, castShadow = true, occluders = null }) => {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const distance = start.distanceTo(end);
  const steps = Math.max(1, Math.ceil(distance / (size * 1.05)));
  const blocks = [];
  for (let index = 0; index <= steps; index += 1) {
    const position = new THREE.Vector3().lerpVectors(start, end, index / steps);
    const block = addBlock(parent, material, position.x, position.y, position.z, size, size, size, castShadow && index % 3 === 0);
    blocks.push(block);
    occluders?.push(block);
  }
  return blocks;
};

const registerCanopy = (engine, meshes) => meshes.forEach((mesh) => engine.registerOccluder(mesh));

const buildYoungTree = ({ group, materials, engine, scale }) => {
  const trunk = materials.barkYoung;
  addBlock(group, trunk, 0, 1.2 * scale, 0, 0.52 * scale, 2.4 * scale, 0.52 * scale, true);
  addVoxelLine({ parent: group, material: trunk, from: [0, 1.7 * scale, 0], to: [-0.8 * scale, 2.45 * scale, 0.1 * scale], size: 0.25 * scale });
  addVoxelLine({ parent: group, material: trunk, from: [0, 1.8 * scale, 0], to: [0.65 * scale, 2.65 * scale, -0.25 * scale], size: 0.23 * scale });
  const layout = [
    [0, 3.2, 0, 1.08], [-0.68, 3.1, 0.15, 0.86], [0.62, 3.3, -0.18, 0.9],
    [0.05, 3.88, 0, 0.92], [-0.35, 3.72, 0.48, 0.72], [0.4, 3.75, -0.5, 0.7]
  ];
  const canopy = layout.map(([x, y, z, size], index) => addBlock(group, index % 3 === 0 ? materials.leafLight : materials.leaf, x * scale, y * scale, z * scale, size * scale, size * scale, size * scale, index < 4));
  registerCanopy(engine, canopy);
};

const buildCommonTree = ({ group, materials, engine, scale }) => {
  const trunk = materials.bark;
  addBlock(group, trunk, 0, 1.55 * scale, 0, 0.68 * scale, 3.1 * scale, 0.68 * scale, true);
  addVoxelLine({ parent: group, material: trunk, from: [0, 1.9 * scale, 0], to: [-1.35 * scale, 3 * scale, 0.15 * scale], size: 0.3 * scale });
  addVoxelLine({ parent: group, material: trunk, from: [0.05 * scale, 2.2 * scale, 0], to: [1.25 * scale, 3.25 * scale, -0.4 * scale], size: 0.3 * scale });
  [[-0.9, 0.18, 0], [0.85, 0.18, 0.25], [0, 0.15, -0.95], [0.15, 0.15, 0.9]].forEach(([x, y, z]) => addVoxelLine({
    parent: group, material: trunk, from: [0, 0.2 * scale, 0], to: [x * scale, y * scale, z * scale], size: 0.26 * scale, castShadow: false
  }));
  const layout = [
    [-0.9, 3.65, 0, 1.2], [0, 3.8, 0.15, 1.35], [1, 3.8, -0.2, 1.18],
    [-0.35, 4.55, -0.35, 1.05], [0.75, 4.45, 0.45, 1], [-1.15, 4.3, 0.45, 0.88],
    [0.1, 5.15, 0, 0.92], [1.45, 4.15, -0.65, 0.72]
  ];
  const canopy = layout.map(([x, y, z, size], index) => addBlock(group, index % 4 === 0 ? materials.leafLight : materials.leaf, x * scale, y * scale, z * scale, size * scale, size * scale, size * scale, index < 6));
  registerCanopy(engine, canopy);
};

const buildAncientTree = ({ group, materials, engine, scale }) => {
  const trunk = materials.barkDark;
  addBlock(group, trunk, -0.18 * scale, 1.85 * scale, 0, 1.08 * scale, 3.7 * scale, 0.98 * scale, true);
  addBlock(group, trunk, 0.42 * scale, 2.35 * scale, 0.1 * scale, 0.62 * scale, 3.1 * scale, 0.68 * scale, true);
  addBlock(group, materials.darkDirt, -0.35 * scale, 1.55 * scale, -0.51 * scale, 0.38 * scale, 0.8 * scale, 0.08 * scale, false);
  const branches = [
    [[-0.25, 2.8, 0], [-2.15, 4.15, 0.25]], [[0.35, 3.1, 0], [2.35, 4.45, -0.45]],
    [[-0.05, 3.45, 0.1], [-0.65, 5.25, 1.5]], [[0.2, 3.6, 0], [0.9, 5.3, -1.45]],
    [[0.2, 2.6, 0.1], [1.7, 3.45, 1.15]]
  ];
  branches.forEach(([from, to], index) => addVoxelLine({ parent: group, material: trunk, from: from.map((v) => v * scale), to: to.map((v) => v * scale), size: (0.34 - index * 0.025) * scale }));
  const roots = [[-2.25, 0, 0], [2.1, 0, 0.45], [0.2, 0, -2], [-0.5, 0, 2], [-1.6, 0, -1.4], [1.45, 0, 1.55]];
  roots.forEach(([x, y, z], index) => addVoxelLine({ parent: group, material: trunk, from: [0, 0.25 * scale, 0], to: [x * scale, y, z * scale], size: (0.34 - index * 0.018) * scale, castShadow: false }));
  const layout = [
    [-1.85, 4.85, 0.1, 1.45], [-0.75, 5.25, 0.7, 1.52], [0.55, 5.1, -0.25, 1.6], [1.85, 4.85, -0.45, 1.35],
    [-1.25, 6.05, -0.55, 1.25], [0.05, 6.25, 0.35, 1.42], [1.3, 5.95, 0.55, 1.15],
    [-0.4, 7.05, -0.25, 1.08], [0.8, 6.8, -0.8, 0.9], [-2.35, 5.45, 0.8, 0.8]
  ];
  const canopy = layout.map(([x, y, z, size], index) => addBlock(group, index % 3 === 0 ? materials.leaf : materials.leafAncient, x * scale, y * scale, z * scale, size * scale, size * scale, size * scale, index < 7));
  registerCanopy(engine, canopy);
  addBlock(group, materials.mossStone, -0.55 * scale, 2.55 * scale, -0.55 * scale, 0.55 * scale, 0.16 * scale, 0.18 * scale, false);
  createMushroomCluster({ parent: group, materials, x: 0.62 * scale, y: 0.45 * scale, z: -0.45 * scale, scale: 0.6 * scale, color: 0xe99a68 });
};

const buildLuminalTree = ({ group, materials, engine, scale }) => {
  const trunk = materials.barkDark;
  addBlock(group, trunk, 0, 1.7 * scale, 0, 0.74 * scale, 3.4 * scale, 0.74 * scale, true);
  const branches = [
    [[0, 2.2, 0], [-1.6, 3.7, 0.4]], [[0, 2.5, 0], [1.65, 3.9, -0.5]],
    [[0, 2.7, 0], [-0.4, 4.6, -1.2]], [[0, 2.8, 0], [0.65, 4.75, 1.15]]
  ];
  branches.forEach(([from, to]) => addVoxelLine({ parent: group, material: trunk, from: from.map((v) => v * scale), to: to.map((v) => v * scale), size: 0.28 * scale }));
  const layout = [
    [-1.35, 4.25, 0.25, 1.18], [0, 4.35, -0.25, 1.32], [1.35, 4.35, 0.15, 1.15],
    [-0.75, 5.2, -0.65, 1.05], [0.6, 5.35, 0.65, 1.08], [0, 6.15, 0, 0.95]
  ];
  const canopy = layout.map(([x, y, z, size], index) => addBlock(group, index % 2 ? materials.leafLuminal : materials.leafLight, x * scale, y * scale, z * scale, size * scale, size * scale, size * scale, index < 5));
  registerCanopy(engine, canopy);
  [[-0.75, 4.7, 0.7], [0.9, 5.25, -0.45], [0.1, 6.45, 0.2]].forEach(([x, y, z], index) => {
    const crystal = addBlock(group, materials.clone(materials.crystal), x * scale, y * scale, z * scale, 0.24 * scale, 0.45 * scale, 0.24 * scale, false);
    engine.addUpdater((delta, elapsed) => {
      crystal.material.emissiveIntensity = 0.5 + (Math.floor(elapsed * 5 + index) % 3) * 0.09;
    });
  });
};

export const createPixelTree = ({ parent, stage, engine, materials, x, z, scale = 1, variant = "common", rotation = 0, obstacle = true }) => {
  const group = new THREE.Group();
  group.name = `DefinitiveTree-${variant}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  if (variant === "young") buildYoungTree({ group, materials, engine, scale });
  else if (variant === "ancient") buildAncientTree({ group, materials, engine, scale });
  else if (variant === "luminal" || variant === "magic") buildLuminalTree({ group, materials, engine, scale });
  else buildCommonTree({ group, materials, engine, scale });
  if (obstacle) {
    const trunkRadius = (variant === "ancient" ? 0.62 : variant === "young" ? 0.34 : 0.45) * scale;
    stage.obstacles.push({ type: "circle", x, z, radius: trunkRadius * 1.28 });
  }
  return group;
};

const SHRUB_RECIPES = {
  normal: [[0, 0.45, 0, 0.72], [-0.55, 0.36, 0.2, 0.5], [0.48, 0.34, -0.22, 0.56], [0.05, 0.3, 0.52, 0.46]],
  light: [[0, 0.38, 0, 0.58], [-0.38, 0.34, -0.28, 0.48], [0.4, 0.46, 0.22, 0.54], [0.05, 0.74, 0.02, 0.42]],
  ancient: [[0, 0.42, 0, 0.66], [-0.62, 0.3, 0.05, 0.52], [0.62, 0.3, 0.08, 0.52], [-0.28, 0.58, -0.4, 0.46], [0.35, 0.6, 0.35, 0.44]]
};

export const createPixelShrub = ({ parent, stage, materials, x, z, scale = 1, tint = "normal" }) => {
  const group = new THREE.Group();
  group.name = `Shrub-${tint}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const material = tint === "light" ? materials.leafLight : tint === "ancient" ? materials.leafAncient : materials.leaf;
  (SHRUB_RECIPES[tint] || SHRUB_RECIPES.normal).forEach(([px, py, pz, size], index) => addBlock(group, index % 3 === 0 ? materials.leafLight : material, px * scale, py * scale, pz * scale, size * scale, size * scale, size * scale, index === 0));
  return group;
};

export const createGrassTuft = ({ parent, stage, materials, x, z, scale = 1, windObjects = [], tall = false }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const blades = tall
    ? [[-0.22, 0.65, 0, 0.1], [0, 0.82, 0.05, 0.12], [0.2, 0.72, -0.08, 0.1], [-0.08, 0.58, 0.22, 0.09], [0.12, 0.52, -0.22, 0.09]]
    : [[-0.2, 0.34, 0, 0.11], [0, 0.46, 0.04, 0.13], [0.2, 0.38, -0.04, 0.11], [-0.05, 0.3, 0.19, 0.09]];
  blades.forEach(([bx, height, bz, width], index) => createVoxelBlock({
    parent: group, x: bx * scale, y: 0, z: bz * scale, width: width * scale, height: height * scale, depth: width * scale,
    material: index % 2 ? materials.grassLight : materials.grass
  }));
  group.userData.windPhase = x * 0.31 + z * 0.17;
  windObjects.push(group);
  return group;
};

export const createFern = ({ parent, stage, materials, x, z, scale = 1, windObjects = [], variant = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const leaves = variant % 2 ? 5 : 7;
  for (let index = 0; index < leaves; index += 1) {
    const angle = index / leaves * Math.PI * 2 + variant * 0.25;
    const segments = variant % 2 ? 5 : 4;
    for (let segment = 0; segment < segments; segment += 1) {
      const reach = 0.14 + segment * 0.14;
      addBlock(group, segment % 2 ? materials.leafLight : materials.leaf, Math.cos(angle) * reach * scale, (0.12 + segment * 0.13) * scale, Math.sin(angle) * reach * scale, (0.17 - segment * 0.014) * scale);
    }
  }
  group.userData.windPhase = 2 + x * 0.19 + variant;
  windObjects.push(group);
  return group;
};

export const createFlower = ({ parent, stage, materials, x, z, scale = 1, color = 0xffda72 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const stem = materials.tint(materials.grass, 0x7fc45f, `stem-${color}`);
  const petals = materials.tint(color === 0xd6a1ff ? materials.flowerViolet : materials.flowerGold, color, `petal-${color}`);
  createVoxelBlock({ parent: group, y: 0, width: 0.08 * scale, height: 0.42 * scale, depth: 0.08 * scale, material: stem });
  [[-0.12, 0], [0.12, 0], [0, -0.12], [0, 0.12]].forEach(([px, pz]) => addBlock(group, petals, px * scale, 0.48 * scale, pz * scale, 0.14 * scale));
  addBlock(group, materials.tint(materials.crystal, 0xfff0a0, "flower-center"), 0, 0.49 * scale, 0, 0.12 * scale);
  return group;
};

export const createMushroomCluster = ({ parent, materials, x = 0, y = 0, z = 0, scale = 1, color = 0xe98664 }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const cap = materials.tint(materials.crystal, color, `mushroom-${color}`);
  [[0, 0.34, 0, 1], [0.28, 0.24, 0.16, 0.62], [-0.24, 0.2, -0.12, 0.48]].forEach(([px, py, pz, local], index) => {
    addBlock(group, materials.cutWood, px * scale, py * scale * 0.5, pz * scale, 0.1 * scale * local, 0.34 * scale * local, 0.1 * scale * local);
    addBlock(group, cap, px * scale, py * scale, pz * scale, 0.32 * scale * local, 0.16 * scale * local, 0.32 * scale * local, index === 0);
  });
  return group;
};

export const createMushroom = ({ parent, stage, materials, x, z, scale = 1, color = 0xe98664 }) => {
  const y = stage.getHeightAt(x, z);
  return createMushroomCluster({ parent, materials, x, y, z, scale, color });
};

export const createVine = ({ parent, materials, x = 0, y = 0, z = 0, length = 2, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  parent.add(group);
  const segments = Math.max(4, Math.ceil(length / 0.28));
  for (let index = 0; index < segments; index += 1) {
    addBlock(group, index % 3 === 0 ? materials.leafLight : materials.leaf, Math.sin(index * 0.8) * 0.1, -index * length / segments, 0, 0.11, 0.28, 0.11);
  }
  return group;
};

export const createLeafPile = ({ parent, stage, materials, x, z, color = 0xa77d3f, rotation = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z) + 0.035, z);
  group.rotation.y = rotation;
  parent.add(group);
  const material = materials.tint(materials.leaf, color, `leaf-pile-${color}`);
  [[-0.22, 0, 0, 0.3, 0.05, 0.17], [0.12, 0.01, 0.08, 0.26, 0.045, 0.16], [0.3, 0, -0.12, 0.25, 0.04, 0.15], [-0.05, 0.015, -0.22, 0.28, 0.045, 0.14]].forEach(([px, py, pz, w, h, d], index) => addBlock(group, index % 2 ? material : materials.leafAncient, px, py, pz, w, h, d));
  return group;
};

export const createFallenLog = ({ parent, stage, materials, x, z, length = 3.4, rotation = 0, broken = false }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z) + 0.35, z);
  group.rotation.y = rotation;
  parent.add(group);
  const pieces = broken ? [[-0.85, 1.5], [0.95, 1.15]] : [[0, length]];
  pieces.forEach(([offset, localLength], index) => {
    addBlock(group, materials.barkDark, offset, 0, 0, localLength, 0.62, 0.62, true);
    addBlock(group, materials.cutWood, offset + (index ? -localLength : localLength) * 0.5, 0, 0, 0.08, 0.58, 0.58);
  });
  return group;
};

export const createStump = ({ parent, stage, materials, x, z, scale = 1 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  addBlock(group, materials.barkDark, 0, 0.5 * scale, 0, 0.8 * scale, 1 * scale, 0.8 * scale, true);
  addBlock(group, materials.cutWood, 0, 1.03 * scale, 0, 0.76 * scale, 0.08 * scale, 0.76 * scale);
  [[-0.8, 0], [0.75, 0.2], [0.1, -0.78]].forEach(([rx, rz]) => addVoxelLine({ parent: group, material: materials.barkDark, from: [0, 0.15 * scale, 0], to: [rx * scale, 0.05, rz * scale], size: 0.2 * scale, castShadow: false }));
  return group;
};

export const installVegetationWind = ({ engine, windObjects }) => {
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 5);
    windObjects.forEach((object, index) => {
      const phase = object.userData.windPhase || index;
      object.rotation.z = Math.sin(frame * 0.32 + phase) * 0.018;
      object.rotation.x = Math.cos(frame * 0.24 + phase) * 0.009;
    });
  });
};
