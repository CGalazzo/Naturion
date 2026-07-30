import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";
import { addTexturedBox, addTexturedCylinder, createPixelShadowTexture } from "./environment-factory.js";
import { createVine, createFlower, createGrassTuft, createFern } from "./vegetation-factory.js";
import { createOutlineMaterial } from "./toon-materials.js";

const createCutRockGeometry = (scale = 1, variation = 0) => {
  const ringCount = 3;
  const segments = 7;
  const vertices = [];
  const indices = [];
  const radii = [1, 0.78, 0.48];
  const heights = [0, 0.56, 0.96];
  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      const irregular = 1 + Math.sin(segment * 2.7 + variation) * 0.1 + Math.cos(segment * 1.9 - variation) * 0.06;
      vertices.push(
        Math.cos(angle) * radii[ring] * irregular * scale,
        heights[ring] * scale + (ring === 2 ? Math.sin(segment + variation) * 0.05 * scale : 0),
        Math.sin(angle) * radii[ring] * (0.82 + (segment % 2) * 0.06) * scale
      );
    }
  }
  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = ring * segments + segment;
      const b = ring * segments + next;
      const c = (ring + 1) * segments + next;
      const d = (ring + 1) * segments + segment;
      indices.push(a, b, d, b, c, d);
    }
  }
  for (let segment = 1; segment < segments - 1; segment += 1) indices.push((ringCount - 1) * segments, (ringCount - 1) * segments + segment, (ringCount - 1) * segments + segment + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const curvedTube = ({ material, points, radius = 0.18, radialSegments = 6 }) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "centripetal", 0.5);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), radius, radialSegments, false), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const addOutline = (mesh, scale = ART_DIRECTION.outline.importantPropScale) => {
  if (!ART_DIRECTION.outline.enabled || !mesh.geometry) return null;
  const outline = new THREE.Mesh(mesh.geometry, createOutlineMaterial(0.74));
  outline.scale.setScalar(scale);
  outline.renderOrder = Math.max(0, (mesh.renderOrder || 0) - 1);
  mesh.add(outline);
  return outline;
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
  group.position.set(x, stage.getHeightAt(x, z) - 0.08 * scale, z);
  group.rotation.y = rotation;
  parent.add(group);
  const pieces = [[0, 0, 0, 1, 0], [-0.58, -0.05, 0.32, 0.55, 2], [0.55, -0.07, -0.28, 0.43, 4]];
  pieces.forEach(([px, py, pz, localScale, variation], index) => {
    const mesh = new THREE.Mesh(
      createCutRockGeometry(scale * localScale, variation + rotation),
      moss && index === 0 ? materials.mossStone : index % 2 ? materials.stoneDark : materials.stone
    );
    mesh.position.set(px * scale, py * scale, pz * scale);
    mesh.rotation.set(0.03 * index, index * 0.7, index % 2 ? 0.05 : -0.04);
    mesh.castShadow = index === 0;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  if (moss) {
    const mossPatch = new THREE.Mesh(new THREE.CircleGeometry(0.52 * scale, 7), materials.grassLight);
    mossPatch.rotation.x = -Math.PI / 2;
    mossPatch.rotation.z = 0.3;
    mossPatch.scale.set(1.25, 0.65, 1);
    mossPatch.position.set(-0.08 * scale, 0.83 * scale, -0.05 * scale);
    group.add(mossPatch);
  }
  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: 0.72 * scale });
  return group;
};

const addArchStone = ({ parent, materials, x, y, z, scale = 1, rotation = 0, moss = false, occluders = [] }) => {
  const mesh = new THREE.Mesh(createCutRockGeometry(scale, x + y + rotation), moss ? materials.mossStone : materials.stone);
  mesh.position.set(x, y, z);
  mesh.rotation.set(0.04 * Math.sin(x), rotation, 0.05 * Math.sin(y));
  mesh.scale.set(1.15, 0.92, 0.82);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  occluders.push(mesh);
  return mesh;
};

