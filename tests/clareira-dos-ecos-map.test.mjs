import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createClareiraDosEcosCollision,
  clareiraDosEcosTerrainLevels,
  clareiraDosEcosTerrainTransitions,
  clareiraDosEcosWalkableChannels
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

// Todo chão real — terra, grama, capim, clareira, ponte, escada e piso —
// permanece livre. A amostragem percorre o mapa inteiro, não apenas o centro.
[
  ["entrada inferior", 768, 946],
  ["trilha inferior 1", 768, 875],
  ["trilha inferior 2", 730, 810],
  ["trilha inferior 3", 700, 735],
  ["clareira central", 770, 500],
  ["trilha central norte", 770, 340],
  ["trilha central superior", 770, 190],
  ["passagem do portão superior", 780, 80],
  ["clareira oeste", 220, 680],
  ["gramado oeste", 170, 455],
  ["trilha superior oeste", 525, 177],
  ["clareira leste", 1280, 410],
  ["gramado leste", 1330, 365],
  ["piso do santuário oeste", 230, 170],
  ["ponte central", 550, 528],
  ["ponte leste", 1450, 630],
  ["piso do terraço nordeste", 1215, 166],
  ["base da escada do terraço nordeste", 1045, 280],
  ["escada do terraço nordeste", 1090, 230],
  ["entrada da arena sudeste", 955, 820],
  ["escada da arena sudeste", 1005, 780],
  ["piso da arena sudeste", 1148, 735],
  ["gramado sudoeste", 300, 710],
  ["gramado sudeste", 1350, 700]
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
  ["água central superior", 535, 455],
  ["água central inferior", 610, 600],
  ["água do leste", 1460, 300],
  ["árvore superior central", 875, 202],
  ["árvore central direita", 1088, 548],
  ["mata rochosa inferior esquerda", 445, 805],
  ["mata inferior direita", 1325, 795],
  ["rocha no caminho superior", 742, 264],
  ["parede do terraço nordeste", 1318, 174],
  ["parede da arena sudeste", 1278, 730],
  ["pilar do santuário oeste", 126, 170],
  ["poça da arena sudeste", 1140, 650]
].forEach(([name, x, y]) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), true, `${name} deve bloquear o protagonista`);
});

assert.ok(collision.shapes.length >= 45, "a arte precisa ter cobertura completa de sólidos visíveis");
assert.equal(new Set(collision.shapes.map(({ id }) => id)).size, collision.shapes.length, "cada sólido precisa de id único");
const allowedAlignedSolidId = /^(edge-|water-|research-cabin$|tree-|rock-|west-sanctuary-|terrace-northeast-|arena-southeast-|upper-gate-|fence-)/;
collision.shapes.forEach(({ id }) => assert.match(id, allowedAlignedSolidId, `${id} não pertence a uma categoria sólida permitida`));

// Pontes inteiras continuam atravessáveis.
[[490, 520], [520, 515], [550, 515], [580, 515], [610, 520]].forEach(([x, y], index) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `trecho ${index + 1} da ponte oeste deve ser livre`);
});
[[1395, 628], [1430, 630], [1470, 632], [1500, 635]].forEach(([x, y], index) => {
  const point = fromPixel(x, y);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `trecho ${index + 1} da ponte leste deve ser livre`);
});

assert.equal(clareiraDosEcosTerrainLevels.length, 2, "os dois pisos com escadas precisam de nível próprio");
assert.equal(clareiraDosEcosTerrainTransitions.length, 2, "cada piso elevado precisa de uma entrada válida");
assert.equal(clareiraDosEcosWalkableChannels.length, 4, "pontes e escadas precisam de corredores que recortam água e muros");
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
  ["terraço nordeste", [1210, 170], [1090, 230], [1035, 285]],
  ["arena sudeste", [1145, 735], [1005, 780], [970, 850]]
].forEach(([name, highPixel, stairsPixel, lowPixel]) => {
  const high = fromPixel(...highPixel);
  const stairs = fromPixel(...stairsPixel);
  const low = fromPixel(...lowPixel);
  assert.equal(collision.canTraverse(high.x, high.z, stairs.x, stairs.z, playerRadius), true, `${name}: deve entrar na escada pelo piso alto`);
  assert.equal(collision.canTraverse(stairs.x, stairs.z, low.x, low.z, playerRadius), true, `${name}: deve sair da escada no piso baixo`);
  assert.equal(collision.canTraverse(low.x, low.z, stairs.x, stairs.z, playerRadius), true, `${name}: deve subir pela mesma escada`);
});

[
  ["ponte central", 550, 515, "central-water-bridge"],
  ["ponte leste", 1460, 630, "east-water-bridge"],
  ["escada nordeste", 1090, 230, "terrace-northeast-stair-channel"],
  ["escada sudeste", 1005, 780, "arena-southeast-stair-channel"]
].forEach(([name, x, y, expectedChannel]) => {
  const point = fromPixel(x, y);
  assert.equal(collision.walkableChannelAt(point.x, point.z)?.id, expectedChannel, `${name} precisa usar o corredor correto`);
  assert.equal(collision.collides(point.x, point.z, playerRadius), false, `${name} não pode conter bloqueio invisível`);
});

const reachableFromSpawn = buildReachablePixelGrid();
[
  ["entrada inferior", 768, 946],
  ["trilha inferior", 730, 810],
  ["entroncamento inferior", 700, 735],
  ["clareira central", 770, 500],
  ["trilha central superior", 790, 320],
  ["portão superior", 780, 80],
  ["santuário oeste", 230, 170],
  ["ponte central", 560, 515],
  ["gramado oeste superior", 350, 320],
  ["gramado oeste central", 210, 440],
  ["clareira oeste", 220, 680],
  ["gramado sudoeste", 300, 710],
  ["gramado leste central", 1220, 420],
  ["clareira leste", 1320, 420],
  ["ponte leste", 1470, 632],
  ["terraço nordeste", 1215, 166],
  ["arena sudeste", 1148, 735],
  ["base da escada nordeste", 1045, 280],
  ["base da escada sudeste", 955, 820]
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
