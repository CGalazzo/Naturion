import { THREE } from "../engine.js";
import { createDioramaMaterials } from "../art/materials.js";
import {
  addPathRibbon,
  addPixelWaterPond,
  addPlateau,
  addTexturedBox,
  addTexturedCylinder,
  buildLayeredDioramaBase
} from "../art/environment-factory.js";
import {
  createFern,
  createFlower,
  createGrassTuft,
  createMushroom,
  createPixelShrub,
  createPixelTree,
  installVegetationWind
} from "../art/vegetation-factory.js";
import {
  createExitArch,
  createNaturalArena,
  createPuzzleAltar,
  createRockCluster,
  createRootGate,
  createWoodBridge
} from "../art/prop-factory.js";

const rect = (minX, maxX, minZ, maxZ, height = 0) => ({ type: "rect", minX, maxX, minZ, maxZ, height });
const circle = (x, z, radius, height = 0) => ({ type: "circle", x, z, radius, height });
const ramp = (minX, maxX, minZ, maxZ, fromHeight, toHeight, axis = "z") => ({ type: "ramp", minX, maxX, minZ, maxZ, fromHeight, toHeight, axis });

const insideZone = (zone, x, z, inset = 0) => {
  if (zone.type === "circle") return Math.hypot(x - zone.x, z - zone.z) <= zone.radius - inset;
  return x >= zone.minX + inset && x <= zone.maxX - inset && z >= zone.minZ + inset && z <= zone.maxZ - inset;
};

const zoneHeight = (zone, x, z) => {
  if (zone.type !== "ramp") return zone.height || 0;
  const range = zone.axis === "x" ? zone.maxX - zone.minX : zone.maxZ - zone.minZ;
  const value = zone.axis === "x" ? x - zone.minX : z - zone.minZ;
  const progress = Math.max(0, Math.min(1, value / range));
  return THREE.MathUtils.lerp(zone.fromHeight, zone.toHeight, progress);
};

export const bosqueClareiraStage = {
  id: "bosque-clareira-diorama",
  name: "Clareira dos Ecos",
  subtitle: "Bosque Luminal · Diorama 3D",
  objective: "Explore o bosque e alcance o portão de raízes.",
  sceneImage: "assets/map/bosque-luminal.webp",
  palette: {
    sky: 0x183f34,
    fog: 0x2a5645,
    grass: 0x4f9d4b,
    grassLight: 0x72bd54,
    earth: 0x6d5332,
    path: 0xb58c52,
    stone: 0x657468,
    water: 0x2f9ca2,
    crystal: 0x69e7de
  },
  startPosition: { x: -26, z: -20 },
  cameraBounds: { minX: -23, maxX: 23, minZ: -18, maxZ: 18.5 },
  focusPoints: {
    blockedGate: { x: 11.5, y: 2.7, z: 8.8 },
    npcArena: { x: 19, y: 1.5, z: 1 },
    finalArea: { x: 27, y: 3, z: 20 }
  },
  walkableZones: [
    circle(-26, -20, 6.8, 0),
    rect(-28, -8, -23, -17, 0),
    rect(-13, -5, -20, 1, 0),
    circle(-7, 1, 8.3, 0),
    rect(-8, 8, -3.5, 4.5, 0),
    rect(4, 12, 0, 8, 0),
    ramp(9, 14, 5, 10, 0, 1.05, "z"),
    rect(10, 22, 9, 15, 1.05),
    circle(22, 12, 7.4, 1.05),
    ramp(21, 27, 14, 19, 1.05, 1.75, "z"),
    circle(27, 20, 6.4, 1.75),
    rect(-12, -4, 3, 13, 0),
    rect(-24, -8, 10, 16, 0.45),
    circle(-24, 16, 6.2, 0.45),
    ramp(-13, -8, 8, 13, 0, 0.45, "z"),
    rect(17, 24, -5, 5, 0.4),
    circle(19, 1, 6.5, 0.4),
    rect(8, 18, -18, -12, 0),
    rect(-1, 10, -19, -13, 0)
  ],
  obstacles: [],

  getHeightAt(x, z) {
    const matching = this.walkableZones.filter((zone) => insideZone(zone, x, z, 0));
    if (!matching.length) return 0;
    return Math.max(...matching.map((zone) => zoneHeight(zone, x, z)));
  },

  isWalkable(x, z, radius = 0) {
    return this.walkableZones.some((zone) => insideZone(zone, x, z, Math.min(radius, 0.48)));
  },

  collides(x, z, radius = 0.5) {
    return this.obstacles.some((obstacle) => {
      if (obstacle.type === "circle") return Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + radius;
      const nearestX = Math.max(obstacle.minX, Math.min(x, obstacle.maxX));
      const nearestZ = Math.max(obstacle.minZ, Math.min(z, obstacle.maxZ));
      return Math.hypot(x - nearestX, z - nearestZ) < radius;
    });
  }
};

