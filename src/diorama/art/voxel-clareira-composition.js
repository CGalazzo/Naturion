import { THREE } from "../engine.js";
import { createDioramaMaterials } from "./voxel-material-library.js";
import { buildDefinitiveTerrain, createDefinitivePath, createDefinitiveWater, createRampBlocks } from "./voxel-world-kit.js";
import {
  createFallenLog,
  createFern,
  createFlower,
  createGrassTuft,
  createLeafPile,
  createMushroom,
  createPixelShrub,
  createPixelTree,
  createStump,
  installVegetationWind
} from "./voxel-nature-kit.js";
import {
  createCrystalCluster,
  createNaturalFence,
  createRockCluster,
  createSmallStoneGroup,
  createTotem
} from "./voxel-prop-kit.js";
import {
  createExitArch,
  createNaturalArena,
  createPuzzleAltar,
  createRootGate,
  createWoodBridge
} from "./voxel-structure-kit.js";
import { createVoxelAtmosphere, createVoxelBackground } from "./voxel-scene-effects.js";

const PATHS = [
  { seed: 1, width: 3.5, points: [[-28, -20], [-21, -20], [-14, -18], [-10, -11], [-8, -2], [-5, 1], [1, 1.2], [6.5, 3.2], [10.4, 7.3]] },
  { seed: 2, width: 3.1, points: [[-8, 1], [-8.8, 6], [-12, 10.5], [-18.5, 13.5], [-24, 16]] },
  { seed: 3, width: 3.2, points: [[1, 1], [7, -1.1], [13, -1.2], [19, 1]] },
  { seed: 4, width: 2.75, points: [[-4, -17], [1.5, -15.7], [7.2, -15]] },
  { seed: 5, width: 3.15, points: [[14, 10.5], [19, 12], [22, 14], [25, 17.5], [27, 20]] }
];

const TREE_AREAS = {
  entrance: [
    [-31, -23, 1.08, "ancient", 0.2], [-30, -15, 0.92, "common", 1.1], [-22, -26, 0.82, "young", 0.5],
    [-17, -23, 0.96, "common", 2.2], [-4, -23, 1.12, "ancient", 1.8]
  ],
  lake: [
    [-16, -5, 0.92, "common", 0.8], [-19, -1, 1.02, "common", 2.9], [-28.5, 7, 0.86, "young", 1.4],
    [-30, 13, 1.08, "ancient", 0.1], [-18, 20, 1.02, "common", 2.4], [-8, 17.5, 0.88, "young", 1]
  ],
  central: [
    [-2, 9, 1, "common", 2.7], [3, -6, 0.9, "common", 0.35], [8, -7, 1.08, "ancient", 1.5],
    [14, -4.2, 0.86, "young", 0.75]
  ],
  arena: [[28, -2, 1.02, "common", 2.6], [31, 7, 1.12, "ancient", 0.6]],
  upper: [
    [31, 15, 0.9, "common", 1.8], [20, 21, 0.86, "young", 2.2], [32, 24, 1.12, "ancient", 0.15],
    [8, 18.5, 0.96, "common", 2.9], [16, 20, 0.78, "young", 1.2], [-34, -2, 1.05, "ancient", 0.4], [34, -14, 1.05, "common", 2.1]
  ]
};

const ROCKS = [
  [-20, -18, 0.9, 0.2, true], [-10, -8, 0.75, 1.1, false], [-3, 4, 0.7, 2.4, true],
  [6, 3, 0.82, 1.6, true], [12, 5.2, 0.72, 0.5, true], [17, 16, 0.8, 2.2, false],
  [25, 12, 0.9, 0.9, true], [-21, 14, 0.8, 2.7, true], [-11, 12, 0.68, 1.8, false],
  [13, -15, 0.78, 0.15, true], [29, 18, 0.65, 1.3, true], [-26, 6, 0.58, 2.4, true]
];

