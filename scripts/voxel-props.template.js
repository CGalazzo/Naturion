import { THREE } from "../engine.js";
import { addTexturedBox, createPixelShadowTexture } from "./environment-factory.js";
import { createFlower, createGrassTuft, createVine } from "./vegetation-factory.js";

const addBlock = (parent, { x = 0, y = 0, z = 0, width = 1, height = width, depth = width, material, castShadow = true, rotationY = 0 }) => addTexturedBox(parent, {
  x, y, z, width, height, depth, material, castShadow, receiveShadow: true, rotationY
});

const addVoxelLine = ({ parent, material, points, size = 0.28, occluders = null }) => {
  const meshes = [];
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const from = new THREE.Vector3(...points[segment]);
    const to = new THREE.Vector3(...points[segment + 1]);
    const distance = from.distanceTo(to);
    const steps = Math.max(1, Math.ceil(distance / (size * 1.05)));
    for (let index = 0; index <= steps; index += 1) {
      const position = new THREE.Vector3().lerpVectors(from, to, index / steps);
      const mesh = addBlock(parent, {
        x: position.x,
        y: position.y - size * 0.5,
        z: position.z,
        width: size,
        height: size,
        depth: size,
        material,
        castShadow: index % 3 === 0
      });
      meshes.push(mesh);
      occluders?.push(mesh);
    }
  }
  return meshes;
};

const createStoneBlock = (parent, materials, x, y, z, sx, sy, sz, rotation = 0, moss = false) => {
  const block = addBlock(parent, {
    x, y, z, width: sx, height: sy, depth: sz,
    material: materials.clone(moss ? materials.mossStone : materials.stone),
    castShadow: true,
    rotationY: rotation
  });
  return block;
};

export const createRockCluster = ({ parent, stage, materials, x, z, scale = 1, rotation = 0, moss = true, obstacle = true }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const pieces = [
    [0, 0, 0, 1.15, 0.85, 0.95],
    [-0.66, 0, 0.34, 0.62, 0.52, 0.58],
    [0.58, 0, -0.3, 0.5, 0.44, 0.48],
    [0.1, 0.72, -0.08, 0.62, 0.35, 0.55]
  ];
  pieces.forEach(([px, py, pz, sx, sy, sz], index) => addBlock(group, {
    x: px * scale,
    y: py * scale,
    z: pz * scale,
    width: sx * scale,
    height: sy * scale,
    depth: sz * scale,
    material: moss && (index === 0 || index === 3) ? materials.mossStone : index % 2 ? materials.stoneDark : materials.stone,
    castShadow: index === 0
  }));
  if (moss) addBlock(group, { x: -0.06 * scale, y: 0.84 * scale, z: -0.04 * scale, width: 0.78 * scale, height: 0.1 * scale, depth: 0.54 * scale, material: materials.grassLight, castShadow: false });
  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: 0.72 * scale });
  return group;
};

export const createRootGate = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.name = "VoxelRootGate";
  parent.add(group);
  const occluders = [];
  for (const side of [-1, 1]) {
    const px = side * 2.35;
    const blocks = [
      [px, 0, 0, 1.25, 1.05, 1.35],
      [px, 1.05, 0, 1.15, 1, 1.25],
      [px, 2.05, 0, 1.1, 1, 1.18],
      [px, 3.05, 0, 1.02, 1, 1.12]
    ];
    blocks.forEach(([bx, by, bz, sx, sy, sz], index) => {
      const block = createStoneBlock(group, materials, bx, by, bz, sx, sy, sz, 0, index === 0 || index >= 2);
      occluders.push(block);
    });
  }
  [
    [-1.75, 4, 0, 1.2, 0.9, 1.12],
    [-0.58, 4.4, 0, 1.2, 0.9, 1.12],
    [0.58, 4.4, 0, 1.2, 0.9, 1.12],
    [1.75, 4, 0, 1.2, 0.9, 1.12]
  ].forEach(([bx, by, bz, sx, sy, sz], index) => {
    const block = createStoneBlock(group, materials, bx, by, bz, sx, sy, sz, 0, index % 2 === 0);
    occluders.push(block);
  });

  const rootPaths = [
    [[-2.2, 0.2, 0.35], [-1.2, 1.05, 0.2], [-1.65, 2.2, 0.25], [-0.4, 3.3, 0.15], [0.1, 4.65, 0.18]],
    [[2.2, 0.2, 0.35], [1.2, 1.1, 0.2], [1.55, 2.4, 0.25], [0.45, 3.2, 0.15], [-0.1, 4.6, 0.18]],
    [[-1.8, 0.15, -0.15], [-0.65, 1.3, -0.08], [0.55, 2.1, 0], [1.5, 3.15, -0.05], [1.9, 4.05, 0]],
    [[1.85, 0.15, -0.1], [0.75, 1.35, -0.02], [-0.4, 2.1, 0.06], [-1.45, 3.1, 0], [-1.9, 4, 0.02]],
    [[0, 0.1, 0.44], [0.25, 1.2, 0.4], [-0.2, 2.35, 0.34], [0.15, 3.6, 0.32], [0, 4.65, 0.35]]
  ];
  rootPaths.forEach((points, index) => addVoxelLine({
    parent: group,
    material: materials.clone(index % 2 ? materials.barkDark : materials.bark),
    points,
    size: 0.25 + (index % 3) * 0.035,
    occluders
  }));
  createVine({ parent: group, materials, x: -2.7, y: 4.2, z: 0.4, length: 2.4, rotationY: 0.2 });
  createVine({ parent: group, materials, x: 2.65, y: 4.15, z: 0.35, length: 2.1, rotationY: -0.4 });

  const crystalBlocks = [
    [-1.25, 2.8, 0.72, 0.28], [1.2, 2.85, 0.72, 0.28], [0, 4.9, 0.55, 0.38]
  ];
  crystalBlocks.forEach(([cx, cy, cz, size], index) => {
    const crystal = addBlock(group, { x: cx, y: cy - size * 0.5, z: cz, width: size, height: size * 1.55, depth: size, material: materials.clone(materials.crystal), castShadow: false });
    engine.addUpdater((delta, elapsed) => {
      const frame = Math.floor(elapsed * 6 + index) % 4;
      crystal.material.emissiveIntensity = 0.42 + frame * 0.08;
    });
  });
  occluders.forEach((mesh) => engine.registerOccluder(mesh));
  stage.obstacles.push({ type: "rect", minX: x - 3.15, maxX: x + 3.15, minZ: z - 1.25, maxZ: z + 1.25 });
  return group;
};

