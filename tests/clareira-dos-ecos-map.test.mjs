import assert from "node:assert/strict";
import { createClareiraDosEcosCollision } from "../src/overworld/maps/clareira-dos-ecos-collision.js";

const artwork = Object.freeze({ width: 1536, height: 1024 });
const worldDepth = 86;
const depthProjection = 29.5 / Math.hypot(29.5, 22.5);
const worldWidth = worldDepth * depthProjection * (artwork.width / artwork.height);
const bounds = Object.freeze({
  minX: -(worldWidth / 2),
  maxX: worldWidth / 2,
  minZ: -(worldDepth / 2),
  maxZ: worldDepth / 2
});
const playerRadius = 0.56;
const fromPixel = (x, y) => ({
  x: bounds.minX + (x / artwork.width) * (bounds.maxX - bounds.minX),
  z: bounds.minZ + (y / artwork.height) * (bounds.maxZ - bounds.minZ)
});
const collision = createClareiraDosEcosCollision({ bounds, artwork });

[
  ["entrada inferior", fromPixel(768, 946)],
  ["clareira central", fromPixel(770, 500)],
  ["clareira esquerda", fromPixel(220, 680)],
  ["caminho superior", fromPixel(610, 180)],
  ["clareira direita", fromPixel(1250, 390)],
  ["caminho inferior", fromPixel(760, 800)],
  ["piso do círculo de ruínas", fromPixel(230, 170)]
].forEach(([name, point]) => {
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `${name} deve ser caminhável`);
});

[
  ["cabana abandonada", fromPixel(930, 380)],
  ["água esquerda", fromPixel(430, 500)],
  ["ruína superior direita", fromPixel(1180, 160)],
  ["árvore central", fromPixel(815, 235)],
  ["ruína inferior", fromPixel(1150, 735)],
  ["mata lateral", fromPixel(45, 500)]
].forEach(([name, point]) => {
  assert.equal(collision.collides(point.x, point.z, playerRadius), true, `${name} deve bloquear o protagonista`);
});

assert.ok(collision.shapes.length >= 30, "o mapa ampliado deve ter cobertura de colisão completa");
console.log(`Clareira dos Ecos validada: ${collision.shapes.length} obstáculos alinhados à arte.`);
