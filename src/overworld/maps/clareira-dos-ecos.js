import { buildArtworkScene, createArtworkWorldSize, ARTWORK_DEPTH_PROJECTION } from "../artwork-scene.js?v=2";
import { createClareiraDosEcosCollision } from "./clareira-dos-ecos-collision.js?v=6";
export { clareiraDosEcosNaturions } from "./clareira-dos-ecos-content.js?v=1";

const SOURCE_WIDTH = 1536;
const SOURCE_HEIGHT = 1024;
const WORLD_DEPTH = 86;

export const CLAREIRA_DOS_ECOS_WORLD_SIZE = createArtworkWorldSize({
  sourceWidth: SOURCE_WIDTH,
  sourceHeight: SOURCE_HEIGHT,
  worldDepth: WORLD_DEPTH
});

const bounds = Object.freeze({
  minX: -(CLAREIRA_DOS_ECOS_WORLD_SIZE.width / 2),
  maxX: CLAREIRA_DOS_ECOS_WORLD_SIZE.width / 2,
  minZ: -(WORLD_DEPTH / 2),
  maxZ: WORLD_DEPTH / 2
});

// Corredores visuais de chão que sempre prevalecem sobre máscaras conservadoras.
// A regra é simples: onde a arte mostra uma trilha contínua, o jogador passa.
const WALKABLE_PATH_OVERRIDES = Object.freeze([
  Object.freeze({
    id: "central-upper-shore-path",
    clearIds: Object.freeze(["water-central-upper"]),
    points: Object.freeze([
      [392, 248],
      [430, 238],
      [477, 242],
      [520, 257],
      [524, 279],
      [494, 294],
      [451, 297],
      [414, 307],
      [388, 293]
    ])
  }),
  Object.freeze({
    id: "west-sanctuary-full-access-path",
    forceWalkable: true,
    // Corredor medido sobre o caminho visível da captura: começa na saída dos
    // degraus do santuário oeste e termina já dentro da trilha principal.
    // Dentro desta faixa não existe colisão invisível de água, pedras, pilares
    // ou mudança de nível. Fora dela, todas as colisões normais permanecem.
    points: Object.freeze([
      [289, 278],
      [299, 307],
      [321, 332],
      [349, 351],
      [385, 363],
      [424, 373],
      [436, 327],
      [399, 317],
      [371, 307],
      [353, 296],
      [341, 283],
      [335, 262],
      [314, 211],
      [270, 229]
    ])
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

const worldToArtwork = (x, z) => ({
  x: ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * SOURCE_WIDTH,
  y: ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * SOURCE_HEIGHT
});

const pathOverrideAt = (x, z) => {
  const artworkPoint = worldToArtwork(x, z);
  return WALKABLE_PATH_OVERRIDES.find((item) => (
    pointInPolygon(artworkPoint.x, artworkPoint.y, item.points)
  )) || null;
};

const applyWalkablePathOverrides = (collision) => {
  const baseCollides = collision.collides.bind(collision);
  const baseCanTraverse = collision.canTraverse?.bind(collision);

  collision.collides = (x, z, radius = 0.5, { ignore = null } = {}) => {
    const channel = pathOverrideAt(x, z);
    if (!channel) return baseCollides(x, z, radius, { ignore });
    if (!collision.insideBounds(x, z, radius)) return true;

    // Este é o ponto que faltava nas tentativas anteriores: o caminho do
    // santuário é caminhável por definição, sem depender do id do obstáculo
    // invisível que por acaso esteja avançando sobre a arte.
    if (channel.forceWalkable) return false;

    return collision.shapes.some((shape) => {
      if (shape === ignore) return false;
      if (channel.clearIds?.includes(shape.id)) return false;
      return collision.intersectsShape(shape, x, z, radius);
    });
  };

  collision.canTraverse = (fromX, fromZ, toX, toZ, radius = 0.5) => {
    const targetChannel = pathOverrideAt(toX, toZ);
    if (targetChannel?.forceWalkable) {
      return collision.insideBounds(toX, toZ, radius);
    }
    return baseCanTraverse
      ? baseCanTraverse(fromX, fromZ, toX, toZ, radius)
      : !collision.collides(toX, toZ, radius);
  };

  collision.walkablePathOverrideAt = pathOverrideAt;
  return collision;
};

export const clareiraDosEcosMap = Object.freeze({
  id: "clareira-dos-ecos-overworld",
  name: "Clareira dos Ecos",
  objective: "Explore a clareira e reconheça os caminhos da região.",
  sceneImage: "assets/overworld/clareira-dos-ecos/ground-v2.webp",
  startPosition: Object.freeze({ x: 0, z: 36.45 }),
  bounds,
  cameraMode: "follow",
  cameraBounds: bounds,
  cameraExtent: Object.freeze({ ...bounds, depthProjection: ARTWORK_DEPTH_PROJECTION }),
  visualProjection: Object.freeze({ width: 42, height: 23.5 }),
  palette: Object.freeze({ sky: 0x0b2818, fog: 0x173b26 }),
  contentPhase: "exploration-wildlife"
});

export const buildClareiraDosEcos = ({ scene }) => {
  const collision = applyWalkablePathOverrides(createClareiraDosEcosCollision({
    bounds: clareiraDosEcosMap.bounds,
    artwork: {
      width: CLAREIRA_DOS_ECOS_WORLD_SIZE.sourceWidth,
      height: CLAREIRA_DOS_ECOS_WORLD_SIZE.sourceHeight
    }
  }));
  const artwork = buildArtworkScene({
    scene,
    map: clareiraDosEcosMap,
    size: CLAREIRA_DOS_ECOS_WORLD_SIZE,
    groundUrl: "assets/overworld/clareira-dos-ecos/ground-v2.webp",
    foregroundUrl: "assets/overworld/clareira-dos-ecos/foreground-v2.webp",
    assetVersion: "3",
    foregroundBands: 64,
    foregroundDepthBias: -0.55
  });

  return {
    collision,
    interactions: Object.freeze([]),
    dispose() {
      artwork.dispose();
    }
  };
};