const addRampSteps = ({ parent, stage, materials, from, to, width, steps = 9 }) => {
  for (let index = 0; index < steps; index += 1) {
    const t = (index + 0.5) / steps;
    const x = THREE.MathUtils.lerp(from.x, to.x, t);
    const z = THREE.MathUtils.lerp(from.z, to.z, t);
    const nextX = THREE.MathUtils.lerp(from.x, to.x, Math.min(1, t + 1 / steps));
    const nextZ = THREE.MathUtils.lerp(from.z, to.z, Math.min(1, t + 1 / steps));
    const angle = Math.atan2(nextX - x, nextZ - z);
    const y = stage.getHeightAt(x, z);
    addTexturedBox(parent, {
      x,
      y: y - 0.09,
      z,
      width,
      height: 0.16,
      depth: Math.hypot(to.x - from.x, to.z - from.z) / steps + 0.24,
      material: materials.path,
      receiveShadow: true,
      rotationY: angle
    });
  }
};

const createLeafPile = ({ parent, stage, materials, x, z, color = 0xa77d3f, rotation = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z) + 0.045, z);
  group.rotation.y = rotation;
  parent.add(group);
  const material = materials.tint(materials.leaf, color, `leaf-pile-${color}`);
  [[-0.2, 0, 0], [0.12, 0.02, 0.08], [0.28, 0, -0.13], [-0.05, 0.025, -0.2]].forEach(([lx, ly, lz], index) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.16), index % 2 ? material : materials.leafAncient);
    leaf.position.set(lx, ly, lz);
    leaf.rotation.y = index * 0.68;
    group.add(leaf);
  });
};

const createEntryTotem = ({ parent, stage, materials, x, z }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  addTexturedCylinder(group, { y: 0, radiusTop: 0.28, radiusBottom: 0.38, height: 2.4, sides: 6, material: materials.barkDark, castShadow: true });
  const sign = addTexturedBox(group, { x: 0.36, y: 1.2, width: 1.3, height: 0.7, depth: 0.16, material: materials.wood, castShadow: true });
  sign.rotation.z = -0.06;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.crystal);
  crystal.position.set(-0.18, 2.18, 0);
  crystal.scale.y = 1.4;
  group.add(crystal);
};

