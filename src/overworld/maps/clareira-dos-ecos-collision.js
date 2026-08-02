import { createArtworkCollisionWorld } from "../collision.js";

// Coordenadas medidas diretamente sobre ground-v1.webp (1536 × 1024).
// Caminhos, gramado e capim permanecem livres; somente elementos visualmente
// sólidos recebem colisão.
export const clareiraDosEcosCollisionLayout = Object.freeze([
  // Mata fechada nas bordas, mantendo livres a entrada inferior e a passagem superior.
  { id: "forest-northwest", kind: "polygon", points: [[0, 0], [690, 0], [690, 70], [620, 92], [520, 88], [430, 112], [340, 104], [245, 130], [150, 118], [75, 165], [0, 168]] },
  { id: "forest-northeast", kind: "polygon", points: [[865, 0], [1536, 0], [1536, 155], [1450, 135], [1380, 165], [1300, 142], [1235, 115], [1110, 118], [1020, 94], [930, 118], [870, 82]] },
  { id: "forest-west", kind: "polygon", points: [[0, 145], [82, 145], [118, 230], [105, 315], [130, 400], [112, 515], [88, 625], [118, 720], [155, 790], [140, 900], [0, 965]] },
  { id: "forest-east", kind: "polygon", points: [[1536, 125], [1450, 120], [1412, 190], [1435, 270], [1395, 345], [1420, 438], [1380, 535], [1425, 650], [1395, 760], [1440, 865], [1392, 950], [1536, 995]] },
  { id: "forest-southwest", kind: "polygon", points: [[0, 885], [150, 850], [250, 875], [350, 910], [455, 950], [585, 930], [690, 980], [700, 1024], [0, 1024]] },
  { id: "forest-southeast", kind: "polygon", points: [[835, 1024], [845, 970], [940, 925], [1040, 915], [1130, 945], [1210, 895], [1325, 900], [1410, 950], [1536, 960], [1536, 1024]] },

  // Água, margens profundas e quedas d'água.
  { id: "water-west", type: "water", kind: "polygon", points: [[340, 300], [430, 292], [505, 330], [535, 405], [493, 455], [530, 515], [500, 590], [430, 622], [350, 596], [325, 530], [352, 472], [310, 405]] },
  { id: "water-west-lower", type: "water", kind: "polygon", points: [[0, 750], [72, 730], [145, 760], [180, 822], [162, 895], [95, 925], [0, 914]] },
  { id: "water-east-upper", type: "water", kind: "polygon", points: [[1380, 120], [1460, 112], [1536, 135], [1536, 350], [1470, 348], [1420, 310], [1392, 250], [1410, 190]] },
  { id: "water-east", type: "water", kind: "polygon", points: [[1390, 450], [1470, 425], [1536, 450], [1536, 705], [1465, 718], [1400, 680], [1375, 600], [1405, 535]] },
  { id: "ruin-pool", type: "water", kind: "polygon", points: [[1100, 650], [1180, 625], [1265, 665], [1300, 740], [1272, 820], [1190, 845], [1105, 810], [1075, 735]] },

  // Cabana abandonada e grandes conjuntos de ruínas.
  { id: "research-cabin", kind: "polygon", points: [[830, 310], [900, 285], [985, 310], [1048, 352], [1045, 455], [990, 492], [855, 470], [815, 410]] },
  { id: "upper-right-ruin", kind: "polygon", points: [[1080, 72], [1265, 58], [1362, 112], [1375, 222], [1328, 274], [1220, 258], [1138, 238], [1070, 185]] },
  { id: "lower-right-ruin", kind: "polygon", points: [[1015, 604], [1110, 575], [1248, 604], [1310, 690], [1300, 835], [1220, 895], [1090, 865], [1015, 805], [982, 700]] },

  // Pilares do círculo de pedra superior esquerdo: o piso central continua acessível.
  { id: "ruin-left-north", kind: "rect", left: 165, top: 60, right: 315, bottom: 104 },
  { id: "ruin-left-west", kind: "rect", left: 72, top: 94, right: 130, bottom: 244 },
  { id: "ruin-left-east", kind: "rect", left: 330, top: 90, right: 392, bottom: 235 },
  { id: "ruin-left-southwest", kind: "ellipse", x: 145, y: 248, radiusX: 34, radiusY: 28 },
  { id: "ruin-left-southeast", kind: "ellipse", x: 330, y: 248, radiusX: 30, radiusY: 20 },

  // Portão superior reservado para a próxima etapa.
  { id: "upper-gate-left", kind: "polygon", points: [[680, 0], [744, 0], [744, 105], [704, 128], [668, 88]] },
  { id: "upper-gate-right", kind: "polygon", points: [[835, 0], [900, 0], [905, 92], [868, 128], [830, 104]] },

  // Árvores, rochedos e ilhas de vegetação sólidas no interior.
  { id: "tree-upper-center", kind: "ellipse", x: 815, y: 235, radiusX: 76, radiusY: 68 },
  { id: "tree-upper-right", kind: "ellipse", x: 965, y: 205, radiusX: 66, radiusY: 58 },
  { id: "tree-middle-right", kind: "ellipse", x: 1090, y: 415, radiusX: 58, radiusY: 54 },
  { id: "tree-lower-center", kind: "ellipse", x: 850, y: 655, radiusX: 86, radiusY: 78 },
  { id: "tree-lower-left", kind: "ellipse", x: 455, y: 785, radiusX: 66, radiusY: 56 },
  { id: "tree-lower-right", kind: "ellipse", x: 940, y: 865, radiusX: 66, radiusY: 52 },
  { id: "rock-center-left", kind: "ellipse", x: 570, y: 395, radiusX: 28, radiusY: 22 },
  { id: "rock-center", kind: "ellipse", x: 750, y: 333, radiusX: 26, radiusY: 20 },
  { id: "rock-center-right", kind: "ellipse", x: 1125, y: 525, radiusX: 28, radiusY: 22 },
  { id: "rock-south-left", kind: "ellipse", x: 585, y: 865, radiusX: 30, radiusY: 22 },
  { id: "rock-south-right", kind: "ellipse", x: 980, y: 925, radiusX: 30, radiusY: 22 },

  // Cercas visíveis próximas à clareira inferior e às margens.
  { id: "fence-lower-left", kind: "polygon", points: [[90, 604], [360, 590], [365, 620], [96, 637]] },
  { id: "fence-pond-left", kind: "polygon", points: [[305, 540], [430, 615], [410, 640], [292, 570]] },
  { id: "fence-pond-right", kind: "polygon", points: [[500, 535], [620, 552], [616, 585], [492, 566]] },
  { id: "fence-east-water", kind: "polygon", points: [[1365, 510], [1460, 475], [1472, 505], [1372, 540]] }
]);

export const createClareiraDosEcosCollision = ({ bounds, artwork }) => (
  createArtworkCollisionWorld({
    bounds,
    artwork,
    obstacles: clareiraDosEcosCollisionLayout
  })
);
