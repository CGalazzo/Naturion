import { THREE } from "../engine.js";
import { createVoxelBlock } from "./voxel-world-kit.js";
import { createCrystalCluster, createNaturalFence, createTotem } from "./voxel-prop-kit.js";
import { createGrassTuft, createVine } from "./voxel-nature-kit.js";

const add = (parent, material, x, y, z, width, height = width, depth = width, castShadow = true, rotationY = 0, rotationZ = 0) => createVoxelBlock({
  parent, x, y: y - height * 0.5, z, width, height, depth, material, castShadow, rotationY, rotationZ
});

const addVoxelPath = ({ parent, material, points, size = 0.28, occluders = null }) => {
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const from = new THREE.Vector3(...points[segment]);
    const to = new THREE.Vector3(...points[segment + 1]);
    const steps = Math.max(1, Math.ceil(from.distanceTo(to) / size));
    for (let index = 0; index <= steps; index += 1) {
      const position = new THREE.Vector3().lerpVectors(from, to, index / steps);
      const block = add(parent, material, position.x, position.y, position.z, size, size, size, index % 4 === 0);
      occluders?.push(block);
    }
  }
};

const createStonePier = ({ parent, materials, x, mirror = false, occluders }) => {
  const side = mirror ? -1 : 1;
  const blocks = [
    [x, 0.55, 0, 1.3, 1.1, 1.35], [x + side * 0.08, 1.6, 0.04, 1.18, 1.02, 1.24],
    [x - side * 0.05, 2.58, -0.03, 1.08, 0.96, 1.16], [x + side * 0.04, 3.48, 0.02, 0.98, 0.88, 1.08]
  ];
  blocks.forEach(([bx, by, bz, w, h, d], index) => {
    const material = index === 0 || index === 3 ? materials.mossStoneBlock : materials.stoneBlock;
    const block = add(parent, material, bx, by, bz, w, h, d, true, side * (index % 2 ? 0.035 : -0.025));
    occluders.push(block);
  });
};

export const createRootGate = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "DefinitiveRootGate";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const occluders = [];
  createStonePier({ parent: group, materials, x: -2.35, mirror: true, occluders });
  createStonePier({ parent: group, materials, x: 2.35, mirror: false, occluders });
  [
    [-1.8, 4.15, 0, 1.22, 0.9, 1.12, -0.1], [-0.62, 4.55, 0, 1.3, 0.86, 1.12, -0.04],
    [0.62, 4.55, 0, 1.3, 0.86, 1.12, 0.04], [1.8, 4.15, 0, 1.22, 0.9, 1.12, 0.1]
  ].forEach(([bx, by, bz, w, h, d, rz], index) => {
    const block = add(group, index % 2 ? materials.stoneBlock : materials.mossStoneBlock, bx, by, bz, w, h, d, true, 0, rz);
    occluders.push(block);
  });
  const rootPaths = [
    [[-2.35, 0.25, 0.4], [-1.35, 1.05, 0.26], [-1.8, 2.25, 0.35], [-0.45, 3.35, 0.2], [0.1, 4.75, 0.25]],
    [[2.35, 0.25, 0.4], [1.35, 1.1, 0.26], [1.7, 2.45, 0.32], [0.48, 3.2, 0.2], [-0.1, 4.72, 0.25]],
    [[-1.9, 0.18, -0.18], [-0.72, 1.35, -0.08], [0.55, 2.15, 0.03], [1.55, 3.18, -0.04], [1.95, 4.05, 0]],
    [[1.95, 0.18, -0.15], [0.78, 1.4, -0.04], [-0.45, 2.15, 0.05], [-1.48, 3.12, 0], [-1.95, 4.02, 0.02]],
    [[0, 0.12, 0.5], [0.28, 1.25, 0.44], [-0.22, 2.38, 0.36], [0.16, 3.62, 0.34], [0, 4.82, 0.38]]
  ];
  rootPaths.forEach((points, index) => addVoxelPath({ parent: group, material: index % 2 ? materials.barkDark : materials.bark, points, size: 0.25 + (index % 3) * 0.035, occluders }));
  createVine({ parent: group, materials, x: -2.7, y: 4.25, z: 0.42, length: 2.35, rotationY: 0.2 });
  createVine({ parent: group, materials, x: 2.65, y: 4.2, z: 0.38, length: 2.05, rotationY: -0.4 });
  createCrystalCluster({ parent: group, stage: { getHeightAt: () => 0 }, engine, materials, x: -1.3, z: 0.75, scale: 0.45 });
  createCrystalCluster({ parent: group, stage: { getHeightAt: () => 0 }, engine, materials, x: 1.25, z: 0.75, scale: 0.42 });
  createCrystalCluster({ parent: group, stage: { getHeightAt: () => 0 }, engine, materials, x: 0, z: 0.45, scale: 0.52 });
  const runeBlocks = [[-2.35, 2.3], [2.35, 2.35], [0, 4.5]];
  runeBlocks.forEach(([rx, ry]) => add(group, materials.rune, rx, ry, -0.62, 0.38, 0.38, 0.08, false));
  const light = new THREE.PointLight(0x75e2c7, 1.2, 9, 2);
  light.position.set(0, 3.2, 1.2);
  group.add(light);
  engine.addUpdater((delta, elapsed) => { light.intensity = 0.9 + (Math.floor(elapsed * 4) % 3) * 0.12; });
  occluders.forEach((mesh) => engine.registerOccluder(mesh));
  stage.obstacles.push({ type: "rect", minX: x - 3.15, maxX: x + 3.15, minZ: z - 1.25, maxZ: z + 1.25 });
  return group;
};