export const createWoodBridge = ({ parent, stage, materials, x, z, length = 8, width = 2.7, blocked = true }) => {
  const group = new THREE.Group();
  group.name = "VoxelWoodBridge";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const plankCount = 11;
  for (let index = 0; index < plankCount; index += 1) {
    const offset = (index / (plankCount - 1) - 0.5) * length;
    addBlock(group, {
      x: offset,
      y: 0.42 + (index % 3 === 0 ? 0.03 : 0),
      width: length / plankCount * 0.92,
      height: 0.24,
      depth: width * 0.94,
      material: index % 3 === 0 ? materials.bark : materials.wood,
      castShadow: true
    });
  }
  [-1, 1].forEach((side) => {
    addBlock(group, { x: 0, y: 0.12, z: side * width * 0.44, width: length + 0.8, height: 0.24, depth: 0.2, material: materials.barkDark });
    for (let index = -3; index <= 3; index += 2) addBlock(group, {
      x: index * length / 7,
      y: -0.35,
      z: side * width * 0.48,
      width: 0.28,
      height: 1.4,
      depth: 0.28,
      material: materials.barkDark
    });
  });
  if (blocked) {
    const barA = addBlock(group, { y: 0.65, width: 0.34, height: 2.1, depth: width + 0.7, material: materials.barkDark });
    barA.rotation.x = 0.2;
    const barB = addBlock(group, { y: 0.65, width: 0.34, height: 2.1, depth: width + 0.7, material: materials.barkDark });
    barB.rotation.x = -0.2;
    stage.obstacles.push({ type: "rect", minX: x - 0.8, maxX: x + 0.8, minZ: z - width * 0.7, maxZ: z + width * 0.7 });
  }
  return group;
};

export const createPuzzleAltar = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "VoxelPuzzleAltar";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  addBlock(group, { y: 0, width: 2.3, height: 0.3, depth: 2.3, material: materials.mossStone, castShadow: false });
  addBlock(group, { y: 0.3, width: 1.65, height: 0.42, depth: 1.65, material: materials.rune });
  addBlock(group, { y: 0.72, width: 1.05, height: 0.35, depth: 1.05, material: materials.stone });
  const crystalRoot = new THREE.Group();
  crystalRoot.position.y = 1.55;
  group.add(crystalRoot);
  const crystalPieces = [
    [0, 0, 0, 0.48, 0.72],
    [-0.32, -0.12, 0, 0.24, 0.42],
    [0.32, -0.12, 0, 0.24, 0.42],
    [0, 0.42, 0, 0.25, 0.35]
  ];
  crystalPieces.forEach(([px, py, pz, width, height], index) => addBlock(crystalRoot, { x: px, y: py - height * 0.5, z: pz, width, height, depth: width, material: materials.clone(materials.crystal), castShadow: index === 0 }));
  const particles = [];
  for (let index = 0; index < 8; index += 1) {
    const particle = addBlock(group, { y: 1.1 + (index % 4) * 0.22, width: 0.09, height: 0.09, depth: 0.09, material: materials.clone(materials.crystal, { opacity: 0.78 }), castShadow: false });
    particle.userData.angle = index / 8 * Math.PI * 2;
    particle.userData.radius = 0.75 + (index % 3) * 0.13;
    particles.push(particle);
  }
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 6);
    crystalRoot.rotation.y = frame * Math.PI / 16;
    crystalRoot.position.y = 1.55 + (frame % 4 < 2 ? 0 : 0.06);
    particles.forEach((particle, index) => {
      const angle = particle.userData.angle + frame * 0.06;
      particle.position.x = Math.cos(angle) * particle.userData.radius;
      particle.position.z = Math.sin(angle) * particle.userData.radius;
      particle.position.y = 1.1 + (index % 4) * 0.22 + ((frame + index) % 3) * 0.05;
    });
  });
  stage.obstacles.push({ type: "circle", x, z, radius: 0.95 });
  return group;
};

