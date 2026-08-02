import { createArtworkCollisionWorld } from "../collision.js";

// Máscara vetorial medida sobre ground-v2.webp (1536 × 1024).
//
// Regra permanente deste mapa:
// - todo chão visível (terra, grama, capim, clareiras, pontes e escadas) é livre;
// - somente água e o núcleo físico de árvores, pedras, construções, muros e
//   cercas bloqueiam;
// - plataformas elevadas só mudam de nível dentro de uma escada desenhada.
//
// Os contornos abaixo são deliberadamente conservadores: eles acompanham a
// base dos objetos, e não a sombra/copa, evitando paredes invisíveis no chão.

const polygon = (id, points, type = "solid") => ({ id, kind: "polygon", points, type });
const ellipse = (id, x, y, radiusX, radiusY, type = "solid") => ({
  id, kind: "ellipse", x, y, radiusX, radiusY, type
});

export const clareiraDosEcosCollisionLayout = Object.freeze([
  // Mata fechada das bordas. O contorno interno segue somente a linha onde o
  // chão deixa de existir; grama visível junto às extremidades continua livre.
  polygon("edge-northwest-forest", [[0, 0], [700, 0], [690, 69], [657, 73], [631, 92], [597, 101], [565, 94], [535, 111], [500, 103], [468, 113], [435, 104], [406, 111], [375, 102], [343, 105], [314, 90], [281, 96], [253, 85], [224, 92], [199, 105], [169, 105], [150, 127], [115, 126], [94, 145], [0, 148]]),
  polygon("edge-northeast-forest", [[838, 0], [1536, 0], [1536, 140], [1500, 138], [1465, 126], [1435, 142], [1400, 129], [1370, 140], [1340, 121], [1305, 120], [1280, 94], [1245, 90], [1210, 96], [1175, 88], [1145, 102], [1110, 98], [1080, 105], [1045, 100], [1015, 110], [985, 104], [950, 114], [920, 99], [892, 109], [864, 90], [842, 84]]),
  polygon("edge-west-forest", [[0, 140], [90, 140], [82, 200], [99, 260], [85, 320], [100, 380], [82, 450], [95, 520], [82, 590], [105, 660], [85, 730], [110, 780], [120, 840], [105, 900], [0, 940]]),
  polygon("edge-east-upper-forest", [[1536, 130], [1490, 135], [1478, 185], [1488, 240], [1465, 290], [1477, 350], [1455, 410], [1470, 460], [1536, 470]]),
  polygon("edge-east-lower-forest", [[1536, 700], [1480, 710], [1460, 770], [1475, 830], [1455, 890], [1425, 950], [1536, 985]]),
  polygon("edge-southwest-forest", [[0, 900], [70, 890], [130, 900], [190, 880], [250, 895], [310, 880], [380, 900], [430, 875], [500, 900], [560, 895], [620, 925], [690, 965], [700, 1024], [0, 1024]]),
  polygon("edge-southeast-forest", [[835, 1024], [850, 970], [900, 930], [950, 905], [1020, 910], [1080, 895], [1140, 920], [1200, 880], [1260, 890], [1320, 910], [1380, 930], [1440, 955], [1536, 970], [1536, 1024]]),

  // Água. Cada ponte fica entre dois polígonos, nunca dentro deles.
  polygon("water-central-upper", [[402, 292], [445, 276], [478, 280], [512, 300], [515, 348], [500, 375], [507, 401], [541, 418], [581, 424], [614, 442], [612, 474], [584, 500], [540, 510], [501, 500], [470, 475], [474, 445], [489, 412], [476, 391], [438, 380], [405, 360], [395, 325]], "water"),
  polygon("water-central-lower", [[515, 568], [548, 553], [590, 556], [628, 563], [668, 574], [695, 591], [690, 620], [665, 646], [620, 653], [580, 646], [545, 630], [520, 605]], "water"),
  polygon("water-southwest-stream", [[0, 754], [60, 744], [95, 760], [137, 780], [169, 820], [161, 860], [129, 900], [80, 920], [0, 914]], "water"),
  polygon("water-east-upper", [[1370, 207], [1400, 190], [1440, 194], [1475, 210], [1510, 230], [1536, 240], [1536, 390], [1495, 380], [1460, 360], [1425, 340], [1385, 310], [1372, 270]], "water"),
  polygon("water-east-middle", [[1450, 500], [1492, 502], [1536, 528], [1536, 608], [1498, 615], [1463, 600], [1435, 566]], "water"),
  polygon("water-east-lower", [[1415, 650], [1450, 637], [1492, 650], [1536, 674], [1536, 708], [1498, 721], [1458, 708], [1428, 687]], "water"),
  polygon("water-arena-pool", [[1090, 630], [1120, 612], [1160, 616], [1200, 638], [1207, 665], [1182, 687], [1135, 690], [1092, 672]], "water"),

  // Construção central.
  polygon("research-cabin", [[850, 327], [920, 286], [1015, 330], [1030, 400], [995, 451], [890, 445], [845, 395]]),

  // Árvores e rochedos internos: colisão apenas na base física. Capim,
  // arbustos baixos, flores e sombras permanecem atravessáveis.
  ellipse("tree-upper-center", 875, 202, 43, 32),
  ellipse("tree-middle-east", 1088, 548, 44, 34),
  polygon("tree-rock-southwest-island", [[350, 778], [394, 742], [458, 731], [515, 758], [538, 806], [515, 850], [459, 876], [398, 852], [356, 819]]),
  polygon("tree-rock-southeast-island", [[1260, 742], [1310, 718], [1367, 735], [1402, 780], [1390, 835], [1342, 866], [1293, 850], [1250, 805]]),
  ellipse("rock-upper-west", 475, 72, 30, 22),
  ellipse("rock-upper-path", 742, 264, 22, 17),
  ellipse("rock-middle-west", 390, 274, 25, 19),
  ellipse("rock-south-path", 806, 846, 22, 16),

  // Santuário oeste. O piso é livre, mas pilares e blocos que ladeiam a
  // escada são sólidos. O corredor dos degraus é recortado separadamente.
  ellipse("west-sanctuary-pillar-01", 126, 170, 15, 24),
  ellipse("west-sanctuary-pillar-02", 160, 112, 14, 22),
  ellipse("west-sanctuary-pillar-03", 221, 89, 14, 19),
  ellipse("west-sanctuary-pillar-04", 286, 96, 15, 21),
  ellipse("west-sanctuary-pillar-05", 347, 128, 15, 22),
  ellipse("west-sanctuary-pillar-06", 381, 181, 14, 22),
  ellipse("west-sanctuary-pillar-07", 343, 229, 16, 18),
  ellipse("west-sanctuary-pillar-08", 282, 253, 15, 17),
  ellipse("west-sanctuary-pillar-09", 207, 254, 16, 17),
  ellipse("west-sanctuary-pillar-10", 148, 224, 16, 20),
  polygon("west-sanctuary-stair-rock-left", [[244, 236], [272, 228], [299, 239], [311, 260], [309, 281], [300, 303], [278, 313], [252, 301], [238, 277]]),
  polygon("west-sanctuary-stair-rock-right", [[323, 198], [354, 198], [380, 217], [389, 241], [381, 264], [362, 282], [341, 279], [326, 261], [317, 237]]),

  // Terraço nordeste. A parede é quebrada exatamente no corredor da escada.
  polygon("terrace-northeast-wall-west", [[1035, 105], [1080, 94], [1110, 122], [1115, 190], [1086, 221], [1047, 203]]),
  polygon("terrace-northeast-wall-north", [[1075, 85], [1150, 62], [1267, 67], [1330, 92], [1316, 126], [1142, 111]]),
  polygon("terrace-northeast-wall-east", [[1302, 94], [1362, 122], [1374, 218], [1332, 267], [1295, 244], [1320, 190]]),
  polygon("terrace-northeast-wall-southeast", [[1190, 216], [1332, 229], [1331, 267], [1230, 260], [1185, 243]]),

  // Arena sudeste. O piso interno é livre; os muros são sólidos e a escada
  // sudoeste é a única troca de altura.
  polygon("arena-southeast-wall-northwest", [[925, 605], [1022, 576], [1088, 598], [1072, 636], [997, 667], [938, 692], [902, 671]]),
  polygon("arena-southeast-wall-north", [[1068, 588], [1190, 580], [1275, 620], [1285, 656], [1232, 677], [1130, 643]]),
  polygon("arena-southeast-wall-east", [[1260, 624], [1313, 687], [1304, 824], [1265, 852], [1243, 781], [1270, 704]]),
  polygon("arena-southeast-wall-south", [[1070, 818], [1216, 812], [1304, 824], [1224, 890], [1088, 862]]),
  polygon("arena-southeast-wall-west-upper", [[902, 670], [942, 676], [978, 719], [967, 748], [924, 733], [892, 700]]),

  // Portão superior e cercas visíveis. Pontes e passagens ficam livres.
  polygon("upper-gate-left", [[682, 0], [744, 0], [744, 93], [707, 118], [676, 84]]),
  polygon("upper-gate-right", [[832, 0], [895, 0], [900, 84], [866, 116], [832, 94]]),
  polygon("fence-west-clearing", [[90, 594], [357, 582], [361, 608], [96, 624]]),
  polygon("fence-central-pond", [[514, 620], [684, 640], [680, 660], [510, 641]]),
  polygon("fence-east-water", [[1390, 570], [1468, 548], [1478, 570], [1400, 595]])
]);

