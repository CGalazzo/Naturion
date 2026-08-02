import { createArtworkCollisionWorld } from "../collision.js";

// Coordenadas medidas diretamente sobre ground-v2.webp (1536 × 1024).
// Regra permanente da Clareira:
// - caminho, gramado, clareira, ponte, escada e piso de ruína são navegáveis;
// - água, árvores, pedras, casas, paredes, cercas e o limite florestal bloqueiam;
// - plataformas altas só se conectam ao nível baixo pelas escadas desenhadas.

const polygon = (id, points, type = "solid") => ({ id, kind: "polygon", points, type });
const ellipse = (id, x, y, radiusX, radiusY, type = "solid") => ({
  id, kind: "ellipse", x, y, radiusX, radiusY, type
});

export const clareiraDosEcosCollisionLayout = Object.freeze([
  // Floresta fechada nas extremidades. Os contornos acompanham as copas e
  // rochedos visíveis, deixando as entradas e todo chão aparente livres.
  polygon("edge-northwest-forest", [[0, 0], [690, 0], [690, 58], [650, 68], [612, 65], [578, 92], [530, 82], [492, 108], [452, 101], [416, 124], [382, 105], [342, 119], [314, 91], [276, 96], [242, 76], [205, 84], [176, 109], [137, 101], [108, 134], [82, 154], [0, 171]]),
  polygon("edge-northeast-forest", [[842, 0], [1536, 0], [1536, 170], [1490, 159], [1462, 138], [1420, 145], [1384, 120], [1352, 112], [1335, 78], [1284, 70], [1240, 78], [1196, 64], [1152, 75], [1110, 68], [1065, 94], [1026, 83], [990, 105], [946, 91], [910, 104], [878, 79], [842, 67]]),
  polygon("edge-west-forest", [[0, 145], [72, 145], [101, 190], [91, 245], [112, 302], [91, 360], [110, 425], [92, 488], [111, 548], [96, 612], [118, 674], [96, 726], [54, 746], [0, 742]]),
  polygon("edge-east-upper-forest", [[1536, 140], [1486, 146], [1461, 188], [1472, 236], [1448, 282], [1466, 334], [1438, 383], [1454, 432], [1427, 482], [1452, 520], [1536, 520]]),
  polygon("edge-east-lower-forest", [[1536, 704], [1468, 704], [1440, 748], [1457, 797], [1432, 846], [1450, 899], [1418, 944], [1375, 973], [1536, 1000]]),
  polygon("edge-southwest-forest", [[0, 888], [63, 872], [116, 876], [168, 850], [218, 867], [265, 847], [318, 874], [370, 865], [421, 898], [475, 890], [525, 920], [590, 914], [653, 955], [683, 1024], [0, 1024]]),
  polygon("edge-southeast-forest", [[852, 1024], [876, 968], [928, 939], [980, 947], [1030, 915], [1081, 928], [1132, 902], [1180, 917], [1234, 886], [1290, 900], [1345, 925], [1398, 952], [1450, 961], [1536, 978], [1536, 1024]]),

  // Água e quedas. As pontes são aberturas deliberadas entre os polígonos.
  polygon("water-west-upper", [[338, 292], [430, 288], [507, 326], [538, 401], [496, 456], [510, 497], [476, 518], [423, 501], [350, 501], [323, 457], [308, 403]], "water"),
  polygon("water-west-lower", [[348, 548], [420, 532], [478, 568], [501, 592], [432, 625], [347, 598], [322, 558]], "water"),
  polygon("water-west-edge-lower", [[0, 748], [73, 727], [147, 758], [181, 823], [162, 897], [96, 928], [0, 916]], "water"),
  polygon("water-east-falls-upper", [[1377, 118], [1462, 110], [1536, 133], [1536, 352], [1470, 351], [1418, 311], [1390, 249], [1407, 188]], "water"),
  polygon("water-east-upper", [[1387, 447], [1471, 423], [1536, 448], [1536, 562], [1474, 578], [1432, 556], [1392, 519]], "water"),
  polygon("water-east-lower", [[1411, 627], [1471, 612], [1536, 637], [1536, 708], [1464, 721], [1397, 681], [1387, 648]], "water"),
  ellipse("ruin-puddle-west", 1132, 646, 19, 11, "water"),
  ellipse("ruin-puddle-east", 1182, 663, 27, 14, "water"),

  // Construção e árvores isoladas dentro das áreas abertas.
  polygon("research-cabin", [[861, 329], [920, 298], [1013, 334], [1025, 407], [988, 447], [884, 437], [856, 390]]),
  ellipse("tree-upper-center-left", 603, 169, 43, 38),
  ellipse("tree-upper-center", 698, 253, 42, 34),
  ellipse("tree-upper-center-right", 866, 236, 48, 44),
  ellipse("tree-middle-right", 1120, 502, 54, 48),
  ellipse("tree-lower-center", 849, 648, 58, 51),
  ellipse("tree-lower-left", 439, 744, 61, 52),
  ellipse("tree-lower-right", 944, 858, 57, 47),
  ellipse("tree-left-middle", 177, 356, 47, 43),
  ellipse("tree-right-middle", 1378, 418, 43, 42),

  // Rochas realmente volumosas no interior. Pedrinhas decorativas não criam
  // colisões isoladas no gramado.
  polygon("rock-upper-mid", [[448, 44], [485, 23], [529, 31], [552, 65], [534, 96], [480, 100], [447, 78]]),
  polygon("rock-center-small", [[724, 260], [758, 250], [782, 269], [774, 293], [737, 298], [716, 281]]),
  polygon("rock-water-west", [[389, 246], [445, 244], [478, 276], [462, 311], [412, 313], [382, 286]]),
  polygon("rock-lower-mid", [[777, 846], [814, 838], [837, 860], [825, 885], [786, 890], [766, 870]]),

  // Santuário superior esquerdo: pilares bloqueiam, piso e acesso sudeste não.
  { id: "ruin-left-north", kind: "rect", left: 164, top: 58, right: 316, bottom: 101 },
  { id: "ruin-left-west", kind: "rect", left: 69, top: 92, right: 128, bottom: 245 },
  { id: "ruin-left-east", kind: "rect", left: 331, top: 88, right: 394, bottom: 222 },
  ellipse("ruin-left-southwest", 144, 248, 35, 28),
  ellipse("ruin-left-southeast", 331, 247, 30, 20),

  // Terraço superior direito. O muro é dividido ao redor da escada.
  polygon("upper-right-ruin-west", [[1068, 71], [1135, 70], [1135, 178], [1110, 207], [1066, 184]]),
  polygon("upper-right-ruin-north", [[1132, 57], [1267, 56], [1328, 79], [1313, 117], [1143, 112]]),
  polygon("upper-right-ruin-east", [[1300, 79], [1364, 110], [1377, 222], [1330, 276], [1285, 246], [1320, 189]]),
  polygon("upper-right-ruin-south-east", [[1197, 216], [1331, 229], [1330, 277], [1221, 259], [1190, 244]]),
  polygon("upper-right-ruin-stair-left", [[1071, 180], [1126, 196], [1138, 221], [1114, 238], [1078, 220]]),

  // Arena inferior direita. O piso é navegável; paredes não podem ser
  // atravessadas e a passagem sudoeste funciona como transição de nível.
  polygon("lower-right-ruin-northwest", [[1012, 603], [1108, 572], [1132, 619], [1066, 665], [1014, 700], [979, 698]]),
  polygon("lower-right-ruin-north", [[1106, 573], [1250, 602], [1283, 639], [1236, 671], [1119, 641]]),
  polygon("lower-right-ruin-east", [[1247, 602], [1313, 689], [1303, 837], [1260, 858], [1243, 780], [1270, 700]]),
  polygon("lower-right-ruin-south", [[1087, 826], [1220, 819], [1303, 837], [1222, 898], [1092, 867]]),
  polygon("lower-right-ruin-west-upper", [[980, 699], [1016, 696], [1036, 743], [1010, 770], [976, 752]]),

  // Portão e cercas.
  polygon("upper-gate-left", [[678, 0], [744, 0], [744, 104], [704, 129], [666, 87]]),
  polygon("upper-gate-right", [[835, 0], [902, 0], [907, 92], [868, 130], [829, 104]]),
  polygon("fence-lower-left", [[88, 602], [361, 587], [367, 621], [95, 640]]),
  polygon("fence-pond-left", [[303, 537], [431, 614], [411, 642], [289, 570]]),
  polygon("fence-east-water", [[1363, 508], [1462, 472], [1475, 507], [1370, 543]])
]);

