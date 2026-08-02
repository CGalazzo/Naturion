import { THREE } from "../engine.js";
import { createBosqueLuminalCollision } from "./bosque-luminal-collision.js";
import { createOverworldTextures } from "../textures.js";
import {
  createEnvironmentMaterials,
  createTileInstances,
  createTree,
  createHouse,
  createFenceSegment,
  createSign,
  createTallGrassPatch,
  createFlowerCluster,
  createRock,
  createRootGate,
  createPuzzleMarker,
  createWaterSurface,
  disposeEnvironmentMaterials,
  APPROVED_BOSQUE_WORLD_SIZE
} from "../environment.js";

const TILE = 2;
const distanceToSegment = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};

const PATH_SEGMENTS = [
  [0, 22, 0, -19, 2.7],
  [0, 5, -11, 5, 2.5],
  [0, 9, 14, 9, 2.5],
  [0, -9, -13, -13, 2.35]
];

const isPath = (x, z) => PATH_SEGMENTS.some(([ax, az, bx, bz, width]) => distanceToSegment(x, z, ax, az, bx, bz) <= width);
const pondMetric = (x, z) => ((x + 17) ** 2) / 27 + ((z + 5) ** 2) / 17;

export const bosqueLuminalMap = Object.freeze({
  id: "bosque-luminal-overworld",
  name: "Bosque Luminal",
  objective: "Explore o bosque e descubra como abrir o portão de raízes.",
  sceneImage: "assets/map/bosque-luminal.webp",
  startPosition: Object.freeze({ x: 0, z: 7.5 }),
  bounds: Object.freeze({
    minX: -(APPROVED_BOSQUE_WORLD_SIZE.width / 2),
    maxX: APPROVED_BOSQUE_WORLD_SIZE.width / 2,
    minZ: -(APPROVED_BOSQUE_WORLD_SIZE.depth / 2),
    maxZ: APPROVED_BOSQUE_WORLD_SIZE.depth / 2
  }),
  cameraMode: "fixed-diorama",
  cameraBounds: Object.freeze({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 }),
  visualProjection: Object.freeze({
    width: APPROVED_BOSQUE_WORLD_SIZE.width,
    height: APPROVED_BOSQUE_WORLD_SIZE.projectedHeight
  }),
  palette: Object.freeze({ sky: 0x315f53, fog: 0x3f7162 }),
  focusPoints: Object.freeze({ gate: { x: 0, y: 1.8, z: -20 }, puzzle: { x: -13, y: 1.5, z: -13 } })
});