export const clareiraDosEcosTerrainLevels = Object.freeze([
  Object.freeze({
    id: "terrace-northeast",
    level: 1,
    kind: "polygon",
    points: Object.freeze([[1092, 109], [1160, 87], [1262, 90], [1318, 119], [1310, 194], [1260, 224], [1193, 212], [1138, 190], [1094, 168]])
  }),
  Object.freeze({
    id: "arena-southeast",
    level: 1,
    kind: "polygon",
    points: Object.freeze([[958, 650], [1055, 610], [1162, 611], [1255, 653], [1270, 706], [1250, 790], [1198, 826], [1085, 815], [1008, 770], [966, 710]])
  })
]);

export const clareiraDosEcosTerrainTransitions = Object.freeze([
  Object.freeze({
    id: "terrace-northeast-stairs",
    kind: "polygon",
    levels: Object.freeze([0, 1]),
    points: Object.freeze([[1072, 180], [1127, 171], [1150, 201], [1093, 276], [1048, 267], [1035, 232]])
  }),
  Object.freeze({
    id: "arena-southeast-stairs",
    kind: "polygon",
    levels: Object.freeze([0, 1]),
    points: Object.freeze([[920, 730], [986, 714], [1068, 762], [1055, 846], [982, 850], [918, 792]])
  })
]);

