import { createArtworkCollisionWorld } from "../collision.js";

export const bosqueLuminalCollisionLayout = Object.freeze([
  // Construções e portão, desenhados diretamente sobre a arte 1536 × 1024.
  { id: "root-gate", type: "gate", kind: "polygon", points: [[590, 0], [950, 0], [950, 166], [895, 208], [640, 208], [590, 160]] },
  { id: "house-west", kind: "polygon", points: [[272, 150], [395, 105], [520, 128], [655, 273], [654, 455], [592, 488], [365, 490], [275, 426]] },
  { id: "house-east", kind: "polygon", points: [[979, 330], [1095, 265], [1237, 292], [1384, 390], [1385, 575], [1295, 625], [1048, 590], [978, 515]] },

  // Água e massas densas de árvores nas bordas. Os caminhos e todo o mato
  // central permanecem livres para exploração.
  { id: "pond", type: "water", kind: "polygon", points: [[1132, 520], [1290, 500], [1450, 520], [1536, 570], [1536, 875], [1400, 855], [1280, 790], [1180, 715], [1085, 635]] },
  { id: "forest-northwest", kind: "polygon", points: [[0, 0], [598, 0], [585, 150], [520, 190], [400, 170], [310, 230], [280, 360], [220, 430], [0, 410]] },
  { id: "forest-northeast", kind: "polygon", points: [[945, 0], [1536, 0], [1536, 465], [1400, 450], [1370, 350], [1240, 290], [1050, 320], [970, 260]] },
  { id: "forest-west-middle", kind: "polygon", points: [[0, 390], [245, 390], [275, 470], [235, 560], [180, 665], [0, 735]] },
  { id: "forest-southwest", kind: "polygon", points: [[0, 700], [145, 700], [190, 760], [260, 810], [330, 880], [365, 1024], [0, 1024]] },
  { id: "forest-southeast", kind: "polygon", points: [[900, 1024], [970, 870], [1080, 820], [1200, 760], [1536, 820], [1536, 1024]] },

  // Cercas visíveis.
  { id: "fence-west-lower-a", kind: "polygon", points: [[118, 645], [255, 608], [270, 636], [136, 680]] },
  { id: "fence-west-lower-b", kind: "polygon", points: [[285, 574], [430, 535], [442, 565], [300, 605]] },
  { id: "fence-west-house", kind: "polygon", points: [[548, 450], [680, 430], [686, 465], [565, 490]] },
  { id: "fence-east-house", kind: "polygon", points: [[944, 418], [1012, 394], [1022, 427], [954, 456]] },
  { id: "fence-pond-west", kind: "polygon", points: [[1034, 560], [1132, 600], [1120, 632], [1024, 594]] },
  { id: "fence-pond-south", kind: "polygon", points: [[1112, 610], [1225, 682], [1205, 710], [1098, 642]] },
  { id: "fence-east-border", kind: "polygon", points: [[1372, 445], [1536, 470], [1536, 506], [1368, 480]] },

  // Pedras e bases de árvores isoladas dentro da área explorável.
  { id: "rock-west-1", kind: "ellipse", x: 205, y: 382, radiusX: 24, radiusY: 25 },
  { id: "rock-west-2", kind: "ellipse", x: 298, y: 520, radiusX: 25, radiusY: 19 },
  { id: "rock-west-3", kind: "ellipse", x: 365, y: 543, radiusX: 25, radiusY: 20 },
  { id: "rock-west-4", kind: "ellipse", x: 438, y: 565, radiusX: 23, radiusY: 17 },
  { id: "rock-center-1", kind: "ellipse", x: 650, y: 515, radiusX: 18, radiusY: 13 },
  { id: "rock-east-1", kind: "ellipse", x: 1042, y: 565, radiusX: 20, radiusY: 16 },
  { id: "rock-east-2", kind: "ellipse", x: 1087, y: 600, radiusX: 18, radiusY: 15 },
  { id: "rock-pond-1", kind: "ellipse", x: 1210, y: 625, radiusX: 24, radiusY: 17 },
  { id: "rock-pond-2", kind: "ellipse", x: 1265, y: 640, radiusX: 29, radiusY: 18 },
  { id: "rock-pond-3", kind: "ellipse", x: 1374, y: 587, radiusX: 26, radiusY: 19 },
  { id: "rock-pond-4", kind: "ellipse", x: 1450, y: 620, radiusX: 32, radiusY: 22 },
  { id: "rock-southwest-1", kind: "ellipse", x: 300, y: 833, radiusX: 24, radiusY: 18 },
  { id: "rock-southwest-2", kind: "ellipse", x: 350, y: 826, radiusX: 27, radiusY: 19 },
  { id: "rock-southwest-3", kind: "ellipse", x: 440, y: 910, radiusX: 25, radiusY: 19 },
  { id: "tree-center-south", kind: "ellipse", x: 590, y: 950, radiusX: 34, radiusY: 28 },
  { id: "tree-east-south", kind: "ellipse", x: 1420, y: 805, radiusX: 38, radiusY: 29 },
  { id: "tree-east-edge", kind: "ellipse", x: 1470, y: 930, radiusX: 34, radiusY: 28 }
]);

export const createBosqueLuminalCollision = ({ bounds, artwork }) => (
  createArtworkCollisionWorld({
    bounds,
    artwork,
    obstacles: bosqueLuminalCollisionLayout
  })
);