export const buildBosqueLuminal = ({ scene, engine }) => {
  const root = new THREE.Group();
  root.name = "BosqueLuminalOverworld";
  scene.add(root);
  const textures = createOverworldTextures();
  const materials = createEnvironmentMaterials(textures);
  // Terreno, caminhos e mato são livres. A camada visual compartilhada
  // bloqueia somente os sólidos marcados sobre a arte aprovada.
  const collision = createBosqueLuminalCollision({
    bounds: bosqueLuminalMap.bounds,
    artwork: {
      width: APPROVED_BOSQUE_WORLD_SIZE.sourceWidth,
      height: APPROVED_BOSQUE_WORLD_SIZE.sourceHeight
    }
  });
  const interactions = [];

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(120, 100), materials.grass);
  backdrop.rotation.x = -Math.PI / 2;
  backdrop.position.y = -.2;
  backdrop.receiveShadow = true;
  root.add(backdrop);

  const grassCells = [];
  const pathCells = [];
  const shoreCells = [];
  const waterCells = [];
  const stoneCells = [];
  for (let x = -28; x <= 28; x += TILE) {
    for (let z = -22; z <= 22; z += TILE) {
      const pond = pondMetric(x, z);
      if (pond <= 1) waterCells.push([x, z]);
      else if (pond <= 1.48) shoreCells.push([x, z]);
      else if ((Math.abs(x) <= 5 && z <= -16) || (Math.abs(x + 10) <= 4 && Math.abs(z - 5) <= 4) || (Math.abs(x - 9) <= 4 && Math.abs(z - 1) <= 4)) stoneCells.push([x, z]);
      else if (isPath(x, z)) pathCells.push([x, z]);
      else grassCells.push([x, z]);
    }
  }
  createTileInstances({ parent: root, name: "GrassTiles", cells: grassCells, material: materials.grass });
  createTileInstances({ parent: root, name: "PathTiles", cells: pathCells, material: materials.path });
  createTileInstances({ parent: root, name: "ShoreTiles", cells: shoreCells, material: materials.shore });
  createTileInstances({ parent: root, name: "StoneTiles", cells: stoneCells, material: materials.stone });
  createWaterSurface({ parent: root, engine, materials, cells: waterCells });

  const treePositions = [
    [-27, -21, 1.05, 0], [-22, -22, .95, 1], [-16, -22, 1.08, 2], [-9, -22, .92, 3], [9, -22, 1, 1], [16, -22, .94, 2], [22, -22, 1.1, 3], [27, -20, 1, 0],
    [-28, -15, .94, 2], [-28, -8, 1.08, 3], [-28, 0, .92, 1], [-28, 8, 1.04, 0], [-28, 15, .96, 2], [-27, 21, 1.08, 3],
    [27, -14, 1.02, 1], [28, -7, .92, 2], [28, 1, 1.05, 0], [28, 9, .94, 3], [28, 16, 1.06, 1], [26, 21, 1, 2],
    [-22, 22, .94, 1], [-16, 22, 1.06, 3], [-10, 22, .9, 0], [10, 22, .94, 2], [16, 22, 1.05, 1], [22, 22, .92, 3],
    [-22, 11, 1.06, 0], [-20, 4, .9, 2], [-12, 14, .96, 1], [17, 16, 1.02, 3], [21, 10, .94, 0], [18, -5, 1.08, 2], [21, -12, .92, 1], [-9, -15, 1.04, 3]
  ];
  treePositions.forEach(([x, z, scale, variant]) => {
    createTree({ parent: root, materials, x, z, scale, variant });
  });
  [[-33, -18], [-34, -7], [-33, 7], [-32, 18], [33, -17], [34, -5], [33, 8], [32, 19], [-20, -28], [-8, -28], [8, -28], [20, -28], [-20, 28], [-8, 28], [8, 28], [20, 28]].forEach(([x, z], index) => createTree({ parent: root, materials, x, z, scale: 1.1 + (index % 3) * .08, variant: index % 4 }));

  createHouse({ parent: root, materials, x: -9, z: 5, accent: "red" });
  interactions.push({ id: "door-west", type: "door", position: { x: -9, z: 8.6 }, label: "E · Examinar a porta", message: "O interior desta casa será adicionado em uma próxima etapa." });

  createHouse({ parent: root, materials, x: 9, z: 1, accent: "blue" });
  interactions.push({ id: "door-east", type: "door", position: { x: 9, z: 4.6 }, label: "E · Examinar a porta", message: "A casa está fechada. O interior será construído futuramente." });

  const fences = [
    { id: "fence-west-a", x: -14, z: 9, length: 8, rotationY: 0 },
    { id: "fence-west-b", x: -15, z: 5, length: 6, rotationY: Math.PI / 2 },
    { id: "fence-east-a", x: 15, z: 5, length: 7, rotationY: 0 },
    { id: "fence-east-b", x: 15, z: 0, length: 5, rotationY: Math.PI / 2 },
    { id: "fence-north-west", x: -7, z: -17, length: 6, rotationY: Math.PI / 2 },
    { id: "fence-north-east", x: 7, z: -17, length: 6, rotationY: Math.PI / 2 }
  ];
  fences.forEach((fence) => {
    createFenceSegment({ parent: root, materials, ...fence });
  });

  createSign({ parent: root, materials, x: 3.5, z: 16.5, rotationY: -.2 });
  interactions.push({ id: "entry-sign", type: "sign", position: { x: 3.5, z: 16.5 }, label: "E · Ler a placa", message: "Bosque Luminal — siga o caminho central e respeite os Naturions selvagens." });
  createSign({ parent: root, materials, x: -4.5, z: 5.5, rotationY: .18 });
  interactions.push({ id: "village-sign", type: "sign", position: { x: -4.5, z: 5.5 }, label: "E · Ler a placa", message: "Casas dos pesquisadores · Lago Luminal à esquerda." });

  createTallGrassPatch({ parent: root, materials, x: 15.5, z: 11.5, columns: 5, rows: 4, spacing: 1.15 });
  createTallGrassPatch({ parent: root, materials, x: -16, z: 13, columns: 4, rows: 4, spacing: 1.18 });
  [[-12, 10, 4], [-5, 12, 3], [6, 13, 4], [13, 6, 3], [-22, -1, 4], [-10, -8, 3], [11, -8, 4], [18, -15, 3]].forEach(([x, z, count]) => createFlowerCluster({ parent: root, materials, x, z, count }));

  [[-23, -12, .8], [-8, -7, .65], [14, 17, .7], [20, 5, .75], [-15, -16, .86], [12, -14, .62]].forEach(([x, z, scale]) => {
    createRock({ parent: root, materials, x, z, scale });
  });

  const puzzle = createPuzzleMarker({ parent: root, materials, x: -13, z: -13 });
  interactions.push({ id: "puzzle-space", type: "puzzle", position: { x: -13, z: -13 }, label: "E · Examinar o altar", message: "As runas ainda estão adormecidas. Um puzzle será adicionado aqui futuramente.", focus: bosqueLuminalMap.focusPoints.puzzle });
  engine.addUpdater((delta, elapsed) => {
    puzzle.crystal.rotation.y = Math.floor(elapsed * 6) * .08;
    puzzle.crystal.position.y = 2.1 + Math.round(Math.sin(elapsed * 2.2) * 5) / 32;
  });

  createRootGate({ parent: root, materials, x: 0, z: -20 });
  interactions.push({ id: "root-gate", type: "gate", position: { x: 0, z: -18 }, label: "E · Examinar o portão", message: "O portão está selado. É necessário concluir um desafio ou puzzle para abrir a passagem.", focus: bosqueLuminalMap.focusPoints.gate });

  const futurePath = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 12), materials.path);
  futurePath.rotation.x = -Math.PI / 2;
  futurePath.position.set(0, -.08, -27);
  futurePath.receiveShadow = true;
  root.add(futurePath);

  return {
    root,
    collision,
    interactions,
    materials,
    textures,
    dispose() {
      root.removeFromParent();
      disposeEnvironmentMaterials(materials);
    }
  };
};

