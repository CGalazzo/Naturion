import { THREE } from "../engine.js";

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
  subtitle: "Fase de teste · Diorama 3D",
  objective: "Explore o bosque e alcance o portão de raízes.",
  sceneImage: "assets/map/bosque-luminal.webp",
  palette: {
    sky: 0x14352d,
    fog: 0x214c3d,
    grass: 0x4f9d4b,
    grassLight: 0x72bd54,
    earth: 0x6d5332,
    path: 0xb58c52,
    stone: 0x657468,
    water: 0x2f9ca2,
    crystal: 0x69e7de
  },
  startPosition: { x: -26, z: -20 },
  cameraBounds: { minX: -22, maxX: 22, minZ: -17, maxZ: 18 },
  focusPoints: {
    blockedGate: { x: 16, y: 2.8, z: 9 },
    npcArena: { x: 18, y: 1.2, z: 1 },
    finalArea: { x: 27, y: 2.2, z: 20 }
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

const material = (color, options = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...options });

const addBox = (parent, x, y, z, width, height, depth, color, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, options));
  mesh.position.set(x, y + height * 0.5, z);
  parent.add(mesh);
  return mesh;
};

const addCylinder = (parent, x, y, z, radius, height, color, sides = 8) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), material(color));
  mesh.position.set(x, y + height * 0.5, z);
  parent.add(mesh);
  return mesh;
};

const addTree = (parent, stage, x, z, scale = 1, occluders = []) => {
  const y = stage.getHeightAt(x, z);
  const group = new THREE.Group();
  const trunk = addBox(group, 0, 0, 0, 0.75 * scale, 3.2 * scale, 0.75 * scale, 0x70472b);
  trunk.position.y = 1.6 * scale;
  const canopyMaterial = material(0x327743);
  const canopyPoints = [[0, 3.2, 0], [-0.8, 3, 0.2], [0.8, 3.05, -0.15], [0, 3.65, 0.3], [0.25, 3.1, 0.85]];
  canopyPoints.forEach(([cx, cy, cz], index) => {
    const size = (index === 0 ? 2.35 : 1.8) * scale;
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), canopyMaterial.clone());
    canopy.position.set(cx * scale, cy * scale, cz * scale);
    group.add(canopy);
    occluders.push(canopy);
  });
  group.position.set(x, y, z);
  parent.add(group);
  stage.obstacles.push({ type: "circle", x, z, radius: 0.72 * scale });
  return group;
};

const addRock = (parent, stage, x, z, scale = 1) => {
  const y = stage.getHeightAt(x, z);
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * scale, 0), material(stage.palette.stone));
  mesh.scale.set(1.25, 0.75, 1);
  mesh.position.set(x, y + 0.55 * scale, z);
  mesh.rotation.y = (x + z) * 0.17;
  parent.add(mesh);
  stage.obstacles.push({ type: "circle", x, z, radius: 0.65 * scale });
  return mesh;
};

const addGrassTuft = (parent, stage, x, z, scale = 1) => {
  const y = stage.getHeightAt(x, z);
  const group = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const blade = addBox(group, (index - 1.5) * 0.18, 0, (index % 2) * 0.12, 0.12, 0.55 + index * 0.05, 0.12, index % 2 ? 0x5fbf59 : 0x3f9850);
    blade.rotation.z = (index - 1.5) * 0.12;
  }
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  parent.add(group);
};