export const buildBosqueClareira = ({ scene, engine }) => {
  const stage = bosqueClareiraStage;
  stage.obstacles.length = 0;
  const materials = createDioramaMaterials();
  const root = new THREE.Group();
  root.name = "BosqueClareiraPixelDiorama";
  scene.add(root);

  buildLayeredDioramaBase({ root, materials });

  addPlateau({ parent: root, x: 17, z: 12, width: 15.2, depth: 10.8, height: 1.05, materials, top: "grassLight", rotation: 0.03 });
  addPlateau({ parent: root, x: 27, z: 20, width: 13.2, depth: 12.4, height: 1.75, materials, top: "grassLight", rotation: -0.05 });
  addPlateau({ parent: root, x: -24, z: 16, width: 14.2, depth: 11.2, height: 0.45, materials, top: "grass", rotation: 0.025 });
  addPlateau({ parent: root, x: 19, z: 1, width: 14.4, depth: 11.8, height: 0.4, materials, top: "grassLight", rotation: -0.02 });

  addPixelWaterPond({ parent: root, engine, materials, x: -22, z: 3, scaleX: 0.88, scaleZ: 0.82 });

  addPathRibbon({
    parent: root,
    stage,
    materials,
    seed: 1,
    width: 3.5,
    points: [[-28, -20], [-21, -20], [-14, -18], [-10, -11], [-8, -2], [-5, 1], [1, 1.2], [6.5, 3.2], [10.4, 7.3]]
  });
  addPathRibbon({
    parent: root,
    stage,
    materials,
    seed: 2,
    width: 3.1,
    points: [[-8, 1], [-8.8, 6], [-12, 10.5], [-18.5, 13.5], [-24, 16]]
  });
  addPathRibbon({
    parent: root,
    stage,
    materials,
    seed: 3,
    width: 3.2,
    points: [[1, 1], [7, -1.1], [13, -1.2], [19, 1]]
  });
  addPathRibbon({
    parent: root,
    stage,
    materials,
    seed: 4,
    width: 2.75,
    points: [[-4, -17], [1.5, -15.7], [7.2, -15]]
  });
  addPathRibbon({
    parent: root,
    stage,
    materials,
    seed: 5,
    width: 3.15,
    points: [[14, 10.5], [19, 12], [22, 14], [25, 17.5], [27, 20]]
  });
  addRampSteps({ parent: root, stage, materials, from: { x: 10.4, z: 6 }, to: { x: 13.2, z: 10.1 }, width: 3.1, steps: 9 });
  addRampSteps({ parent: root, stage, materials, from: { x: 22, z: 14.2 }, to: { x: 26, z: 19.2 }, width: 3, steps: 10 });
  addRampSteps({ parent: root, stage, materials, from: { x: -10.5, z: 9 }, to: { x: -9, z: 13 }, width: 2.7, steps: 8 });

  createEntryTotem({ parent: root, stage, materials, x: -30, z: -21.8 });
  createEntryTotem({ parent: root, stage, materials, x: -23.5, z: -24.5 });

  const windObjects = [];
  const trees = [
    [-31, -23, 1.08, "ancient", 0.2], [-30, -15, 0.92, "common", 1.1], [-22, -26, 0.82, "young", 0.5],
    [-17, -23, 0.96, "common", 2.2], [-4, -23, 1.12, "ancient", 1.8], [-16, -5, 0.92, "common", 0.8],
    [-19, -1, 1.02, "common", 2.9], [-28.5, 7, 0.86, "young", 1.4], [-30, 13, 1.08, "ancient", 0.1],
    [-18, 20, 1.02, "common", 2.4], [-8, 17.5, 0.88, "young", 1], [-2, 9, 1, "common", 2.7],
    [3, -6, 0.9, "common", 0.35], [8, -7, 1.08, "ancient", 1.5], [14, -4.2, 0.86, "young", 0.75],
    [28, -2, 1.02, "common", 2.6], [31, 7, 1.12, "ancient", 0.6], [31, 15, 0.9, "common", 1.8],
    [20, 21, 0.86, "young", 2.2], [32, 24, 1.12, "ancient", 0.15], [8, 18.5, 0.96, "common", 2.9],
    [16, 20, 0.78, "young", 1.2], [-34, -2, 1.05, "ancient", 0.4], [34, -14, 1.05, "common", 2.1]
  ];
  trees.forEach(([x, z, scale, variant, rotation]) => createPixelTree({ parent: root, stage, engine, materials, x, z, scale, variant, rotation }));

  const rocks = [
    [-20, -18, 0.9, 0.2, true], [-10, -8, 0.75, 1.1, false], [-3, 4, 0.7, 2.4, true],
    [6, 3, 0.82, 1.6, true], [12, 5.2, 0.72, 0.5, true], [17, 16, 0.8, 2.2, false],
    [25, 12, 0.9, 0.9, true], [-21, 14, 0.8, 2.7, true], [-11, 12, 0.68, 1.8, false],
    [13, -15, 0.78, 0.15, true], [29, 18, 0.65, 1.3, true], [-26, 6, 0.58, 2.4, true]
  ];
  rocks.forEach(([x, z, scale, rotation, moss]) => createRockCluster({ parent: root, stage, materials, x, z, scale, rotation, moss }));

  const shrubs = [
    [-29, -18, 0.8, "normal"], [-24, -12, 0.9, "light"], [-16, 3, 0.85, "ancient"], [-26, 11, 0.95, "light"],
    [-16, 17, 0.8, "normal"], [-5, 8, 0.82, "light"], [4, 5, 0.85, "normal"], [12, -5, 0.82, "ancient"],
    [22, -3, 0.9, "light"], [25, 9, 0.78, "normal"], [22, 19, 0.88, "light"], [31, 20, 0.9, "ancient"]
  ];
  shrubs.forEach(([x, z, scale, tint]) => createPixelShrub({ parent: root, stage, materials, x, z, scale, tint }));

  const grassPositions = [
    [-29, -22], [-25, -24], [-20, -22], [-16, -20], [-13, -15], [-11, -5], [-12, 1], [-14, 5],
    [-27, 2], [-28, 5], [-25, 8], [-22, 9], [-19, 8], [-17, 6], [-15, 11], [-18, 16],
    [-24, 19], [-29, 16], [-11, 16], [-7, 13], [-5, 7], [0, 5], [4, -3], [9, -4],
    [13, 1], [16, -3], [22, -4], [24, 4], [17, 8], [20, 10], [24, 14], [29, 14],
    [31, 20], [27, 24], [22, 22], [12, 18], [7, 17], [4, -14], [0, -18], [15, -17]
  ];
  grassPositions.forEach(([x, z], index) => {
    if (!stage.collides(x, z, 0.15)) createGrassTuft({ parent: root, stage, materials, x, z, scale: 0.72 + (index % 4) * 0.08, windObjects });
  });

  const fernPositions = [[-28, 1], [-25, 7], [-20, 9], [-16, 7], [-17, 15], [-10, 15], [3, 6], [7, 7], [16, 7], [22, 8], [24, 17], [30, 18]];
  fernPositions.forEach(([x, z], index) => createFern({ parent: root, stage, materials, x, z, scale: 0.72 + (index % 3) * 0.1, windObjects }));

  const flowers = [[-27, -18, 0xffd06c], [-23, -17, 0x8fe8ca], [-7, -3, 0xd6a1ff], [-4, 5, 0xffc570], [-22, 17, 0x8ee6c1], [-14, 14, 0xffcf6f], [17, 4, 0xe1a1ff], [23, 3, 0x8ee6c1], [24, 20, 0xffd06c], [29, 18, 0xb4e985]];
  flowers.forEach(([x, z, color], index) => createFlower({ parent: root, stage, materials, x, z, scale: 0.72 + (index % 2) * 0.15, color }));

  const mushrooms = [[-30, -22, 0xe98664], [-17, -4, 0xf2bd5d], [-29, 12, 0xd67fd6], [-19, 19, 0xe98664], [7, -6, 0xf2bd5d], [31, 7, 0xd67fd6]];
  mushrooms.forEach(([x, z, color], index) => {
    createMushroom({ parent: root, stage, materials, x: x + 0.5, z: z + 0.4, scale: 0.8 + index % 2 * 0.14, color });
    createMushroom({ parent: root, stage, materials, x: x + 0.86, z: z + 0.18, scale: 0.55, color });
  });

  [[-17, -18, 0xa7773c], [-9, -2, 0xb98646], [-12, 10, 0x8f6737], [5, 2, 0xa7773c], [14, 11, 0x8d713e], [23, 16, 0xb98646], [11, -14, 0x8f6737]].forEach(([x, z, color], index) => createLeafPile({ parent: root, stage, materials, x, z, color, rotation: index * 0.72 }));

  createRootGate({ parent: root, stage, engine, materials, x: 11.5, z: 8.8 });
  createWoodBridge({ parent: root, stage, materials, x: 9, z: -15, length: 8.2, width: 2.7, blocked: true });
  createPuzzleAltar({ parent: root, stage, engine, materials, x: 10, z: 5 });
  createNaturalArena({ parent: root, stage, materials, x: 19, z: 1, windObjects });
  createExitArch({ parent: root, stage, engine, materials, x: 28, z: 22 });

  const boundaryCrystals = [[24.5, 22.5], [30.7, 21], [9.1, 9.8], [13.9, 9.7]];
  boundaryCrystals.forEach(([x, z], index) => {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(index < 2 ? 0.32 : 0.22, 0), materials.clone(materials.crystal));
    crystal.position.set(x, stage.getHeightAt(x, z) + (index < 2 ? 0.55 : 0.38), z);
    crystal.scale.y = 1.6;
    crystal.rotation.z = index % 2 ? 0.18 : -0.16;
    crystal.castShadow = true;
    root.add(crystal);
    engine.addUpdater((delta, elapsed) => {
      crystal.material.emissiveIntensity = 0.4 + Math.sin(elapsed * 1.4 + index) * 0.14;
    });
  });

  [[-35, -27], [-35, 27], [35, -27], [35, 27]].forEach(([x, z], index) => {
    addTexturedCylinder(root, {
      x,
      y: -0.1,
      z,
      radiusTop: 1.05,
      radiusBottom: 1.35,
      height: 4.5 + index * 0.12,
      sides: 7,
      material: index % 2 ? materials.mossStone : materials.stoneDark,
      castShadow: true,
      receiveShadow: true
    });
  });

  installVegetationWind({ engine, windObjects });

  return {
    root,
    points: stage.focusPoints,
    materials,
    interactions: [
      { id: "blocked-gate", type: "blocked", position: new THREE.Vector3(11.5, stage.getHeightAt(11.5, 6), 6.2), label: "E · Examinar passagem bloqueada" },
      { id: "npc-arena", type: "reserved", position: new THREE.Vector3(19, stage.getHeightAt(19, 1), 1), label: "Área reservada para batalha obrigatória" },
      { id: "final-exit", type: "exit", position: new THREE.Vector3(27, stage.getHeightAt(27, 19), 19), label: "Saída para a próxima fase — ainda bloqueada" },
      { id: "shortcut", type: "shortcut", position: new THREE.Vector3(7, stage.getHeightAt(7, -15), -15), label: "Atalho fechado — será liberado futuramente" }
    ]
  };
};

export const bosqueEntities = [
  { id: "escaruli-teste", formId: "escaruli", level: 4, behavior: "wander", position: { x: -5, z: 1 }, radius: 3.8, speed: 0.82, scale: 2.8 },
  {
    id: "zumbel-voador-teste", formId: "zumbel", level: 5, behavior: "patrol", flying: true,
    altitude: 3.4, position: { x: -18, z: 14 }, path: [{ x: -18, z: 14 }, { x: -24, z: 17 }, { x: -27, z: 13 }, { x: -21, z: 11 }],
    speed: 1.25, scale: 2.45
  },
  { id: "failino-teste", formId: "failino", level: 6, behavior: "wander", position: { x: 19, z: -1 }, radius: 3.2, speed: 1.02, scale: 2.9 }
];
