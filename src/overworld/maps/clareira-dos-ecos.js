import { buildArtworkScene, createArtworkWorldSize, ARTWORK_DEPTH_PROJECTION } from "../artwork-scene.js?v=2";
import { createClareiraDosEcosCollision } from "./clareira-dos-ecos-collision.js?v=5";
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

// Corredores visuais de chão que precisam prevalecer sobre máscaras de água
// conservadoras. Cada corredor remove somente os obstáculos explicitamente
// listados e nunca desativa colisões de árvores, pedras ou construções.
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

const applyWalkablePathOverrides = (collision) => {
  const baseCollides = collision.collides.bind(collision);

  collision.collides = (x, z, radius = 0.5, { ignore = null } = {}) => {
    const artworkPoint = worldToArtwork(x, z);
    const channel = WALKABLE_PATH_OVERRIDES.find((item) => (
      pointInPolygon(artworkPoint.x, artworkPoint.y, item.points)
    ));

    if (!channel) return baseCollides(x, z, radius, { ignore });
    if (!collision.insideBounds(x, z, radius)) return true;

    return collision.shapes.some((shape) => {
      if (shape === ignore) return false;
      if (channel.clearIds.includes(shape.id)) return false;
      return collision.intersectsShape(shape, x, z, radius);
    });
  };

  collision.walkablePathOverrideAt = (x, z) => {
    const artworkPoint = worldToArtwork(x, z);
    return WALKABLE_PATH_OVERRIDES.find((item) => (
      pointInPolygon(artworkPoint.x, artworkPoint.y, item.points)
    )) || null;
  };

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
    assetVersion: "2",
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