export const buildBosqueClareira = ({ scene, engine }) => {
  const stage = bosqueClareiraStage;
  stage.obstacles.length = 0;
  const root = new THREE.Group();
  root.name = "BosqueClareiraDiorama";
  scene.add(root);

  addBox(root, 0, -2.8, 0, 76, 4.8, 62, stage.palette.earth);
  addBox(root, 0, -0.18, 0, 72, 0.52, 58, stage.palette.grass);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(28, 21), new THREE.MeshLambertMaterial({ color: stage.palette.water, transparent: true, opacity: 0.76, flatShading: true }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-18, 0.12, 4);
  root.add(water);

  const pathSegments = [
    [-24, -19, 13, 4], [-13, -12, 6, 13], [-8, -2, 8, 10], [1, 1, 13, 4],
    [8, 5, 6, 10], [14, 10, 10, 4], [21, 14, 9, 4], [-10, 8, 4, 13],
    [-17, 13, 12, 4], [10, -15, 20, 3.2]
  ];
  pathSegments.forEach(([x, z, width, depth]) => addBox(root, x, stage.getHeightAt(x, z) + 0.03, z, width, 0.08, depth, stage.palette.path));

  addBox(root, 17, 0.08, 12, 15, 1.05, 10, stage.palette.grassLight);
  addBox(root, 27, 0.08, 20, 13, 1.75, 12, stage.palette.grassLight);
  addBox(root, -24, 0.08, 16, 13, 0.45, 11, 0x5b9f4a);
  addBox(root, 19, 0.08, 1, 13, 0.4, 11, 0x5caa52);

  const occluders = [];
  const trees = [
    [-31, -23, 1.1], [-30, -15, 1], [-22, -26, 1.15], [-17, -23, 1], [-4, -23, 1.15],
    [-16, -5, 1], [-19, -1, 1.1], [-26, 7, 1.05], [-29, 12, 1.2], [-18, 19, 1.1],
    [-8, 16, 1], [-2, 9, 1.05], [3, -6, 1], [8, -7, 1.15], [14, -3, 1],
    [28, -2, 1.1], [31, 7, 1.2], [30, 15, 1.05], [20, 21, 1.05], [32, 24, 1.2]
  ];
  trees.forEach(([x, z, scale]) => addTree(root, stage, x, z, scale, occluders));
  occluders.forEach((mesh) => engine.registerOccluder(mesh));

  const rocks = [[-20, -18, 0.9], [-10, -8, 0.75], [-3, 4, 0.7], [6, 3, 0.85], [12, 6, 0.9], [17, 16, 0.8], [25, 12, 0.9], [-21, 14, 0.8], [-11, 12, 0.7], [13, -15, 0.8]];
  rocks.forEach(([x, z, scale]) => addRock(root, stage, x, z, scale));

  for (let index = 0; index < 70; index += 1) {
    const angle = index * 2.399;
    const radius = 5 + (index % 9) * 3.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (stage.isWalkable(x, z, 0.2) && !stage.collides(x, z, 0.2)) addGrassTuft(root, stage, x, z, 0.65 + (index % 3) * 0.14);
  }

  const gate = new THREE.Group();
  const gateY = stage.getHeightAt(16, 9);
  const leftPillar = addBox(gate, -2.4, 0, 0, 1.2, 5.2, 1.2, 0x4c5f4f);
  const rightPillar = addBox(gate, 2.4, 0, 0, 1.2, 5.2, 1.2, 0x4c5f4f);
  const lintel = addBox(gate, 0, 4.2, 0, 6, 1, 1.25, 0x607263);
  const roots = new THREE.Group();
  for (let index = -2; index <= 2; index += 1) {
    const rootBar = addBox(roots, index * 0.75, 0, 0.2, 0.35, 4.6 - Math.abs(index) * 0.25, 0.5, 0x6b4329);
    rootBar.rotation.z = index * 0.08;
  }
  gate.add(roots);
  gate.position.set(16, gateY, 9);
  gate.rotation.y = -0.16;
  root.add(gate);
  stage.obstacles.push({ type: "rect", minX: 13.2, maxX: 18.8, minZ: 8.1, maxZ: 10.2 });
  [leftPillar, rightPillar, lintel].forEach((mesh) => engine.registerOccluder(mesh));

  const shortcutBridge = new THREE.Group();
  addBox(shortcutBridge, 0, 0, 0, 8, 0.45, 2.6, 0x77502e);
  for (let index = -3; index <= 3; index += 1) addBox(shortcutBridge, index * 1.05, 0.35, 0, 0.18, 0.65, 2.8, 0xa2753c);
  shortcutBridge.position.set(9, 0, -15);
  root.add(shortcutBridge);
  addBox(root, 9, 0.6, -15, 1.2, 2.2, 3.2, 0x5d4632);
  stage.obstacles.push({ type: "rect", minX: 8.3, maxX: 9.7, minZ: -16.7, maxZ: -13.3 });

  const arena = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.3, 0.18, 20), material(0x8b7b54));
  arena.position.set(19, stage.getHeightAt(19, 1) + 0.1, 1);
  root.add(arena);
  const arenaRing = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.15, 4, 20), material(0xd3b85a));
  arenaRing.rotation.x = Math.PI / 2;
  arenaRing.position.set(19, stage.getHeightAt(19, 1) + 0.24, 1);
  root.add(arenaRing);

  const puzzleMarker = new THREE.Group();
  addCylinder(puzzleMarker, 0, 0, 0, 0.55, 2.4, stage.palette.crystal, 6);
  addCylinder(puzzleMarker, 0, 2.3, 0, 0.25, 1.1, 0xcaffb8, 5);
  puzzleMarker.position.set(10, stage.getHeightAt(10, 5), 5);
  root.add(puzzleMarker);
  stage.obstacles.push({ type: "circle", x: 10, z: 5, radius: 0.85 });

  const exitArch = new THREE.Group();
  addBox(exitArch, -2.1, 0, 0, 1, 4.8, 1, 0x586b5d);
  addBox(exitArch, 2.1, 0, 0, 1, 4.8, 1, 0x586b5d);
  addBox(exitArch, 0, 4, 0, 5.2, 0.9, 1.1, 0x6d806e);
  exitArch.position.set(28, stage.getHeightAt(28, 22), 22);
  root.add(exitArch);
  stage.obstacles.push({ type: "rect", minX: 25.3, maxX: 30.7, minZ: 21.3, maxZ: 22.9 });

  [[-34, -27], [-34, 27], [34, -27], [34, 27]].forEach(([x, z]) => addCylinder(root, x, 0, z, 1.3, 4.4, 0x435b4a, 6));

  return {
    root,
    points: stage.focusPoints,
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
