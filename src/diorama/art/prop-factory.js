import { THREE } from "../engine.js";
import { addTexturedBox, addTexturedCylinder, createPixelShadowTexture } from "./environment-factory.js";
import { createVine, createFlower, createGrassTuft } from "./vegetation-factory.js";

const createRoughRockGeometry = (scale = 1, variation = 0) => {
  const bottom = [
    [-0.82, 0, -0.58], [0.68, 0, -0.72], [0.9, 0, 0.38], [-0.55, 0, 0.72]
  ];
  const top = [
    [-0.5 + variation * 0.06, 0.78, -0.34], [0.42, 0.92 - variation * 0.04, -0.42],
    [0.58, 0.7 + variation * 0.05, 0.28], [-0.36, 0.86, 0.46]
  ];
  const vertices = [...bottom, ...top].flatMap(([x, y, z]) => [x * scale, y * scale, z * scale]);
  const indices = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

export const createRockCluster = ({
  parent,
  stage,
  materials,
  x,
  z,
  scale = 1,
  rotation = 0,
  moss = true,
  obstacle = true
}) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const pieces = [
    [0, 0, 0, 1, 0],
    [-0.62, -0.02, 0.34, 0.58, 1],
    [0.55, -0.03, -0.28, 0.46, 2]
  ];
  pieces.forEach(([px, py, pz, localScale, variation], index) => {
    const mesh = new THREE.Mesh(
      createRoughRockGeometry(scale * localScale, variation),
      moss && index === 0 ? materials.mossStone : index % 2 ? materials.stoneDark : materials.stone
    );
    mesh.position.set(px * scale, py * scale, pz * scale);
    mesh.rotation.y = index * 0.8;
    mesh.castShadow = index === 0;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  if (moss) {
    const mossPatch = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.1 * scale, 0.55 * scale), materials.grassLight);
    mossPatch.position.set(-0.08 * scale, 0.84 * scale, -0.05 * scale);
    mossPatch.rotation.y = 0.32;
    group.add(mossPatch);
  }
  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: 0.72 * scale });
  return group;
};

const createRootTube = ({ material, points, radius = 0.22 }) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "centripetal", 0.5);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(6, points.length * 3), radius, 6, false), material);
  tube.castShadow = true;
  tube.receiveShadow = true;
  return tube;
};

const createStoneBlock = (parent, materials, x, y, z, sx, sy, sz, rotation = 0, moss = false) => {
  const block = addTexturedBox(parent, {
    x,
    y,
    z,
    width: sx,
    height: sy,
    depth: sz,
    material: moss ? materials.mossStone : materials.stone,
    castShadow: true,
    receiveShadow: true,
    rotationY: rotation
  });
  block.rotation.z = (x + y) * 0.012;
  return block;
};

export const createRootGate = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  const y = stage.getHeightAt(x, z);
  group.position.set(x, y, z);
  group.name = "RootGate";
  parent.add(group);

  const occluders = [];
  for (const side of [-1, 1]) {
    const px = side * 2.35;
    const blocks = [
      [px, 0, 0, 1.25, 1.05, 1.35],
      [px + side * 0.08, 1, 0, 1.15, 1, 1.25],
      [px - side * 0.06, 1.95, 0, 1.1, 1, 1.18],
      [px + side * 0.04, 2.9, 0, 1.02, 1, 1.12]
    ];
    blocks.forEach(([bx, by, bz, sx, sy, sz], index) => {
      const block = createStoneBlock(group, materials, bx, by, bz, sx, sy, sz, side * (index % 2 ? 0.035 : -0.025), index >= 2 || index === 0);
      occluders.push(block);
    });
  }
  const archBlocks = [
    [-1.75, 3.7, 0, 1.3, 0.95, 1.12, -0.12],
    [-0.6, 4.15, 0, 1.35, 0.9, 1.12, -0.04],
    [0.6, 4.15, 0, 1.35, 0.9, 1.12, 0.04],
    [1.75, 3.7, 0, 1.3, 0.95, 1.12, 0.12]
  ];
  archBlocks.forEach(([bx, by, bz, sx, sy, sz, rz], index) => {
    const block = createStoneBlock(group, materials, bx, by, bz, sx, sy, sz, 0, index % 2 === 0);
    block.rotation.z = rz;
    occluders.push(block);
  });

  const rootPaths = [
    [[-2.2, 0.15, 0.3], [-1.2, 1.05, 0.15], [-1.65, 2.15, 0.25], [-0.4, 3.25, 0.1], [0.1, 4.5, 0.16]],
    [[2.15, 0.1, 0.28], [1.2, 1.1, 0.15], [1.55, 2.35, 0.24], [0.45, 3.1, 0.12], [-0.1, 4.45, 0.18]],
    [[-1.8, 0.1, -0.15], [-0.65, 1.25, -0.08], [0.55, 2.1, 0.02], [1.5, 3.1, -0.05], [1.9, 4.0, 0]],
    [[1.85, 0.08, -0.1], [0.75, 1.3, -0.02], [-0.4, 2.05, 0.06], [-1.45, 3.05, 0], [-1.9, 3.95, 0.02]],
    [[0, 0.05, 0.42], [0.25, 1.15, 0.38], [-0.2, 2.3, 0.32], [0.15, 3.55, 0.3], [0, 4.55, 0.34]]
  ];
  rootPaths.forEach((points, index) => {
    const root = createRootTube({ material: index % 2 ? materials.barkDark : materials.bark, points, radius: 0.18 + (index % 3) * 0.035 });
    group.add(root);
    occluders.push(root);
  });

  createVine({ parent: group, materials, x: -2.7, y: 4.2, z: 0.35, length: 2.4, rotationY: 0.2 });
  createVine({ parent: group, materials, x: 2.6, y: 4.1, z: 0.3, length: 2.1, rotationY: -0.4 });

  const crystalPositions = [[-1.25, 2.65, 0.68], [1.18, 2.72, 0.68], [0, 4.62, 0.5]];
  crystalPositions.forEach(([cx, cy, cz], index) => {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(index === 2 ? 0.38 : 0.27, 0), materials.clone(materials.crystal));
    crystal.scale.y = 1.55;
    crystal.position.set(cx, cy, cz);
    crystal.rotation.z = index % 2 ? 0.24 : -0.24;
    group.add(crystal);
    engine.addUpdater((delta, elapsed) => {
      crystal.material.emissiveIntensity = 0.42 + Math.sin(elapsed * 1.8 + index) * 0.18;
    });
  });

  occluders.forEach((mesh) => engine.registerOccluder(mesh));
  stage.obstacles.push({ type: "rect", minX: x - 3.15, maxX: x + 3.15, minZ: z - 1.25, maxZ: z + 1.25 });
  return group;
};

