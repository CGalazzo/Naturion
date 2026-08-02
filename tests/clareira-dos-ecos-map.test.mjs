import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createClareiraDosEcosCollision,
  clareiraDosEcosTerrainLevels,
  clareiraDosEcosTerrainTransitions
} from "../src/overworld/maps/clareira-dos-ecos-collision.js";
import { clareiraDosEcosNaturions } from "../src/overworld/maps/clareira-dos-ecos-content.js";

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
    const current = fromPixel(x * step, y * step);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([offsetX, offsetY]) => {
      const nextX = x + offsetX;
      const nextY = y + offsetY;
      if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows) return;
      if (reachable[key(nextX, nextY)]) return;
      const next = fromPixel(nextX * step, nextY * step);
      if (!collision.canTraverse(current.x, current.z, next.x, next.z, playerRadius)) return;
      reachable[key(nextX, nextY)] = 1;
      queue.push([nextX, nextY]);
    });
  }

  return (x, y) => Boolean(reachable[key(Math.round(x / step), Math.round(y / step))]);
};

// Todo chão real — terra, grama, clareira, ponte, escada e piso — permanece livre.
[
  ["entrada inferior", 768, 946],
  ["clareira central", 770, 500],
  ["clareira oeste", 220, 680],
  ["trilha superior oeste", 525, 177],
  ["clareira leste", 1250, 390],
  ["trilha inferior", 760, 800],
  ["piso do santuário oeste", 230, 170],
  ["ponte oeste", 520, 535],
  ["ponte leste", 1435, 600],
  ["piso do terraço nordeste", 1215, 166],
  ["escada do terraço nordeste", 1160, 234],
  ["entrada da arena sudeste", 1038, 787],
  ["piso da arena sudeste", 1148, 735],
  ["gramado lateral oeste", 125, 440],
  ["gramado lateral leste", 1380, 365]
].forEach(([name, x, y]) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `${name} deve ser caminhável`);
});

// Elementos sólidos da própria arte nunca podem ser atravessados.
[
  ["floresta no limite norte", 500, 36],
  ["floresta no limite oeste", 38, 410],
  ["floresta no limite sul", 360, 970],
  ["cabana abandonada", 930, 380],
  ["água oeste", 430, 430],
  ["árvore superior esquerda", 603, 169],
  ["árvore superior central", 698, 253],
  ["árvore central direita", 1120, 502],
  ["árvore inferior esquerda", 439, 744],
  ["árvore inferior direita", 944, 858],
  ["rocha central", 750, 274],
  ["parede do terraço nordeste", 1318, 174],
  ["parede da arena sudeste", 1278, 730],
  ["pilar do santuário oeste", 95, 170],
  ["poça da arena sudeste", 1132, 646]
].forEach(([name, x, y]) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), true, `${name} deve bloquear o protagonista`);
});

assert.ok(collision.shapes.length >= 45, "a arte precisa ter cobertura completa de sólidos visíveis");
assert.equal(new Set(collision.shapes.map(({ id }) => id)).size, collision.shapes.length, "cada sólido precisa de id único");
const allowedSolidId = /^(edge-|water-|ruin-puddle-|research-cabin$|tree-|rock-|ruin-left-|upper-right-ruin-|lower-right-ruin-|upper-gate-|fence-)/;
collision.shapes.forEach(({ id }) => assert.match(id, allowedSolidId, `${id} não pertence a uma categoria sólida permitida`));

// Pontes inteiras continuam atravessáveis.
[[500, 550], [540, 550], [580, 550], [620, 550]].forEach(([x, y], index) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `trecho ${index + 1} da ponte oeste deve ser livre`);
});
[[1390, 595], [1430, 595], [1470, 595], [1510, 595]].forEach(([x, y], index) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `trecho ${index + 1} da ponte leste deve ser livre`);
});

assert.equal(clareiraDosEcosTerrainLevels.length, 2, "os dois pisos com escadas precisam de nível próprio");
assert.equal(clareiraDosEcosTerrainTransitions.length, 2, "cada piso elevado precisa de uma entrada válida");
[
  ["terraço nordeste", 1215, 166],
  ["arena sudeste", 1148, 735]
].forEach(([name, x, y]) => {
  const point = fromPixel(x, y);
  assert.equal(collision.terrainLevelAt(point.x, point.z), 1, `${name} deve ser reconhecido como piso elevado`);
});

