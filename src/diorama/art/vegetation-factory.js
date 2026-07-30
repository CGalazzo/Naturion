import { THREE } from "../engine.js";
import { addTexturedCylinder } from "./environment-factory.js";

const makeLeafMass = ({ material, radius = 1, scale = [1, 1, 1], detail = 1 }) => {
  const geometry = detail > 1 ? new THREE.IcosahedronGeometry(radius, 1) : new THREE.DodecahedronGeometry(radius, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const createCurvedBranch = ({ material, points, radius = 0.12, radialSegments = 6 }) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "centripetal", 0.5);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(6, points.length * 3), radius, radialSegments, false), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const treeProfile = (variant, scale) => {
  if (variant === "ancient") return { trunkHeight: 4.35 * scale, trunkRadius: 0.62 * scale, canopy: 1.28 * scale, family: "ancient" };
  if (variant === "young") return { trunkHeight: 2.5 * scale, trunkRadius: 0.34 * scale, canopy: 0.78 * scale, family: "young" };
  if (variant === "magic") return { trunkHeight: 3.8 * scale, trunkRadius: 0.45 * scale, canopy: 1.06 * scale, family: "magic" };
  return { trunkHeight: 3.35 * scale, trunkRadius: 0.45 * scale, canopy: 1 * scale, family: "common" };
};