export const createWoodBridge = ({ parent, stage, materials, x, z, length = 8, width = 2.7, blocked = true }) => {
  const group = new THREE.Group();
  group.name = "ShortcutWoodBridge";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const plankCount = 9;
  for (let index = 0; index < plankCount; index += 1) {
    const offset = (index / (plankCount - 1) - 0.5) * length;
    const plank = addTexturedBox(group, {
      x: offset,
      y: 0.45 + Math.sin(index * 1.2) * 0.04,
      width: length / plankCount * 0.92,
      height: 0.22,
      depth: width * (0.94 + (index % 3) * 0.02),
      material: index % 3 === 0 ? materials.bark : materials.wood,
      castShadow: true,
      receiveShadow: true,
      rotationY: (index % 2 ? 1 : -1) * 0.012
    });
    plank.rotation.z = Math.sin(index * 0.7) * 0.018;
  }
  [-1, 1].forEach((side) => {
    addTexturedBox(group, { x: 0, y: 0.12, z: side * width * 0.42, width: length + 0.8, height: 0.26, depth: 0.2, material: materials.barkDark, castShadow: true });
    for (let index = -3; index <= 3; index += 2) {
      addTexturedCylinder(group, {
        x: index * length / 7,
        y: -0.35,
        z: side * width * 0.48,
        radiusTop: 0.16,
        radiusBottom: 0.2,
        height: 1.4,
        sides: 6,
        material: materials.barkDark,
        castShadow: true
      });
    }
  });
  if (blocked) {
    const barricade = new THREE.Group();
    barricade.position.x = 0;
    group.add(barricade);
    const barA = addTexturedBox(barricade, { y: 0.7, width: 0.35, height: 2.1, depth: width + 0.7, material: materials.barkDark, castShadow: true });
    barA.rotation.x = 0.18;
    const barB = addTexturedBox(barricade, { y: 0.7, width: 0.35, height: 2.1, depth: width + 0.7, material: materials.barkDark, castShadow: true });
    barB.rotation.x = -0.18;
    stage.obstacles.push({ type: "rect", minX: x - 0.8, maxX: x + 0.8, minZ: z - width * 0.7, maxZ: z + width * 0.7 });
  }
  return group;
};

