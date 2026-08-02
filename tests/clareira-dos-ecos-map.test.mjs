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

const buildReachablePixelGrid = ({ step = 8, start = [768, 946] } = {}) => {
  const columns = Math.floor(artwork.width / step) + 1;
  const rows = Math.floor(artwork.height / step) + 1;
  const reachable = new Uint8Array(columns * rows);
  const queue = [[Math.round(start[0] / step), Math.round(start[1] / step)]];
  const key = (x, y) => y * columns + x;
  reachable[key(...queue[0])] = 1;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([offsetX, offsetY]) => {
      const nextX = x + offsetX;
      const nextY = y + offsetY;
      if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows) return;
      if (reachable[key(nextX, nextY)]) return;
      const point = fromPixel(nextX * step, nextY * step);
      if (collision.collides(point.x, point.z, playerRadius)) return;
      reachable[key(nextX, nextY)] = 1;
      queue.push([nextX, nextY]);
    });
  }

  return (x, y) => Boolean(reachable[key(Math.round(x / step), Math.round(y / step))]);
};

[
  ["entrada inferior", fromPixel(768, 946)],
  ["clareira central", fromPixel(770, 500)],
  ["clareira esquerda", fromPixel(220, 680)],
  ["caminho superior", fromPixel(610, 180)],
  ["clareira direita", fromPixel(1250, 390)],
  ["caminho inferior", fromPixel(760, 800)],
  ["piso do círculo de ruínas", fromPixel(230, 170)],
  ["ponte oeste", fromPixel(520, 535)],
  ["ponte leste", fromPixel(1435, 600)],
  ["piso da ruína superior", fromPixel(1200, 170)],
  ["escada da ruína superior", fromPixel(1110, 235)],
  ["entrada do puzzle inferior", fromPixel(1040, 780)],
  ["piso esquerdo do puzzle inferior", fromPixel(1055, 735)],
  ["centro gramado do puzzle inferior", fromPixel(1150, 735)],
  ["caminho central direito", fromPixel(900, 550)],
  ["ramificação esquerda", fromPixel(300, 300)],
  ["ramificação direita", fromPixel(1300, 400)]
].forEach(([name, point]) => {
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `${name} deve ser caminhável`);
});

[
  ["cabana abandonada", fromPixel(930, 380)],
  ["água esquerda", fromPixel(430, 500)],
  ["parede da ruína superior direita", fromPixel(1315, 150)],
  ["árvore central", fromPixel(815, 235)],
  ["poça do puzzle inferior", fromPixel(1132, 646)],
  ["parede do puzzle inferior", fromPixel(1270, 700)],
  ["mata lateral", fromPixel(45, 500)]
].forEach(([name, point]) => {
  assert.equal(collision.collides(point.x, point.z, playerRadius), true, `${name} deve bloquear o protagonista`);
});

assert.ok(collision.shapes.length >= 30, "o mapa ampliado deve ter cobertura de colisão completa");
assert.equal(
  new Set(collision.shapes.map(({ id }) => id)).size,
  collision.shapes.length,
  "cada obstáculo precisa de um identificador único"
);

[
  [500, 550], [540, 550], [580, 550], [620, 550]
].forEach(([x, y], index) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `trecho ${index + 1} da ponte oeste deve ser caminhável`);
});

[
  [1390, 595], [1430, 595], [1470, 595], [1510, 595]
].forEach(([x, y], index) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `trecho ${index + 1} da ponte leste deve ser caminhável`);
});

const isReachableFromSpawn = buildReachablePixelGrid();
[
  ["círculo de ruínas", 230, 170],
  ["ponte oeste, entrada", 500, 550],
  ["ponte oeste, saída", 620, 550],
  ["ponte leste, entrada", 1390, 595],
  ["ponte leste, saída", 1510, 595],
  ["escada da ruína superior", 1110, 235],
  ["piso da ruína superior", 1200, 170],
  ["escada do puzzle inferior", 1040, 780],
  ["piso do puzzle inferior", 1055, 735],
  ["centro do puzzle inferior", 1150, 735]
].forEach(([name, x, y]) => {
  assert.equal(isReachableFromSpawn(x, y), true, `${name} precisa ter uma rota contínua desde o spawn`);
});
console.log(`Clareira dos Ecos validada: ${collision.shapes.length} obstáculos alinhados à arte.`);