export const bosqueLuminalNpcs = Object.freeze([
  { id: "lia-entrada", name: "Lia", role: "story", position: { x: -2.8, z: 16 }, dialogue: "A luz das árvores muda perto do portão. Explore com calma e converse com todos." },
  { id: "tomas-casas", name: "Tomás", role: "resident", position: { x: -2.5, z: 4.5 }, dialogue: "Estas casas pertencem aos pesquisadores. Os interiores ainda estão sendo preparados." },
  { id: "mara-portao", name: "Mara", role: "researcher", position: { x: 5.2, z: -15.2 }, dialogue: "O portão reage às runas do altar lateral. Ainda precisamos compreender o desafio." }
]);

export const bosqueLuminalNaturions = Object.freeze([
  { id: "escaruli-teste", formId: "escaruli", level: 4, behavior: "wander", position: { x: 15, z: 11 }, radius: 3.8, speed: .82, scale: 2.8 },
  {
    id: "zumbel-voador-teste", formId: "zumbel", level: 5, behavior: "patrol", flying: true,
    altitude: 3.4, position: { x: -18, z: -5 }, path: [{ x: -18, z: -5 }, { x: -21, z: -2 }, { x: -17, z: 0 }, { x: -14, z: -4 }],
    speed: 1.25, scale: 2.45
  },
  { id: "failino-teste", formId: "failino", level: 6, behavior: "wander", position: { x: 10, z: -10 }, radius: 3.2, speed: 1.02, scale: 2.9 }
]);
