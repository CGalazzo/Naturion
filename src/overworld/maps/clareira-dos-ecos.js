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
  const collision = createClareiraDosEcosCollision({
    bounds: clareiraDosEcosMap.bounds,
    artwork: {
      width: CLAREIRA_DOS_ECOS_WORLD_SIZE.sourceWidth,
      height: CLAREIRA_DOS_ECOS_WORLD_SIZE.sourceHeight
    }
  });
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