export const createPuzzleAltar = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "PuzzleAltar";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  addTexturedCylinder(group, { y: 0, radiusTop: 1.05, radiusBottom: 1.18, height: 0.32, sides: 8, material: materials.mossStone, receiveShadow: true });
  addTexturedCylinder(group, { y: 0.3, radiusTop: 0.72, radiusBottom: 0.82, height: 0.5, sides: 8, material: materials.rune, castShadow: true });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), materials.clone(materials.crystal));
  crystal.scale.y = 1.7;
  crystal.position.y = 1.55;
  crystal.castShadow = true;
  group.add(crystal);

  const particles = [];
  for (let index = 0; index < 8; index += 1) {
    const particle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), materials.clone(materials.crystal, { opacity: 0.78 }));
    particle.userData.angle = index / 8 * Math.PI * 2;
    particle.userData.radius = 0.75 + (index % 3) * 0.13;
    particle.position.y = 1.1 + (index % 4) * 0.22;
    group.add(particle);
    particles.push(particle);
  }
  engine.addUpdater((delta, elapsed) => {
    crystal.rotation.y = elapsed * 0.42;
    crystal.position.y = 1.55 + Math.sin(elapsed * 1.45) * 0.09;
    crystal.material.emissiveIntensity = 0.55 + Math.sin(elapsed * 1.8) * 0.18;
    particles.forEach((particle, index) => {
      const angle = particle.userData.angle + elapsed * (0.35 + index * 0.015);
      particle.position.x = Math.cos(angle) * particle.userData.radius;
      particle.position.z = Math.sin(angle) * particle.userData.radius;
      particle.position.y = 1.1 + (index % 4) * 0.22 + Math.sin(elapsed * 1.8 + index) * 0.16;
    });
  });
  stage.obstacles.push({ type: "circle", x, z, radius: 0.95 });
  return group;
};

export const createNaturalArena = ({ parent, stage, materials, x, z, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.name = "NpcArena";
  parent.add(group);
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(5.45, 5.65, 0.16, 18), materials.dirt);
  ground.position.y = 0.08;
  ground.scale.z = 0.82;
  ground.receiveShadow = true;
  group.add(ground);

  const scuffs = [[-1.5, -0.8], [1.8, 0.6], [0.4, -1.7], [-2.3, 1.2], [2.4, -1.1]];
  scuffs.forEach(([sx, sz], index) => {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.8 + index % 2 * 0.35, 0.035, 0.17), materials.path);
    mark.position.set(sx, 0.18, sz);
    mark.rotation.y = index * 0.75;
    group.add(mark);
  });

  for (let index = 0; index < 14; index += 1) {
    const angle = index / 14 * Math.PI * 2;
    if (index === 3 || index === 10) continue;
    const radius = 5.2;
    const stone = new THREE.Mesh(createRoughRockGeometry(0.33 + (index % 3) * 0.05, index), index % 4 === 0 ? materials.mossStone : materials.stone);
    stone.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius * 0.82);
    stone.rotation.y = angle;
    group.add(stone);
  }

  [-1, 1].forEach((side) => {
    const totem = new THREE.Group();
    totem.position.set(side * 4.6, 0, 0.2);
    group.add(totem);
    addTexturedCylinder(totem, { y: 0, radiusTop: 0.2, radiusBottom: 0.28, height: 2.2, sides: 6, material: materials.barkDark, castShadow: true });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.15), materials.clone(materials.rune, { side: THREE.DoubleSide }));
    banner.position.set(side * -0.45, 1.65, 0);
    banner.rotation.y = side * Math.PI / 2;
    totem.add(banner);
  });

  [[-5.4, 2.7], [5.2, -2.4], [-4.8, -3.1], [4.7, 3]].forEach(([fx, fz], index) => {
    createGrassTuft({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx, z: fz, scale: 0.75 + index * 0.05, windObjects });
    createFlower({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx + 0.35, z: fz + 0.2, scale: 0.75, color: index % 2 ? 0xffc86d : 0x8fe9c3 });
  });
  return group;
};

export const createExitArch = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "FutureExitArch";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const occluders = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      const block = createStoneBlock(group, materials, side * 2.1, index * 1.05, 0, 1.12, 1.08, 1.2, side * (index % 2 ? 0.025 : -0.025), index >= 2);
      occluders.push(block);
    }
  }
  const crown = [
    [-1.55, 4, 0, 1.25, 0.95, 1.15, -0.12],
    [-0.48, 4.43, 0, 1.25, 0.9, 1.15, -0.04],
    [0.48, 4.43, 0, 1.25, 0.9, 1.15, 0.04],
    [1.55, 4, 0, 1.25, 0.95, 1.15, 0.12]
  ];
  crown.forEach(([bx, by, bz, sx, sy, sz, rz], index) => {
    const block = createStoneBlock(group, materials, bx, by, bz, sx, sy, sz, 0, index % 2 === 0);
    block.rotation.z = rz;
    occluders.push(block);
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xb8ffe1, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.1), glowMaterial);
  glow.position.set(0, 2.2, -0.35);
  group.add(glow);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 8), new THREE.MeshBasicMaterial({ color: 0xd7ffd5, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(0, 4.2, -1.2);
  beam.rotation.x = -0.14;
  group.add(beam);
  createVine({ parent: group, materials, x: -2.55, y: 4.3, z: 0.25, length: 2.2 });
  createVine({ parent: group, materials, x: 2.5, y: 4.25, z: 0.2, length: 1.8 });
  engine.addUpdater((delta, elapsed) => {
    glow.material.opacity = 0.16 + Math.sin(elapsed * 1.1) * 0.045;
    beam.material.opacity = 0.06 + Math.sin(elapsed * 0.75) * 0.018;
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
