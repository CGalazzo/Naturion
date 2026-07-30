import { THREE } from "../engine.js";
import { buildDefinitiveVoxelClareira } from "../art/voxel-clareira-composition.js";

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
  subtitle: "Bosque Luminal · Diorama 3D",
  objective: "Explore o bosque e alcance o portão de raízes.",
  sceneImage: "assets/map/bosque-luminal.webp",
  palette: {
    sky: 0x183f34,
    fog: 0x2a5645,
    grass: 0x4f9d4b,
    grassLight: 0x72bd54,
    earth: 0x6d5332,
    path: 0xb58c52,
    stone: 0x657468,
    water: 0x2f9ca2,
    crystal: 0x69e7de
  },
  startPosition: { x: -26, z: -20 },
  cameraBounds: { minX: -23, maxX: 23, minZ: -18, maxZ: 18.5 },
  focusPoints: {
    blockedGate: { x: 11.5, y: 2.7, z: 8.8 },
    npcArena: { x: 19, y: 1.5, z: 1 },
    finalArea: { x: 27, y: 3, z: 20 }
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

export const buildBosqueClareira = ({ scene, engine }) => buildDefinitiveVoxelClareira({
  scene,
  engine,
  stage: bosqueClareiraStage
});

export const bosqueEntities = [
  { id: "escaruli-teste", formId: "escaruli", level: 4, behavior: "wander", position: { x: -5, z: 1 }, radius: 3.8, speed: 0.82, scale: 2.8 },
  {
    id: "zumbel-voador-teste", formId: "zumbel", level: 5, behavior: "patrol", flying: true,
    altitude: 3.4, position: { x: -18, z: 14 }, path: [{ x: -18, z: 14 }, { x: -24, z: 17 }, { x: -27, z: 13 }, { x: -21, z: 11 }],
    speed: 1.25, scale: 2.45
  },
  { id: "failino-teste", formId: "failino", level: 6, behavior: "wander", position: { x: 19, z: -1 }, radius: 3.2, speed: 1.02, scale: 2.9 }
];
