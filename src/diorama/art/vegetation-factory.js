import { THREE } from "../engine.js";
import { addTexturedBox } from "./environment-factory.js";

const addCube = (parent, material, x, y, z, size = 1, castShadow = false) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

const addVoxelLine = ({ parent, material, from, to, thickness = 0.22, castShadow = true }) => {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const steps = Math.max(1, Math.ceil(length / Math.max(thickness * 1.4, 0.28)));
  const meshes = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const position = new THREE.Vector3().lerpVectors(from, to, t);
    meshes.push(addCube(parent, material, position.x, position.y, position.z, thickness, castShadow && index % 3 === 0));
  }
  return meshes;
};

const canopyLayouts = {
  young: [
    [0, 0, 0], [-0.65, 0, 0], [0.65, 0, 0], [0, 0, -0.65], [0, 0, 0.65],
    [0, 0.65, 0], [-0.55, 0.55, 0.3], [0.55, 0.55, -0.3]
  ],
  common: [
    [0, 0, 0], [-0.8, 0, 0], [0.8, 0, 0], [0, 0, -0.8], [0, 0, 0.8],
    [-0.7, 0, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7],
    [0, 0.75, 0], [-0.65, 0.72, 0], [0.65, 0.72, 0], [0, 0.72, -0.65], [0, 0.72, 0.65],
    [0, 1.4, 0]
  ],
  ancient: [
    [0, 0, 0], [-0.9, 0, 0], [0.9, 0, 0], [0, 0, -0.9], [0, 0, 0.9],
    [-0.9, 0, -0.9], [0.9, 0, 0.9], [-0.9, 0, 0.9], [0.9, 0, -0.9],
    [-1.7, -0.1, 0], [1.7, -0.1, 0], [0, -0.1, -1.7], [0, -0.1, 1.7],
    [-1.45, 0.65, -0.7], [1.45, 0.65, 0.7], [-0.7, 0.65, 1.45], [0.7, 0.65, -1.45],
    [0, 0.8, 0], [-0.8, 0.8, 0], [0.8, 0.8, 0], [0, 0.8, -0.8], [0, 0.8, 0.8],
    [0, 1.6, 0], [-0.7, 1.5, 0.3], [0.7, 1.5, -0.3]
  ],
  magic: [
    [0, 0, 0], [-0.85, 0, 0], [0.85, 0, 0], [0, 0, -0.85], [0, 0, 0.85],
    [-0.75, 0, -0.75], [0.75, 0, 0.75], [-0.75, 0, 0.75], [0.75, 0, -0.75],
    [0, 0.8, 0], [-0.7, 0.8, 0], [0.7, 0.8, 0], [0, 0.8, -0.7], [0, 0.8, 0.7],
    [0, 1.55, 0], [0, 2.2, 0]
  ]
};