const addRoot = (group, materials, angle, length, scale, offset = 0) => {
  const points = [
    [0, 0.18 * scale, 0],
    [Math.cos(angle) * length * 0.35 * scale, 0.11 * scale, Math.sin(angle) * length * 0.35 * scale],
    [Math.cos(angle + offset) * length * 0.72 * scale, 0.045 * scale, Math.sin(angle + offset) * length * 0.72 * scale],
    [Math.cos(angle) * length * scale, 0.01, Math.sin(angle) * length * scale]
  ];
  const root = createCurvedBranch({ material: materials.barkDark, points, radius: 0.105 * scale, radialSegments: 5 });
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
  group.name = `StorybookTree-${variant}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);

  const profile = treeProfile(variant, scale);
  const { trunkHeight, trunkRadius, canopy, family } = profile;
  const trunkMaterial = family === "ancient" ? materials.barkDark : materials.bark;
  const trunkCurve = [
    [0, 0, 0],
    [0.06 * scale, trunkHeight * 0.28, -0.04 * scale],
    [-0.08 * scale, trunkHeight * 0.58, 0.07 * scale],
    [0.04 * scale, trunkHeight, 0]
  ];
  const trunk = createCurvedBranch({ material: trunkMaterial, points: trunkCurve, radius: trunkRadius, radialSegments: family === "ancient" ? 8 : 7 });
  group.add(trunk);

  const rootCount = family === "young" ? 3 : family === "ancient" ? 7 : 5;
  for (let index = 0; index < rootCount; index += 1) {
    addRoot(group, materials, index / rootCount * Math.PI * 2 + 0.2, family === "ancient" ? 1.9 : 1.15, scale, index % 2 ? 0.14 : -0.1);
  }

  const branchMaterial = family === "ancient" ? materials.barkDark : materials.bark;
  const branchLayouts = family === "young"
    ? [[-0.75, 0.68, 0.35], [0.7, 0.76, -0.28]]
    : family === "ancient"
      ? [[-1.35, 0.55, 0.55], [1.3, 0.62, -0.35], [-1.05, 0.74, -0.72], [1, 0.79, 0.66], [0.2, 0.88, -0.9]]
      : [[-1, 0.6, 0.45], [0.95, 0.67, -0.42], [-0.65, 0.78, -0.72], [0.72, 0.82, 0.63]];
  branchLayouts.forEach(([side, heightRatio, depth], index) => {
    const startY = trunkHeight * heightRatio;
    const branch = createCurvedBranch({
      material: branchMaterial,
      points: [
        [0, startY, 0],
        [side * 0.55 * scale, startY + 0.18 * scale, depth * 0.35 * scale],
        [side * (family === "ancient" ? 1.75 : 1.25) * scale, startY + 0.52 * scale, depth * scale]
      ],
      radius: trunkRadius * (0.24 + (index % 2) * 0.03),
      radialSegments: 6
    });
    group.add(branch);
  });

  const leafBase = family === "ancient" ? materials.leafAncient : family === "young" ? materials.leafLight : family === "magic" ? materials.leafMagic : materials.leaf;
  const leafLight = family === "magic" ? materials.leafMagic : materials.leafLight;
  const canopyLayouts = family === "young"
    ? [[0, 0, 0, 1.35, 0.95, 1.15], [-0.75, -0.1, 0.15, 0.82, 0.7, 0.78], [0.72, 0.08, -0.2, 0.88, 0.72, 0.8]]
    : family === "ancient"
      ? [[0, 0, 0, 2.2, 1.3, 1.9], [-1.75, -0.18, 0.45, 1.5, 1.05, 1.35], [1.75, -0.12, -0.35, 1.55, 1.08, 1.35], [-0.45, 1.08, -0.55, 1.55, 1.05, 1.4], [0.6, 0.65, 1.25, 1.35, 0.92, 1.22], [-1.1, 0.5, -1.25, 1.2, 0.88, 1.1]]
      : family === "magic"
        ? [[0, 0, 0, 1.72, 1.08, 1.55], [-1.15, -0.1, 0.4, 1.12, 0.82, 1], [1.18, 0.02, -0.38, 1.15, 0.84, 1.02], [0.05, 0.92, 0.1, 1.25, 0.86, 1.12], [-0.5, 0.35, -1.05, 0.95, 0.74, 0.9]]
        : [[0, 0, 0, 1.7, 1.05, 1.5], [-1.2, -0.1, 0.4, 1.05, 0.8, 0.96], [1.22, 0, -0.34, 1.1, 0.82, 1], [0.12, 0.88, 0.1, 1.18, 0.8, 1.06], [-0.38, 0.3, -1.02, 0.92, 0.7, 0.85]];

  const canopyY = trunkHeight + (family === "ancient" ? 1.25 : family === "young" ? 0.72 : 1.05) * scale;
  canopyLayouts.forEach(([px, py, pz, sx, sy, sz], index) => {
    const material = materials.clone(index % 2 ? leafLight : leafBase, { transparent: false, opacity: 1 });
    const mass = makeLeafMass({ material, radius: canopy, scale: [sx, sy, sz], detail: index === 0 ? 2 : 1 });
    mass.position.set(px * scale, canopyY + py * scale, pz * scale);
    mass.rotation.set(0.05 * (index % 2), index * 0.72, -0.04 * (index % 3));
    group.add(mass);
    engine.registerOccluder(mass);
  });

  if (family === "magic") {
    for (let index = 0; index < 5; index += 1) {
      const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + (index % 2) * 0.025, 0), materials.clone(materials.crystal));
      mote.userData.angle = index / 5 * Math.PI * 2;
      mote.position.set(Math.cos(mote.userData.angle) * 1.8 * scale, canopyY - 0.6 * scale + index * 0.22, Math.sin(mote.userData.angle) * 1.8 * scale);
      group.add(mote);
      engine.addUpdater((delta, elapsed) => {
        const frame = Math.floor(elapsed * 8) / 8;
        mote.position.y = canopyY - 0.6 * scale + index * 0.22 + Math.sin(frame * 2 + index) * 0.14;
        mote.material.emissiveIntensity = 0.42 + (Math.floor(frame * 4 + index) % 2) * 0.16;
      });
    }
  }

  if (family === "ancient") {
    createMushroom({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: trunkRadius * 0.8, z: trunkRadius * 0.4, scale: 0.75 * scale, color: 0xeaa86b });
  }

  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: trunkRadius * 1.28 });
  return group;
};

export const createPixelShrub = ({ parent, stage, materials, x, z, scale = 1, tint = "normal" }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const baseMaterial = tint === "light" ? materials.leafLight : tint === "ancient" ? materials.leafAncient : materials.leaf;
  const layouts = [[0, 0.48, 0, 0.72, 0.5, 0.68], [-0.52, 0.32, 0.16, 0.5, 0.38, 0.46], [0.48, 0.35, -0.18, 0.54, 0.4, 0.48], [0.08, 0.25, 0.5, 0.44, 0.34, 0.4]];
  layouts.forEach(([px, py, pz, sx, sy, sz], index) => {
    const mass = makeLeafMass({ material: index % 2 ? materials.leafLight : baseMaterial, radius: scale, scale: [sx, sy, sz], detail: 1 });
    mass.position.set(px * scale, py * scale, pz * scale);
    mass.castShadow = index === 0;
    group.add(mass);
  });
  return group;
};

const bladeGeometry = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0);
  shape.quadraticCurveTo(-0.04, 0.55, 0.02, 0.92);
  shape.quadraticCurveTo(0.08, 0.5, 0.08, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 1);
};

export const createGrassTuft = ({ parent, stage, materials, x, z, scale = 1, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const geometry = bladeGeometry();
  const grassMaterial = materials.clone(materials.grassLight, { side: THREE.DoubleSide });
  for (let index = 0; index < 5; index += 1) {
    const blade = new THREE.Mesh(geometry, index % 2 ? grassMaterial : materials.clone(materials.grass, { side: THREE.DoubleSide }));
    blade.scale.setScalar(scale * (0.62 + (index % 3) * 0.12));
    blade.rotation.y = index / 5 * Math.PI * 2;
    blade.rotation.z = (index - 2) * 0.05;
    blade.position.set(Math.cos(index * 1.7) * 0.12 * scale, 0, Math.sin(index * 1.7) * 0.12 * scale);
    group.add(blade);
  }
  group.userData.windPhase = x * 0.31 + z * 0.17;
  group.userData.baseRotation = group.rotation.z;
  windObjects.push(group);
  return group;
};

export const createFern = ({ parent, stage, materials, x, z, scale = 1, windObjects = [] }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 7 * Math.PI * 2;
    const stem = createCurvedBranch({
      material: index % 2 ? materials.leafLight : materials.leaf,
      points: [[0, 0, 0], [Math.cos(angle) * 0.25 * scale, 0.28 * scale, Math.sin(angle) * 0.25 * scale], [Math.cos(angle) * 0.62 * scale, 0.48 * scale, Math.sin(angle) * 0.62 * scale]],
      radius: 0.035 * scale,
      radialSegments: 4
    });
    group.add(stem);
    for (let leafIndex = 1; leafIndex <= 3; leafIndex += 1) {
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.12 * scale, 5), materials.clone(materials.leafLight, { side: THREE.DoubleSide }));
      const progress = leafIndex / 4;
      leaf.scale.set(1.5, 0.5, 1);
      leaf.rotation.x = -Math.PI / 2;
      leaf.rotation.z = -angle;
      leaf.position.set(Math.cos(angle) * 0.62 * scale * progress, 0.18 * scale + progress * 0.28 * scale, Math.sin(angle) * 0.62 * scale * progress);
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
  const stemMaterial = materials.tint(materials.grass, 0x6fa953, `stem-${color}`);
  const petalMaterial = materials.tint(materials.crystal, color, `flower-${color}`);
  addTexturedCylinder(group, { y: 0, radiusTop: 0.025 * scale, radiusBottom: 0.035 * scale, height: 0.46 * scale, sides: 5, material: stemMaterial });
  for (let index = 0; index < 5; index += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scale, 6, 4), petalMaterial);
    const angle = index / 5 * Math.PI * 2;
    petal.scale.set(1.3, 0.42, 0.85);
    petal.position.set(Math.cos(angle) * 0.14 * scale, 0.5 * scale, Math.sin(angle) * 0.14 * scale);
    petal.rotation.y = angle;
    group.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 6, 4), materials.gold);
  center.position.y = 0.5 * scale;
  group.add(center);
  return group;
};

export const createMushroom = ({ parent, stage, materials, x, z, scale = 1, color = 0xe98d68 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  addTexturedCylinder(group, { y: 0, radiusTop: 0.075 * scale, radiusBottom: 0.12 * scale, height: 0.34 * scale, sides: 7, material: materials.dirt });
  const capMaterial = materials.tint(materials.crystal, color, `mushroom-${color}`);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.56), capMaterial);
  cap.scale.set(1.25, 0.55, 1.1);
  cap.position.y = 0.38 * scale;
  group.add(cap);
  return group;
};

export const createVine = ({ parent, materials, x = 0, y = 0, z = 0, length = 2.2, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  parent.add(group);
  const points = [];
  const segments = 7;
  for (let index = 0; index <= segments; index += 1) points.push([Math.sin(index * 0.9) * 0.12, -index * length / segments, Math.cos(index * 0.7) * 0.06]);
  group.add(createCurvedBranch({ material: materials.leafAncient, points, radius: 0.045, radialSegments: 4 }));
  for (let index = 1; index < segments; index += 2) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), materials.clone(materials.leafLight, { side: THREE.DoubleSide }));
    leaf.scale.set(1.4, 0.65, 1);
    leaf.position.set(points[index][0] + (index % 4 === 1 ? 0.12 : -0.12), points[index][1], points[index][2]);
    leaf.rotation.y = index;
    group.add(leaf);
  }
  return group;
};

export const installVegetationWind = ({ engine, windObjects }) => {
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 10) / 10;
    windObjects.forEach((object, index) => {
      const sway = Math.round(Math.sin(frame * 1.6 + object.userData.windPhase + index * 0.17) * 12) / 12;
      object.rotation.z = (object.userData.baseRotation || 0) + sway * 0.035;
      object.rotation.x = sway * 0.012;
    });
  });
};