// As áreas elevadas são semânticas: a arte já contém a perspectiva e por isso
// o sprite não é deslocado verticalmente. O nível serve para impedir atalhos
// através dos muros e aceitar a troca apenas nas escadas.
export const clareiraDosEcosTerrainLevels = Object.freeze([
  Object.freeze({
    id: "terrace-northeast",
    level: 1,
    kind: "polygon",
    points: Object.freeze([[1112, 105], [1268, 91], [1323, 119], [1316, 204], [1264, 229], [1195, 219], [1140, 194], [1087, 178]])
  }),
  Object.freeze({
    id: "arena-southeast",
    level: 1,
    kind: "polygon",
    points: Object.freeze([[1040, 650], [1120, 616], [1228, 636], [1270, 690], [1260, 797], [1208, 841], [1090, 829], [1017, 772], [1010, 705]])
  })
]);

export const clareiraDosEcosTerrainTransitions = Object.freeze([
  Object.freeze({ id: "terrace-northeast-stairs", kind: "polygon", levels: Object.freeze([0, 1]), points: Object.freeze([[1123, 190], [1183, 187], [1212, 226], [1182, 278], [1126, 254], [1106, 219]]) }),
  Object.freeze({ id: "arena-southeast-stairs", kind: "polygon", levels: Object.freeze([0, 1]), points: Object.freeze([[974, 739], [1026, 724], [1086, 769], [1062, 829], [1004, 823], [969, 784]]) })
]);

