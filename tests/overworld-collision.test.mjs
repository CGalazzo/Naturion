import assert from "node:assert/strict";
import { createArtworkCollisionWorld } from "../src/overworld/collision.js";
import { createBosqueLuminalCollision } from "../src/overworld/maps/bosque-luminal-collision.js";

const bounds = Object.freeze({ minX: -27.421, maxX: 27.421, minZ: -23, maxZ: 23 });
const artwork = Object.freeze({ width: 1536, height: 1024 });
const playerRadius = 0.56;
const fromPixel = (x, y) => ({
  x: bounds.minX + (x / artwork.width) * (bounds.maxX - bounds.minX),
  z: bounds.minZ + (y / artwork.height) * (bounds.maxZ - bounds.minZ)
});

const collision = createBosqueLuminalCollision({ bounds, artwork });

[
  ["spawn do protagonista", { x: 0, z: 7.5 }],
  ["posição da Dra. Íris", { x: -3.4, z: 8.2 }],
  ["posição de Plumirel", { x: 1.8, z: -11.5 }],
  ["caminho central", fromPixel(768, 520)],
  ["mato central", fromPixel(610, 700)]
].forEach(([name, point]) => {
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `${name} deve permanecer caminhável`);
});

[
  ["casa esquerda", fromPixel(460, 300)],
  ["ponto registrado na captura do erro", fromPixel(499, 239)],
  ["casa direita", fromPixel(1180, 430)],
  ["lago", fromPixel(1360, 680)],
  ["pedra", fromPixel(365, 543)],
  ["floresta lateral", fromPixel(100, 400)]
].forEach(([name, point]) => {
  assert.equal(collision.collides(point.x, point.z, playerRadius), true, `${name} deve bloquear o protagonista`);
});

const generic = createArtworkCollisionWorld({
  bounds,
  artwork,
  obstacles: [{ id: "rect-test", kind: "rect", left: 100, top: 100, right: 200, bottom: 200 }]
});
const rectCenter = fromPixel(150, 150);
assert.equal(generic.collides(rectCenter.x, rectCenter.z, 0), true, "retângulos visuais devem ser convertidos");

console.log(`Colisão visual validada: ${collision.shapes.length} obstáculos alinhados à arte.`);