export const createRootGate = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.name = "RootGate";
  parent.add(group);
  const occluders = [];

  for (const side of [-1, 1]) {
    const columnX = side * 2.3;
    for (let index = 0; index < 4; index += 1) {
      addArchStone({ parent: group, materials, x: columnX + side * Math.sin(index) * 0.08, y: index * 0.95, z: Math.cos(index) * 0.08, scale: 0.72 + index * 0.02, rotation: side * (index % 2 ? 0.08 : -0.05), moss: index === 0 || index >= 2, occluders });
    }
  }
  const crown = [[-1.7, 3.65, -0.05], [-0.62, 4.08, 0.02], [0.58, 4.12, 0], [1.68, 3.67, -0.04]];
  crown.forEach(([sx, sy, sz], index) => addArchStone({ parent: group, materials, x: sx, y: sy, z: sz, scale: 0.78, rotation: (index - 1.5) * 0.12, moss: index % 2 === 0, occluders }));

  const roots = [
    [[-2.25, 0.05, 0.4], [-1.25, 1.05, 0.2], [-1.6, 2.15, 0.26], [-0.42, 3.2, 0.12], [0.08, 4.5, 0.17]],
    [[2.2, 0.04, 0.36], [1.18, 1.12, 0.18], [1.5, 2.32, 0.23], [0.42, 3.08, 0.1], [-0.08, 4.45, 0.18]],
    [[-1.82, 0.08, -0.14], [-0.68, 1.3, -0.06], [0.52, 2.05, 0.02], [1.48, 3.05, -0.04], [1.9, 4.0, 0]],
    [[1.86, 0.06, -0.1], [0.76, 1.26, -0.02], [-0.4, 2.08, 0.05], [-1.42, 3.04, 0], [-1.88, 3.94, 0.02]],
    [[0, 0.03, 0.43], [0.22, 1.18, 0.38], [-0.2, 2.28, 0.34], [0.14, 3.54, 0.29], [0, 4.52, 0.34]]
  ];
  roots.forEach((points, index) => {
    const root = curvedTube({ material: materials.clone(index % 2 ? materials.barkDark : materials.bark), points, radius: 0.17 + (index % 3) * 0.035, radialSegments: 7 });
    group.add(root);
    occluders.push(root);
  });
  createVine({ parent: group, materials, x: -2.72, y: 4.18, z: 0.35, length: 2.4, rotationY: 0.2 });
  createVine({ parent: group, materials, x: 2.6, y: 4.08, z: 0.3, length: 2.1, rotationY: -0.4 });

  const crystalPositions = [[-1.25, 2.65, 0.68], [1.18, 2.72, 0.68], [0, 4.62, 0.5]];
  crystalPositions.forEach(([cx, cy, cz], index) => {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(index === 2 ? 0.38 : 0.27, 0), materials.clone(materials.crystal));
    crystal.scale.y = 1.55;
    crystal.position.set(cx, cy, cz);
    crystal.rotation.z = index % 2 ? 0.24 : -0.24;
    crystal.castShadow = true;
    group.add(crystal);
    engine.addUpdater((delta, elapsed) => {
      const frame = Math.floor(elapsed * 8) / 8;
      crystal.material.emissiveIntensity = 0.42 + (Math.floor(frame * 3 + index) % 2) * 0.17;
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
  const plankCount = 11;
  for (let index = 0; index < plankCount; index += 1) {
    const offset = (index / (plankCount - 1) - 0.5) * length;
    const plank = addTexturedBox(group, {
      x: offset,
      y: 0.38 + Math.sin(index * 1.15) * 0.035,
      width: length / plankCount * (0.86 + (index % 3) * 0.035),
      height: 0.18 + (index % 2) * 0.025,
      depth: width * (0.91 + (index % 4) * 0.018),
      material: index % 4 === 0 ? materials.bark : materials.wood,
      castShadow: true,
      receiveShadow: true,
      rotationY: (index % 2 ? 1 : -1) * 0.018
    });
    plank.rotation.z = Math.sin(index * 0.68) * 0.025;
  }
  [-1, 1].forEach((side) => {
    const support = curvedTube({
      material: materials.rope,
      points: [[-length * 0.52, 1.12, side * width * 0.56], [0, 1.45, side * width * 0.6], [length * 0.52, 1.12, side * width * 0.56]],
      radius: 0.055,
      radialSegments: 5
    });
    group.add(support);
    for (let index = -4; index <= 4; index += 2) addTexturedCylinder(group, { x: index * length / 9, y: -0.34, z: side * width * 0.5, radiusTop: 0.13, radiusBottom: 0.17, height: 1.35, sides: 7, material: materials.barkDark, castShadow: true });
  });
  if (blocked) {
    const barricade = new THREE.Group();
    group.add(barricade);
    const barA = addTexturedBox(barricade, { y: 0.68, width: 0.3, height: 2.05, depth: width + 0.68, material: materials.barkDark, castShadow: true });
    barA.rotation.x = 0.22;
    const barB = addTexturedBox(barricade, { y: 0.68, width: 0.3, height: 2.05, depth: width + 0.68, material: materials.barkDark, castShadow: true });
    barB.rotation.x = -0.22;
    stage.obstacles.push({ type: "rect", minX: x - 0.8, maxX: x + 0.8, minZ: z - width * 0.7, maxZ: z + width * 0.7 });
  }
  return group;
};

export const createPuzzleAltar = ({ parent, stage, engine, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "PuzzleAltar";
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const stone = new THREE.Mesh(createCutRockGeometry(0.42 + (index % 2) * 0.04, index), index % 3 === 0 ? materials.mossStone : materials.stone);
    stone.position.set(Math.cos(angle) * 0.72, 0.02, Math.sin(angle) * 0.72);
    stone.scale.set(1.1, 0.55, 0.9);
    stone.rotation.y = angle;
    group.add(stone);
  }
  addTexturedCylinder(group, { y: 0.18, radiusTop: 0.68, radiusBottom: 0.8, height: 0.46, sides: 10, material: materials.rune, castShadow: true });
  const runeRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 4, 16), materials.gold);
  runeRing.rotation.x = Math.PI / 2;
  runeRing.position.y = 0.68;
  group.add(runeRing);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), materials.clone(materials.crystal));
  crystal.scale.y = 1.72;
  crystal.position.y = 1.55;
  crystal.castShadow = true;
  group.add(crystal);
  addOutline(crystal, 1.08);

  const particles = [];
  for (let index = 0; index < 8; index += 1) {
    const particle = new THREE.Mesh(new THREE.OctahedronGeometry(0.065 + (index % 2) * 0.02, 0), materials.clone(materials.crystal, { opacity: 0.78 }));
    particle.userData.angle = index / 8 * Math.PI * 2;
    particle.userData.radius = 0.78 + (index % 3) * 0.12;
    particle.position.y = 1.08 + (index % 4) * 0.22;
    group.add(particle);
    particles.push(particle);
  }
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 8) / 8;
    crystal.rotation.y = frame * 0.42;
    crystal.position.y = 1.55 + Math.round(Math.sin(frame * 1.45) * 4) / 48;
    crystal.material.emissiveIntensity = 0.52 + (Math.floor(frame * 4) % 3) * 0.08;
    particles.forEach((particle, index) => {
      const angle = particle.userData.angle + frame * (0.34 + index * 0.012);
      particle.position.x = Math.cos(angle) * particle.userData.radius;
      particle.position.z = Math.sin(angle) * particle.userData.radius;
      particle.position.y = 1.08 + (index % 4) * 0.22 + Math.round(Math.sin(frame * 1.8 + index) * 5) / 40;
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
  const arenaShape = new THREE.Shape();
  const count = 18;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const radius = 5.3 * (1 + Math.sin(index * 1.7) * 0.035);
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius * 0.82;
    if (index === 0) arenaShape.moveTo(px, pz);
    else arenaShape.lineTo(px, pz);
  }
  arenaShape.closePath();
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(arenaShape), materials.dirt);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.055;
  ground.receiveShadow = true;
  group.add(ground);

  const scuffs = [[-1.5, -0.8], [1.8, 0.6], [0.4, -1.7], [-2.3, 1.2], [2.4, -1.1]];
  scuffs.forEach(([sx, sz], index) => {
    const mark = new THREE.Mesh(new THREE.CircleGeometry(0.35 + index % 2 * 0.12, 7), materials.path);
    mark.rotation.x = -Math.PI / 2;
    mark.scale.set(1.8, 0.45, 1);
    mark.position.set(sx, 0.075, sz);
    mark.rotation.z = index * 0.75;
    group.add(mark);
  });
  for (let index = 0; index < 14; index += 1) {
    if (index === 3 || index === 10) continue;
    const angle = index / 14 * Math.PI * 2;
    const stone = new THREE.Mesh(createCutRockGeometry(0.32 + (index % 3) * 0.04, index), index % 4 === 0 ? materials.mossStone : materials.stone);
    stone.position.set(Math.cos(angle) * 5.2, 0.03, Math.sin(angle) * 5.2 * 0.82);
    stone.scale.set(1.1, 0.55, 0.82);
    stone.rotation.y = angle;
    group.add(stone);
  }
  [-1, 1].forEach((side) => {
    const totem = new THREE.Group();
    totem.position.set(side * 4.6, 0, 0.2);
    group.add(totem);
    addTexturedCylinder(totem, { y: 0, radiusTop: 0.18, radiusBottom: 0.28, height: 2.15, sides: 7, material: materials.barkDark, castShadow: true });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.15), materials.clone(materials.rune, { side: THREE.DoubleSide }));
    banner.position.set(side * -0.45, 1.62, 0);
    banner.rotation.y = side * Math.PI / 2;
    totem.add(banner);
  });
  [[-5.4, 2.7], [5.2, -2.4], [-4.8, -3.1], [4.7, 3]].forEach(([fx, fz], index) => {
    createGrassTuft({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx, z: fz, scale: 0.75 + index * 0.05, windObjects });
    createFlower({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx + 0.35, z: fz + 0.2, scale: 0.75, color: index % 2 ? 0xffc86d : 0x8fe9c3 });
    if (index % 2 === 0) createFern({ parent: group, stage: { getHeightAt: () => 0 }, materials, x: fx - 0.45, z: fz - 0.2, scale: 0.62, windObjects });
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
    for (let index = 0; index < 4; index += 1) addArchStone({ parent: group, materials, x: side * 2.08, y: index * 1.02, z: Math.sin(index) * 0.05, scale: 0.7 + index * 0.02, rotation: side * (index % 2 ? 0.06 : -0.04), moss: index >= 2, occluders });
  }
  [[-1.55, 4, 0], [-0.5, 4.4, 0], [0.5, 4.42, 0], [1.55, 4, 0]].forEach(([sx, sy, sz], index) => addArchStone({ parent: group, materials, x: sx, y: sy, z: sz, scale: 0.75, rotation: (index - 1.5) * 0.11, moss: index % 2 === 0, occluders }));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.1), new THREE.MeshBasicMaterial({ color: 0xb8ffe1, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  glow.position.set(0, 2.2, -0.35);
  group.add(glow);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 8), new THREE.MeshBasicMaterial({ color: 0xffefb0, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(0, 4.2, -1.2);
  beam.rotation.x = -0.14;
  group.add(beam);
  createVine({ parent: group, materials, x: -2.55, y: 4.3, z: 0.25, length: 2.2 });
  createVine({ parent: group, materials, x: 2.5, y: 4.25, z: 0.2, length: 1.8 });
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 6);
    glow.material.opacity = frame % 3 === 0 ? 0.2 : frame % 3 === 1 ? 0.16 : 0.18;
    beam.material.opacity = frame % 4 === 0 ? 0.07 : 0.052;
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