const pointInPolygon = (x, y, points) => {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index];
    const last = points[previous];
    const crosses = ((current[1] > y) !== (last[1] > y))
      && (x < ((last[0] - current[0]) * (y - current[1])) / ((last[1] - current[1]) || Number.EPSILON) + current[0]);
    if (crosses) inside = !inside;
  }
  return inside;
};

const terrainContains = (terrain, x, y) => terrain.kind === "polygon" && pointInPolygon(x, y, terrain.points);

const worldToArtwork = (x, z, bounds, artwork) => ({
  x: ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * artwork.width,
  y: ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * artwork.height
});

const terrainAt = (x, z, bounds, artwork) => {
  const point = worldToArtwork(x, z, bounds, artwork);
  const transition = clareiraDosEcosTerrainTransitions.find((item) => terrainContains(item, point.x, point.y));
  if (transition) return { kind: "transition", id: transition.id, levels: transition.levels };
  const region = clareiraDosEcosTerrainLevels.find((item) => terrainContains(item, point.x, point.y));
  return region
    ? { kind: "surface", id: region.id, level: region.level }
    : { kind: "surface", id: "ground", level: 0 };
};

export const createClareiraDosEcosCollision = ({ bounds, artwork }) => {
  const world = createArtworkCollisionWorld({
    bounds,
    artwork,
    obstacles: clareiraDosEcosCollisionLayout
  });
  world.terrainAt = (x, z) => terrainAt(x, z, bounds, artwork);
  world.terrainLevelAt = (x, z) => {
    const terrain = world.terrainAt(x, z);
    return terrain.kind === "surface" ? terrain.level : null;
  };
  world.canTraverse = (fromX, fromZ, toX, toZ, radius = 0.5) => {
    if (world.collides(toX, toZ, radius)) return false;
    const from = world.terrainAt(fromX, fromZ);
    const to = world.terrainAt(toX, toZ);
    if (from.kind === "transition" && to.kind === "transition") {
      return from.levels.some((level) => to.levels.includes(level));
    }
    if (from.kind === "transition") return from.levels.includes(to.level);
    if (to.kind === "transition") return to.levels.includes(from.level);
    return from.level === to.level;
  };
  return world;
};