export const createWoodBridge = ({ parent, stage, materials, x, z, length = 8, width = 2.7, blocked = true }) => {
  const group = new THREE.Group();
  group.name = "DefinitiveWoodBridge";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const plankCount = 12;
  for (let index = 0; index < plankCount; index += 1) {
    const offset = (index / (plankCount - 1) - 0.5) * length;
    const height = 0.2 + (index % 4 === 0 ? 0.05 : 0);
    const plank = add(group, index % 3 === 0 ? materials.bark : materials.wood, offset, 0.48 + (index % 5 === 0 ? 0.04 : 0), 0, length / plankCount * (index % 4 === 1 ? 0.84 : 0.94), height, width * (index % 3 === 0 ? 0.9 : 0.96), true, 0, index % 2 ? 0.012 : -0.012);
    plank.rotation.x = index % 5 === 0 ? 0.018 : 0;
  }
  [-1, 1].forEach((side) => {
    add(group, materials.barkDark, 0, 0.12, side * width * 0.43, length + 0.9, 0.24, 0.22, true);
    for (let index = -4; index <= 4; index += 2) add(group, materials.barkDark, index * length / 9, -0.18, side * width * 0.49, 0.3, 1.4 + (Math.abs(index) % 3) * 0.1, 0.3, true);
    for (let segment = -4; segment < 4; segment += 1) {
      add(group, materials.rope, (segment + 0.5) * length / 9, 1.1 + (Math.abs(segment) % 2) * 0.08, side * width * 0.51, length / 9, 0.1, 0.1, false);
    }
  });
  add(group, materials.rootDirtBlock, -length * 0.54, 0.15, 0, 1.4, 0.3, width + 1.4, false);
  add(group, materials.rootDirtBlock, length * 0.54, 0.15, 0, 1.4, 0.3, width + 1.4, false);
  if (blocked) {
    const barA = add(group, materials.barkDark, 0, 1.15, 0, 0.34, 2.2, width + 0.75, true);
    barA.rotation.x = 0.2;
    const barB = add(group, materials.barkDark, 0, 1.15, 0, 0.34, 2.2, width + 0.75, true);
    barB.rotation.x = -0.2;
    stage.obstacles.push({ type: "rect", minX: x - 0.8, maxX: x + 0.8, minZ: z - width * 0.7, maxZ: z + width * 0.7 });
  }
  return group;
};

export const createPuzzleAltar = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "DefinitivePuzzleAltar";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  add(group, materials.mossStoneBlock, 0, 0.18, 0, 2.6, 0.36, 2.6, false);
  add(group, materials.stoneBlock, 0, 0.52, 0, 2.05, 0.32, 2.05, true);
  add(group, materials.rune, 0, 0.82, 0, 1.5, 0.28, 1.5, true);
  [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]].forEach(([px, pz], index) => {
    add(group, index % 2 ? materials.stoneBlock : materials.mossStoneBlock, px, 0.78, pz, 0.42, 0.75, 0.42, true);
    add(group, materials.rune, px, 1.18, pz, 0.26, 0.12, 0.26, false);
  });
  const crystalRoot = new THREE.Group();
  crystalRoot.position.y = 1.68;
  group.add(crystalRoot);
  [[0, 0, 0, 0.52, 0.9], [-0.38, -0.18, 0.05, 0.24, 0.55], [0.38, -0.18, -0.05, 0.24, 0.55], [0, 0.55, 0, 0.28, 0.42]].forEach(([px, py, pz, w, h], index) => add(crystalRoot, materials.clone(materials.crystal), px, py, pz, w, h, w, index === 0));
  const particles = [];
  for (let index = 0; index < 10; index += 1) {
    const particle = add(group, materials.clone(materials.crystal, { opacity: 0.8 }), 0, 1.25 + (index % 5) * 0.17, 0, 0.09, 0.09, 0.09, false);
    particle.userData.angle = index / 10 * Math.PI * 2;
    particle.userData.radius = 0.75 + (index % 3) * 0.15;
    particles.push(particle);
  }
  const light = new THREE.PointLight(0x74e5cc, 1.1, 7, 2);
  light.position.set(0, 2, 0);
  group.add(light);
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 6);
    crystalRoot.rotation.y = frame * Math.PI / 18;
    crystalRoot.position.y = 1.68 + (frame % 4 < 2 ? 0 : 0.06);
    light.intensity = 0.85 + (frame % 3) * 0.12;
    particles.forEach((particle, index) => {
      const angle = particle.userData.angle + frame * 0.055;
      particle.position.x = Math.cos(angle) * particle.userData.radius;
      particle.position.z = Math.sin(angle) * particle.userData.radius;
      particle.visible = (frame + index) % 4 !== 0;
    });
  });
  stage.obstacles.push({ type: "circle", x, z, radius: 0.95 });
  return group;
};

