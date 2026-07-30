import { THREE } from "../engine.js";
import { addTexturedBox, addTexturedCylinder } from "./environment-factory.js";

const createVoxelCluster = ({ parent, material, blocks, positionScale = 1, sizeScale = 1, occluders = [], castShadow = true }) => {
  blocks.forEach(([x, y, z, sx, sy, sz, materialOverride]) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx * sizeScale, sy * sizeScale, sz * sizeScale),
      materialOverride || material
    );
    mesh.position.set(x * positionScale, y * positionScale, z * positionScale);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    occluders.push(mesh);
  });
};

const createRoot = (group, materials, angle, length, scale) => {
  const root = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.28 * scale, length * scale, 6),
    materials.barkDark
  );
  root.rotation.z = Math.PI / 2.15;
  root.rotation.y = angle;
  root.position.set(Math.cos(angle) * length * 0.22 * scale, 0.12 * scale, Math.sin(angle) * length * 0.22 * scale);
  root.castShadow = true;
  root.receiveShadow = true;
  group.add(root);
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
  group.name = `PixelTree-${variant}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);

  const ancient = variant === "ancient";
  const young = variant === "young";
  const trunkHeight = (ancient ? 4.35 : young ? 2.5 : 3.35) * scale;
  const trunkRadius = (ancient ? 0.62 : young ? 0.34 : 0.45) * scale;
  const trunk = addTexturedCylinder(group, {
    y: 0,
    radiusTop: trunkRadius * 0.78,
    radiusBottom: trunkRadius,
    height: trunkHeight,
    sides: ancient ? 8 : 7,
    material: ancient ? materials.barkDark : materials.bark,
    castShadow: true,
    receiveShadow: true
  });
  trunk.position.y = trunkHeight * 0.5;

  const branchCount = ancient ? 5 : young ? 2 : 4;
  for (let index = 0; index < branchCount; index += 1) {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.18, trunkRadius * 0.28, (ancient ? 2.2 : 1.55) * scale, 6),
      ancient ? materials.barkDark : materials.bark
    );
    branch.position.set(0, trunkHeight * (0.57 + index * 0.055), 0);
    branch.rotation.z = Math.PI * (0.32 + (index % 2) * 0.08);
    branch.rotation.y = index * 1.42 + 0.4;
    branch.castShadow = true;
    group.add(branch);
  }

  if (!young) {
    const rootCount = ancient ? 7 : 4;
    for (let index = 0; index < rootCount; index += 1) createRoot(group, materials, index / rootCount * Math.PI * 2, ancient ? 2.2 : 1.35, scale);
  }

  const occluders = [];
  const leafBase = ancient ? materials.leafAncient : young ? materials.leafLight : materials.leaf;
  const leafAccent = ancient ? materials.leaf : materials.leafLight;
  const canopyY = trunkHeight + (ancient ? 1.45 : young ? 0.8 : 1.15) * scale;
  const canopyScale = ancient ? 1.25 : young ? 0.72 : 1;
  const blocks = ancient
    ? [
        [0, canopyY / scale, 0, 3.7, 2.2, 3.4, leafBase],
        [-2.1, canopyY / scale - 0.1, 0.2, 2.6, 1.8, 2.5, leafAccent],
        [2.15, canopyY / scale - 0.05, -0.25, 2.7, 1.9, 2.45, leafBase],
        [-0.35, canopyY / scale + 1.35, -0.45, 2.9, 1.85, 2.65, leafAccent],
        [0.45, canopyY / scale + 0.8, 1.85, 2.5, 1.7, 2.3, leafBase],
        [-1.55, canopyY / scale + 0.55, -1.75, 2.2, 1.55, 2.1, leafAccent]
      ]
    : young
      ? [
          [0, canopyY / scale, 0, 2.2, 1.6, 2.1, leafAccent],
          [-0.75, canopyY / scale - 0.15, 0.2, 1.45, 1.25, 1.4, leafBase],
          [0.75, canopyY / scale + 0.05, -0.2, 1.5, 1.2, 1.4, leafBase]
        ]
      : [
          [0, canopyY / scale, 0, 3, 1.9, 2.8, leafBase],
          [-1.25, canopyY / scale - 0.1, 0.45, 2, 1.55, 1.85, leafAccent],
          [1.35, canopyY / scale + 0.05, -0.35, 2.1, 1.55, 1.9, leafBase],
          [0.15, canopyY / scale + 1.1, 0.15, 2.15, 1.45, 2, leafAccent],
          [-0.4, canopyY / scale + 0.35, -1.35, 1.8, 1.35, 1.65, leafBase]
        ];
  createVoxelCluster({ parent: group, material: leafBase, blocks, positionScale: scale, sizeScale: scale * canopyScale, occluders });
  occluders.forEach((mesh) => {
    mesh.material = materials.clone(mesh.material, { transparent: false, opacity: 1 });
    engine.registerOccluder(mesh);
  });

  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: trunkRadius * 1.28 });
  return group;
};

export const createPixelShrub = ({ parent, stage, materials, x, z, scale = 1, tint = "normal" }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const baseMaterial = tint === "light" ? materials.leafLight : tint === "ancient" ? materials.leafAncient : materials.leaf;
  const positions = [[0, 0.5, 0, 1.1], [-0.55, 0.35, 0.18, 0.72], [0.5, 0.38, -0.2, 0.78], [0.1, 0.28, 0.55, 0.65]];
  positions.forEach(([px, py, pz, size], index) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size * scale, size * 0.8 * scale, size * scale), index % 2 ? materials.leafLight : baseMaterial);
    mesh.position.set(px * scale, py * scale, pz * scale);
    mesh.receiveShadow = true;
    mesh.castShadow = index === 0;
    group.add(mesh);
  });
  return group;
};

export const createGrassTuft = ({ parent, stage, materials, x, z, scale = 1, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const blades = [[-0.22, 0.38, 0, -0.17], [0, 0.48, 0.04, 0.05], [0.22, 0.4, -0.03, 0.19], [-0.05, 0.32, 0.2, -0.08]];
  blades.forEach(([bx, height, bz, angle], index) => {
    const blade = addTexturedBox(group, {
      x: bx * scale,
      y: 0,
      z: bz * scale,
      width: 0.12 * scale,
      height: height * scale,
      depth: 0.09 * scale,
      material: index % 2 ? materials.grassLight : materials.grass,
      receiveShadow: true
    });
    blade.rotation.z = angle;
  });
  group.userData.windPhase = x * 0.31 + z * 0.17;
  group.userData.baseRotation = group.rotation.z;
  windObjects.push(group);
  return group;
};

export const createFern = ({ parent, stage, materials, x, z, scale = 1, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.78 * scale, 0.18 * scale), index % 2 ? materials.leafLight : materials.leaf);
    stem.position.set(Math.cos(angle) * 0.18 * scale, 0.38 * scale, Math.sin(angle) * 0.18 * scale);
    stem.rotation.z = 0.58;
    stem.rotation.y = -angle;
    group.add(stem);
    for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.07 * scale, 0.13 * scale), materials.leafLight);
      leaf.position.set(Math.cos(angle) * (0.25 + leafIndex * 0.12) * scale, (0.24 + leafIndex * 0.18) * scale, Math.sin(angle) * (0.25 + leafIndex * 0.12) * scale);
      leaf.rotation.y = -angle;
      group.add(leaf);
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
  addTexturedBox(group, { y: 0, width: 0.08 * scale, height: 0.48 * scale, depth: 0.08 * scale, material: stemMaterial });
  for (let index = 0; index < 4; index += 1) {
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.1 * scale, 0.16 * scale), petalMaterial);
    const angle = index / 4 * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.12 * scale, 0.5 * scale, Math.sin(angle) * 0.12 * scale);
    group.add(petal);
  }
  const center = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.12 * scale), materials.tint(materials.crystal, 0xfff3a0, "flower-center"));
  center.position.y = 0.52 * scale;
  group.add(center);
  return group;
};

export const createMushroom = ({ parent, stage, materials, x, z, scale = 1, color = 0xe98d68 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const stem = addTexturedCylinder(group, { y: 0, radiusTop: 0.1 * scale, radiusBottom: 0.14 * scale, height: 0.38 * scale, sides: 6, material: materials.dirt });
  stem.castShadow = false;
  const capMaterial = materials.tint(materials.crystal, color, `mushroom-${color}`);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.32 * scale, 0.18 * scale, 8), capMaterial);
  cap.position.y = 0.42 * scale;
  cap.castShadow = false;
  group.add(cap);
  return group;
};

export const createVine = ({ parent, materials, x = 0, y = 0, z = 0, length = 2.2, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  parent.add(group);
  const segments = 6;
  for (let index = 0; index < segments; index += 1) {
    const segment = new THREE.Mesh(new THREE.BoxGeometry(0.1, length / segments + 0.08, 0.1), materials.leafAncient);
    segment.position.set(Math.sin(index * 0.9) * 0.12, -index * length / segments, 0);
    segment.rotation.z = Math.sin(index * 0.7) * 0.16;
    group.add(segment);
    if (index % 2 === 0) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.18), materials.leafLight);
      leaf.position.set(index % 4 ? 0.2 : -0.2, segment.position.y, 0);
      leaf.rotation.z = index % 4 ? 0.3 : -0.3;
      group.add(leaf);
    }
  }
  return group;
};

export const installVegetationWind = ({ engine, windObjects }) => {
  engine.addUpdater((delta, elapsed) => {
    windObjects.forEach((object, index) => {
      const phase = object.userData.windPhase || index;
      object.rotation.z = Math.sin(elapsed * 1.25 + phase) * 0.025;
      object.rotation.x = Math.cos(elapsed * 0.9 + phase * 0.7) * 0.014;
    });
  });
};