export const createPixelTree = ({
  parent,
  stage,
  engine,
  materials,
  x,
  z,
  scale = 1,
  variant = "common",
  rotation = 0,
  obstacle = true
}) => {
  const group = new THREE.Group();
  group.name = `VoxelTree-${variant}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);

  const ancient = variant === "ancient";
  const young = variant === "young";
  const magic = variant === "magic";
  const trunkHeight = (ancient ? 4.35 : young ? 2.5 : 3.35) * scale;
  const trunkRadius = (ancient ? 0.62 : young ? 0.34 : 0.45) * scale;
  const trunkWidth = trunkRadius * 1.55;
  const trunkStep = Math.max(0.48, 0.62 * scale);
  const trunkCount = Math.ceil(trunkHeight / trunkStep);
  for (let index = 0; index < trunkCount; index += 1) {
    const blockHeight = trunkHeight / trunkCount;
    addTexturedBox(group, {
      y: index * blockHeight,
      width: trunkWidth * (index > trunkCount * 0.65 ? 0.86 : 1),
      height: blockHeight,
      depth: trunkWidth,
      material: ancient ? materials.barkDark : materials.bark,
      castShadow: index > trunkCount - 3,
      receiveShadow: true
    });
  }

  const branchMaterial = ancient ? materials.barkDark : materials.bark;
  const branchCount = ancient ? 5 : young ? 2 : 4;
  for (let index = 0; index < branchCount; index += 1) {
    const angle = index / branchCount * Math.PI * 2 + 0.35;
    const branchY = trunkHeight * (0.56 + (index % 3) * 0.08);
    const length = (ancient ? 2.15 : young ? 0.95 : 1.5) * scale;
    addVoxelLine({
      parent: group,
      material: branchMaterial,
      from: new THREE.Vector3(0, branchY, 0),
      to: new THREE.Vector3(Math.cos(angle) * length, branchY + 0.45 * scale, Math.sin(angle) * length),
      thickness: Math.max(0.18, trunkWidth * 0.38),
      castShadow: true
    });
  }

  if (!young) {
    const rootCount = ancient ? 7 : 4;
    for (let index = 0; index < rootCount; index += 1) {
      const angle = index / rootCount * Math.PI * 2;
      const length = (ancient ? 2.2 : 1.35) * scale;
      addVoxelLine({
        parent: group,
        material: branchMaterial,
        from: new THREE.Vector3(0, 0.18 * scale, 0),
        to: new THREE.Vector3(Math.cos(angle) * length, 0.1 * scale, Math.sin(angle) * length),
        thickness: Math.max(0.16, trunkWidth * 0.32),
        castShadow: false
      });
    }
  }

  const leafBase = magic ? materials.leafLight : ancient ? materials.leafAncient : young ? materials.leafLight : materials.leaf;
  const leafAccent = magic ? materials.crystal : ancient ? materials.leaf : materials.leafLight;
  const canopyY = trunkHeight + (ancient ? 1.1 : young ? 0.65 : 0.95) * scale;
  const blockSize = (ancient ? 1.35 : young ? 0.9 : 1.1) * scale;
  const layout = canopyLayouts[variant] || canopyLayouts.common;
  const canopyMeshes = [];
  layout.forEach(([cx, cy, cz], index) => {
    const material = index % 4 === 0 ? leafAccent : leafBase;
    const size = blockSize * (index % 5 === 0 ? 1.08 : 1);
    const block = addCube(group, material, cx * scale, canopyY + cy * scale, cz * scale, size, index % 3 === 0);
    block.material = materials.clone(block.material, { transparent: false, opacity: 1 });
    canopyMeshes.push(block);
    engine.registerOccluder(block);
  });

  if (magic) {
    const glowBlocks = [[-0.6, 0.2, 0.7], [0.7, 0.85, -0.55], [0.1, 1.65, 0.35]];
    glowBlocks.forEach(([gx, gy, gz], index) => {
      const glow = addCube(group, materials.clone(materials.crystal), gx * scale, canopyY + gy * scale, gz * scale, 0.2 * scale, false);
      engine.addUpdater((delta, elapsed) => {
        const frame = Math.floor(elapsed * 6 + index) % 4;
        glow.material.emissiveIntensity = 0.45 + frame * 0.08;
      });
    });
  }

  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: trunkRadius * 1.28 });
  return group;
};

export const createPixelShrub = ({ parent, stage, materials, x, z, scale = 1, tint = "normal" }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const baseMaterial = tint === "light" ? materials.leafLight : tint === "ancient" ? materials.leafAncient : materials.leaf;
  const positions = [[0, 0.45, 0, 0.75], [-0.52, 0.34, 0.16, 0.55], [0.5, 0.36, -0.18, 0.58], [0.08, 0.3, 0.52, 0.5]];
  positions.forEach(([px, py, pz, size], index) => addCube(group, index % 2 ? materials.leafLight : baseMaterial, px * scale, py * scale, pz * scale, size * scale, index === 0));
  return group;
};

export const createGrassTuft = ({ parent, stage, materials, x, z, scale = 1, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const blades = [[-0.2, 0.34, 0, 0.12], [0, 0.46, 0.04, 0.14], [0.2, 0.38, -0.04, 0.12], [-0.05, 0.3, 0.19, 0.1]];
  blades.forEach(([bx, height, bz, width], index) => addTexturedBox(group, {
    x: bx * scale,
    y: 0,
    z: bz * scale,
    width: width * scale,
    height: height * scale,
    depth: width * scale,
    material: index % 2 ? materials.grassLight : materials.grass,
    receiveShadow: true
  }));
  group.userData.windPhase = x * 0.31 + z * 0.17;
  windObjects.push(group);
  return group;
};

export const createFern = ({ parent, stage, materials, x, z, scale = 1, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    for (let segment = 0; segment < 4; segment += 1) {
      addCube(group, segment % 2 ? materials.leafLight : materials.leaf, Math.cos(angle) * (0.15 + segment * 0.14) * scale, (0.12 + segment * 0.13) * scale, Math.sin(angle) * (0.15 + segment * 0.14) * scale, (0.16 - segment * 0.015) * scale, false);
    }
  }
  group.userData.windPhase = 2 + x * 0.19;
  windObjects.push(group);
  return group;
};

export const createFlower = ({ parent, stage, materials, x, z, scale = 1, color = 0xffda72 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const stemMaterial = materials.tint(materials.grass, 0x7fc45f, `stem-${color}`);
  const petalMaterial = materials.tint(materials.crystal, color, `flower-${color}`);
  addTexturedBox(group, { y: 0, width: 0.08 * scale, height: 0.42 * scale, depth: 0.08 * scale, material: stemMaterial });
  [[-0.12, 0], [0.12, 0], [0, -0.12], [0, 0.12]].forEach(([px, pz]) => addCube(group, petalMaterial, px * scale, 0.48 * scale, pz * scale, 0.14 * scale, false));
  addCube(group, materials.tint(materials.crystal, 0xfff3a0, "flower-center"), 0, 0.49 * scale, 0, 0.12 * scale, false);
  return group;
};

export const createMushroom = ({ parent, stage, materials, x, z, scale = 1, color = 0xe98d68 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  addTexturedBox(group, { y: 0, width: 0.14 * scale, height: 0.34 * scale, depth: 0.14 * scale, material: materials.dirt });
  const capMaterial = materials.tint(materials.crystal, color, `mushroom-${color}`);
  addCube(group, capMaterial, 0, 0.4 * scale, 0, 0.44 * scale, false);
  addCube(group, capMaterial, -0.24 * scale, 0.36 * scale, 0, 0.24 * scale, false);
  addCube(group, capMaterial, 0.24 * scale, 0.36 * scale, 0, 0.24 * scale, false);
  return group;
};

export const createVine = ({ parent, materials, x = 0, y = 0, z = 0, length = 2.2, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  parent.add(group);
  const segments = Math.max(4, Math.round(length / 0.3));
  for (let index = 0; index < segments; index += 1) {
    addCube(group, materials.leafAncient, Math.sin(index * 0.9) * 0.12, -index * length / segments, 0, 0.11, false);
    if (index % 2 === 0) addCube(group, materials.leafLight, 0.18, -index * length / segments, 0, 0.18, false);
  }
  return group;
};

export const installVegetationWind = ({ engine, windObjects }) => {
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 8);
    windObjects.forEach((group, index) => {
      const phase = group.userData.windPhase || index;
      group.rotation.z = Math.round(Math.sin(frame * 0.13 + phase) * 3) / 180;
      group.rotation.x = Math.round(Math.cos(frame * 0.1 + phase) * 2) / 220;
    });
  });
};