export const createNaturalArena = ({ parent, stage, materials, x, z, windObjects = [] }) => {
  const group = new THREE.Group();
  group.name = "DefinitiveNpcArena";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const floor = [];
  for (let gx = -5; gx <= 5; gx += 0.75) {
    for (let gz = -4.2; gz <= 4.2; gz += 0.75) {
      if ((gx / 5) ** 2 + (gz / 4.2) ** 2 > 1) continue;
      const code = Math.abs(Math.round(gx * 4) + Math.round(gz * 7)) % 13;
      floor.push(add(group, code === 0 ? materials.pathStoneBlock : materials.pathBlock, gx, 0.1, gz, 0.72, 0.16, 0.72, false));
    }
  }
  const border = [
    [-5.25, 0], [-4.7, 2.4], [-3.1, 3.75], [-0.8, 4.2], [1.8, 4], [4.1, 3], [5.2, 0.8],
    [5.1, -1.8], [3.4, -3.6], [0.7, -4.2], [-2, -4], [-4.35, -2.8]
  ];
  border.forEach(([px, pz], index) => add(group, index % 3 === 0 ? materials.mossStoneBlock : materials.stoneBlock, px, 0.28, pz, 0.55 + (index % 2) * 0.12, 0.42 + (index % 3) * 0.08, 0.48, true, index * 0.37));
  createTotem({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: -4.55, z: 0.35, variant: "ancient", rotation: 0.2, scale: 0.92 });
  createTotem({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: 4.55, z: 0.35, variant: "ancient", rotation: -0.2, scale: 0.92 });
  createNaturalFence({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: 0, z: 4.55, length: 3.4, rotation: 0, broken: true });
  [[-5.3, 2.8], [5.1, -2.6], [-4.7, -3.25], [4.65, 3.15]].forEach(([px, pz], index) => createGrassTuft({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: px, z: pz, scale: 0.78 + index * 0.05, windObjects, tall: index % 2 === 0 }));
  return group;
};

export const createExitArch = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "DefinitiveExitArch";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const occluders = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      const block = add(group, index >= 2 ? materials.mossStoneBlock : materials.stoneBlock, side * 2.1 + side * (index % 2 ? 0.06 : -0.03), 0.55 + index * 1.02, 0, 1.08, 1.02, 1.18, true, side * (index % 2 ? 0.025 : -0.02));
      occluders.push(block);
    }
  }
  [[-1.55, 4.15, -0.05, -0.11], [-0.5, 4.55, 0.02, -0.04], [0.5, 4.55, 0.02, 0.04], [1.55, 4.15, -0.05, 0.11]].forEach(([bx, by, bz, rz], index) => {
    const block = add(group, index % 2 ? materials.stoneBlock : materials.mossStoneBlock, bx, by, bz, 1.22, 0.9, 1.14, true, 0, rz);
    occluders.push(block);
  });
  createCrystalCluster({ parent: group, stage: { getHeightAt: () => 0 }, engine, materials, x: -2.65, z: 0.65, scale: 0.5 });
  createCrystalCluster({ parent: group, stage: { getHeightAt: () => 0 }, engine, materials, x: 2.65, z: 0.65, scale: 0.5 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 4.1), new THREE.MeshBasicMaterial({ color: 0xb8ffe1, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  glow.position.set(0, 2.25, -0.4);
  group.add(glow);
  const light = new THREE.PointLight(0x8ff0d3, 0.9, 8, 2);
  light.position.set(0, 2.4, 0.5);
  group.add(light);
  createVine({ parent: group, materials, x: -2.55, y: 4.25, z: 0.3, length: 2.1 });
  createVine({ parent: group, materials, x: 2.5, y: 4.2, z: 0.28, length: 1.75 });
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 4) % 3;
    glow.material.opacity = 0.13 + frame * 0.025;
    light.intensity = 0.72 + frame * 0.1;
  });
  occluders.forEach((mesh) => engine.registerOccluder(mesh));
  stage.obstacles.push({ type: "rect", minX: x - 2.8, maxX: x + 2.8, minZ: z - 1.05, maxZ: z + 1.05 });
  return group;
};