const SHRUBS = [
  [-29, -18, 0.8, "normal"], [-24, -12, 0.9, "light"], [-16, 3, 0.85, "ancient"], [-26, 11, 0.95, "light"],
  [-16, 17, 0.8, "normal"], [-5, 8, 0.82, "light"], [4, 5, 0.85, "normal"], [12, -5, 0.82, "ancient"],
  [22, -3, 0.9, "light"], [25, 9, 0.78, "normal"], [22, 19, 0.88, "light"], [31, 20, 0.9, "ancient"]
];

const GRASS = [
  [-29, -22, true], [-25, -24, false], [-20, -22, false], [-16, -20, true], [-13, -15, false], [-11, -5, false],
  [-12, 1, true], [-14, 5, false], [-27, 2, true], [-28, 5, false], [-25, 8, true], [-22, 9, false],
  [-19, 8, false], [-17, 6, true], [-15, 11, false], [-18, 16, true], [-24, 19, false], [-29, 16, true],
  [-11, 16, false], [-7, 13, true], [-5, 7, false], [0, 5, false], [4, -3, true], [9, -4, false],
  [13, 1, false], [16, -3, true], [22, -4, false], [24, 4, true], [17, 8, false], [20, 10, true],
  [24, 14, false], [29, 14, true], [31, 20, false], [27, 24, true], [22, 22, false], [12, 18, true],
  [7, 17, false], [4, -14, true], [0, -18, false], [15, -17, true]
];

const FERNS = [[-28, 1], [-25, 7], [-20, 9], [-16, 7], [-17, 15], [-10, 15], [3, 6], [7, 7], [16, 7], [22, 8], [24, 17], [30, 18]];
const FLOWERS = [[-27, -18, 0xffd06c], [-23, -17, 0x8fe8ca], [-7, -3, 0xd6a1ff], [-4, 5, 0xffc570], [-22, 17, 0x8ee6c1], [-14, 14, 0xffcf6f], [17, 4, 0xe1a1ff], [23, 3, 0x8ee6c1], [24, 20, 0xffd06c], [29, 18, 0xb4e985]];
const MUSHROOMS = [[-30, -22, 0xe98664], [-17, -4, 0xf2bd5d], [-29, 12, 0xd67fd6], [-19, 19, 0xe98664], [7, -6, 0xf2bd5d], [31, 7, 0xd67fd6]];
const LEAVES = [[-17, -18, 0xa7773c], [-9, -2, 0xb98646], [-12, 10, 0x8f6737], [5, 2, 0xa7773c], [14, 11, 0x8d713e], [23, 16, 0xb98646], [11, -14, 0x8f6737]];