// Corredor específico do santuário oeste. Ele só remove as colisões dos dois
// pilares e dos blocos laterais quando o centro do jogador está sobre os
// degraus desenhados; fora desse corredor, as pedras continuam sólidas.
const westSanctuaryStairChannel = Object.freeze({
  id: "west-sanctuary-stair-channel",
  kind: "polygon",
  clearIds: Object.freeze([
    "west-sanctuary-pillar-07",
    "west-sanctuary-pillar-08",
    "west-sanctuary-stair-rock-left",
    "west-sanctuary-stair-rock-right"
  ]),
  points: Object.freeze([[269, 218], [286, 245], [303, 267], [320, 289], [343, 323], [373, 330], [389, 298], [354, 271], [337, 250], [305, 210]])
});

// Corredores atravessáveis desenhados sobre elementos que visualmente ficam
// acima de água/muro. Eles funcionam como recortes sem apagar a colisão do
// restante do lago ou da parede.
export const clareiraDosEcosWalkableChannels = Object.freeze([
  Object.freeze({
    id: "central-water-bridge",
    kind: "polygon",
    clearPrefixes: Object.freeze(["water-central-"]),
    points: Object.freeze([[478, 510], [500, 485], [600, 490], [625, 515], [610, 545], [590, 555], [500, 560], [480, 540]])
  }),
  Object.freeze({
    id: "east-water-bridge",
    kind: "polygon",
    clearPrefixes: Object.freeze(["water-east-", "fence-east-water"]),
    points: Object.freeze([[1368, 574], [1410, 558], [1510, 612], [1498, 654], [1448, 642], [1387, 609]])
  }),
  Object.freeze({
    id: "terrace-northeast-stair-channel",
    kind: "polygon",
    clearPrefixes: Object.freeze(["terrace-northeast-wall-"]),
    points: Object.freeze([[1066, 174], [1132, 164], [1158, 200], [1099, 284], [1040, 275], [1028, 230]])
  }),
  Object.freeze({
    id: "arena-southeast-stair-channel",
    kind: "polygon",
    clearPrefixes: Object.freeze(["arena-southeast-wall-"]),
    points: Object.freeze([[908, 716], [988, 704], [1078, 758], [1064, 855], [973, 860], [906, 797]])
  })
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

const channelClearsShape = (channel, shapeId) => {
  if (!channel) return false;
  if (channel.clearIds?.includes(shapeId)) return true;
  return Boolean(channel.clearPrefixes?.some((prefix) => shapeId.startsWith(prefix)));
};

export const createClareiraDosEcosCollision = ({ bounds, artwork }) => {
  const world = createArtworkCollisionWorld({
    bounds,
    artwork,
    obstacles: clareiraDosEcosCollisionLayout
  });
  const collisionChannelAt = (x, z) => {
    const point = worldToArtwork(x, z, bounds, artwork);
    if (terrainContains(westSanctuaryStairChannel, point.x, point.y)) return westSanctuaryStairChannel;
    return clareiraDosEcosWalkableChannels.find((item) => terrainContains(item, point.x, point.y)) || null;
  };
  world.collides = (x, z, radius = 0.5, { ignore = null } = {}) => {
    if (!world.insideBounds(x, z, radius)) return true;
    const channel = collisionChannelAt(x, z);
    return world.shapes.some((shape) => {
      if (shape === ignore) return false;
      if (channelClearsShape(channel, shape.id)) return false;
      return world.intersectsShape(shape, x, z, radius);
    });
  };
  world.walkableChannelAt = collisionChannelAt;
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