export const createNaturalArena = ({ parent, stage, materials, x, z, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.name = "VoxelNpcArena";
  parent.add(group);
  const step = 0.8;
  for (let gx = -5.2; gx <= 5.2; gx += step) {
    for (let gz = -4.2; gz <= 4.2; gz += step) {
      if ((gx * gx) / (5.4 * 5.4) + (gz * gz) / (4.3 * 4.3) > 1) continue;
      addBlock(group, { x: gx, y: 0, z: gz, width: step, height: 0.14, depth: step, material: (Math.round(gx / step + gz / step) % 7 === 0) ? materials.path : materials.dirt, castShadow: false });
    }
  }
  for (let index = 0; index < 14; index += 1) {
    const angle = index / 14 * Math.PI * 2;
    if (index === 3 || index === 10) continue;
    addBlock(group, { x: Math.cos(angle) * 5.2, y: 0.08, z: Math.sin(angle) * 4.25, width: 0.42, height: 0.36 + (index % 3) * 0.08, depth: 0.42, material: index % 4 === 0 ? materials.mossStone : materials.stone, castShadow: false });
  }
  [-1, 1].forEach((side) => {
    const totem = new THREE.Group();
    totem.position.set(side * 4.6, 0, 0.2);
    group.add(totem);
    addBlock(totem, { y: 0, width: 0.42, height: 2.2, depth: 0.42, material: materials.barkDark });
    addBlock(totem, { x: side * -0.44, y: 1.3, width: 0.72, height: 1.05, depth: 0.12, material: materials.rune, castShadow: false });
  });
  [[-5.4, 2.7], [5.2, -2.4], [-4.8, -3.1], [4.7, 3]].forEach(([fx, fz], index) => {
    createGrassTuft({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx, z: fz, scale: 0.75 + index * 0.05, windObjects });
    createFlower({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx + 0.35, z: fz + 0.2, scale: 0.75, color: index % 2 ? 0xffc86d : 0x8fe9c3 });
  });
  return group;
};

export const createExitArch = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "VoxelFutureExit";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const occluders = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      const block = createStoneBlock(group, materials, side * 2.1, index * 1.05, 0, 1.12, 1.08, 1.2, 0, index >= 2);
      occluders.push(block);
    }
  }
  [
    [-1.55, 4.05, 0, 1.25, 0.95, 1.15],
    [-0.48, 4.5, 0, 1.25, 0.9, 1.15],
    [0.48, 4.5, 0, 1.25, 0.9, 1.15],
    [1.55, 4.05, 0, 1.25, 0.95, 1.15]
  ].forEach(([bx, by, bz, sx, sy, sz], index) => {
    const block = createStoneBlock(group, materials, bx, by, bz, sx, sy, sz, 0, index % 2 === 0);
    occluders.push(block);
  });
  const glow = addBlock(group, { y: 0.4, z: -0.35, width: 3.2, height: 3.8, depth: 0.12, material: materials.clone(materials.crystal, { transparent: true, opacity: 0.18, depthWrite: false }), castShadow: false });
  createVine({ parent: group, materials, x: -2.55, y: 4.3, z: 0.25, length: 2.2 });
  createVine({ parent: group, materials, x: 2.5, y: 4.25, z: 0.2, length: 1.8 });
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 5) % 4;
    glow.material.opacity = 0.12 + frame * 0.025;
  });
  occluders.forEach((mesh) => engine.registerOccluder(mesh));
  stage.obstacles.push({ type: "rect", minX: x - 2.8, maxX: x + 2.8, minZ: z - 1.05, maxZ: z + 1.05 });
  return group;
};

export const createGroundShadow = ({ parent, width = 2, depth = 1, opacity = 0.34 }) => {
  const material = new THREE.MeshBasicMaterial({ map: createPixelShadowTexture(), transparent: true, depthWrite: false, opacity });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  parent.add(shadow);
  return shadow;
};