// Não é possível cortar a parede para trocar de altura.
[
  ["muro do terraço nordeste", [1220, 170], [1220, 286]],
  ["muro da arena sudeste", [1160, 735], [1335, 735]]
].forEach(([name, start, end]) => {
  const from = fromPixel(...start);
  const to = fromPixel(...end);
  assert.equal(collision.canTraverse(from.x, from.z, to.x, to.z, playerRadius), false, `${name} não pode ser atravessado como terreno plano`);
});

// A mudança de nível funciona em duas etapas: piso ↔ escada ↔ chão.
[
  ["terraço nordeste", [1210, 170], [1162, 232], [1164, 286]],
  ["arena sudeste", [1145, 735], [1035, 780], [1035, 850]]
].forEach(([name, highPixel, stairsPixel, lowPixel]) => {
  const high = fromPixel(...highPixel);
  const stairs = fromPixel(...stairsPixel);
  const low = fromPixel(...lowPixel);
  assert.equal(collision.canTraverse(high.x, high.z, stairs.x, stairs.z, playerRadius), true, `${name}: deve entrar na escada pelo piso alto`);
  assert.equal(collision.canTraverse(stairs.x, stairs.z, low.x, low.z, playerRadius), true, `${name}: deve sair da escada no piso baixo`);
  assert.equal(collision.canTraverse(low.x, low.z, stairs.x, stairs.z, playerRadius), true, `${name}: deve subir pela mesma escada`);
});

const reachableFromSpawn = buildReachablePixelGrid();
[
  ["santuário oeste", 230, 170],
  ["ponte oeste", 560, 550],
  ["ponte leste", 1470, 595],
  ["terraço nordeste", 1215, 166],
  ["arena sudeste", 1148, 735],
  ["clareira oeste", 220, 680],
  ["clareira leste", 1250, 390]
].forEach(([name, x, y]) => assert.equal(reachableFromSpawn(x, y), true, `${name} precisa ter rota válida desde a entrada`));

// População moderada, somente primeiras formas e com movimento configurado.
const firstForms = new Set(["escaruli", "lumpirim", "failino", "hambrio", "canumi", "zumbel"]);
assert.ok(clareiraDosEcosNaturions.length >= 4 && clareiraDosEcosNaturions.length <= 8, "a fauna não pode lotar o mapa");
assert.equal(new Set(clareiraDosEcosNaturions.map(({ id }) => id)).size, clareiraDosEcosNaturions.length, "cada Naturion precisa de id único");
clareiraDosEcosNaturions.forEach((naturion) => {
  assert.equal(firstForms.has(naturion.formId), true, `${naturion.formId} precisa ser uma primeira evolução`);
  assert.ok(naturion.speed > 0, `${naturion.id} precisa se movimentar`);
  assert.ok(naturion.scale >= 1.8 && naturion.scale <= 2.25, `${naturion.id} precisa seguir a escala das primeiras evoluções`);
  if (naturion.flying) {
    assert.ok(naturion.altitude > 0 && naturion.path?.length >= 3, `${naturion.id} precisa patrulhar batendo asas`);
  } else {
    assert.equal(naturion.behavior, "wander", `${naturion.id} terrestre precisa caminhar pelo terreno`);
    assert.equal(collision.collides(naturion.position.x, naturion.position.z, .4), false, `${naturion.id} precisa nascer no chão livre`);
  }
});

const playerSource = await readFile(new URL("../src/overworld/player.js", import.meta.url), "utf8");
const entitySource = await readFile(new URL("../src/overworld/entities.js", import.meta.url), "utf8");
assert.match(playerSource, /collision\.canTraverse/, "o protagonista precisa respeitar transições de nível");
assert.match(entitySource, /collision\.canTraverse/, "Naturions terrestres precisam respeitar transições de nível");
assert.match(entitySource, /entity\.root\.position\.y = \.04/, "Naturions terrestres precisam permanecer fixos ao chão");

console.log(`Clareira validada: ${collision.shapes.length} sólidos, 2 níveis e ${clareiraDosEcosNaturions.length} Naturions móveis.`);