export const buildDefinitiveVoxelClareira = ({ scene, engine, stage }) => {
  stage.obstacles.length = 0;
  const materials = createDioramaMaterials();
  const root = new THREE.Group();
  root.name = "ClareiraDosEcosDefinitiveVoxelArt";
  scene.add(root);

  createVoxelBackground({ scene, materials });
  buildDefinitiveTerrain({ root, stage, materials });
  createDefinitiveWater({ parent: root, engine, materials, x: -22, z: 3, scaleX: 0.88, scaleZ: 0.82 });
  PATHS.forEach((path) => createDefinitivePath({ parent: root, stage, materials, ...path }));
  createRampBlocks({ parent: root, stage, materials, from: { x: 10.4, z: 6 }, to: { x: 13.2, z: 10.1 }, width: 3.1, steps: 9 });
  createRampBlocks({ parent: root, stage, materials, from: { x: 22, z: 14.2 }, to: { x: 26, z: 19.2 }, width: 3, steps: 10 });
  createRampBlocks({ parent: root, stage, materials, from: { x: -10.5, z: 9 }, to: { x: -9, z: 13 }, width: 2.7, steps: 8 });

  createTotem({ parent: root, stage, materials, x: -30, z: -21.8, variant: "entry", rotation: 0.12, scale: 1 });
  createTotem({ parent: root, stage, materials, x: -23.5, z: -24.5, variant: "luminal", rotation: -0.16, scale: 0.96 });

  Object.values(TREE_AREAS).flat().forEach(([x, z, scale, variant, rotation]) => createPixelTree({ parent: root, stage, engine, materials, x, z, scale, variant, rotation }));
  createPixelTree({ parent: root, stage, engine, materials, x: -1, z: 2.5, scale: 1.05, variant: "luminal", rotation: 0.6, obstacle: false });
  createPixelTree({ parent: root, stage, engine, materials, x: 16.2, z: 7.4, scale: 0.92, variant: "luminal", rotation: 2.1, obstacle: false });
  createPixelTree({ parent: root, stage, engine, materials, x: 31.8, z: 21.8, scale: 1.04, variant: "luminal", rotation: 1.2, obstacle: false });

  ROCKS.forEach(([x, z, scale, rotation, moss], index) => createRockCluster({ parent: root, stage, materials, x, z, scale, rotation, moss, variant: index % 3 }));
  SHRUBS.forEach(([x, z, scale, tint]) => createPixelShrub({ parent: root, stage, materials, x, z, scale, tint }));

  const windObjects = [];
  GRASS.forEach(([x, z, tall], index) => {
    if (!stage.collides(x, z, 0.15)) createGrassTuft({ parent: root, stage, materials, x, z, scale: 0.72 + (index % 4) * 0.08, windObjects, tall });
  });
  FERNS.forEach(([x, z], index) => createFern({ parent: root, stage, materials, x, z, scale: 0.72 + (index % 3) * 0.1, windObjects, variant: index % 2 }));
  FLOWERS.forEach(([x, z, color], index) => createFlower({ parent: root, stage, materials, x, z, scale: 0.72 + (index % 2) * 0.15, color }));
  MUSHROOMS.forEach(([x, z, color], index) => {
    createMushroom({ parent: root, stage, materials, x: x + 0.5, z: z + 0.4, scale: 0.8 + index % 2 * 0.14, color });
    createMushroom({ parent: root, stage, materials, x: x + 0.86, z: z + 0.18, scale: 0.55, color });
  });
  LEAVES.forEach(([x, z, color], index) => createLeafPile({ parent: root, stage, materials, x, z, color, rotation: index * 0.72 }));

  [
    [-27.5, -14.5, 1.1, 0], [-23.8, 8.5, 0.9, 1], [-13.5, 6.5, 0.85, 2],
    [3.5, 4.8, 0.8, 0], [18.5, 8.2, 1, 1], [26, 16.2, 0.9, 2]
  ].forEach(([x, z, scale, variant]) => createSmallStoneGroup({ parent: root, stage, materials, x, z, scale, variant }));
  createFallenLog({ parent: root, stage, materials, x: -24.5, z: 12.5, length: 3.8, rotation: 0.45, broken: true });
  createFallenLog({ parent: root, stage, materials, x: 14.5, z: -6.2, length: 3.4, rotation: 1.15, broken: false });
  createStump({ parent: root, stage, materials, x: -12.8, z: 16.5, scale: 0.9 });
  createStump({ parent: root, stage, materials, x: 23.5, z: 8.2, scale: 0.75 });
  createNaturalFence({ parent: root, stage, materials, x: -28.5, z: -18.3, length: 3.6, rotation: 0.55, broken: true });
  createNaturalFence({ parent: root, stage, materials, x: 24.5, z: 15.5, length: 3.2, rotation: 1.1, broken: false });

  createRootGate({ parent: root, stage, engine, materials, x: 11.5, z: 8.8 });
  createWoodBridge({ parent: root, stage, materials, x: 9, z: -15, length: 8.2, width: 2.7, blocked: true });
  createPuzzleAltar({ parent: root, stage, engine, materials, x: 10, z: 5 });
  createNaturalArena({ parent: root, stage, materials, x: 19, z: 1, windObjects });
  createExitArch({ parent: root, stage, engine, materials, x: 28, z: 22 });

  [[24.5, 22.5, 0.5], [30.7, 21, 0.52], [9.1, 9.8, 0.36], [13.9, 9.7, 0.36]].forEach(([x, z, scale]) => createCrystalCluster({ parent: root, stage, engine, materials, x, z, scale }));
  createVoxelAtmosphere({ scene, engine, materials });
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
