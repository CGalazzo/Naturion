import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const moduleSource = readFileSync(new URL("../src/overworld/idle/central-sanctuary.js", import.meta.url), "utf8");

test("Santuário Central possui três níveis com os fundos enviados", () => {
  for (const scene of ["entrada.webp", "galerias.webp", "nucleo.webp"]) {
    assert.match(moduleSource, new RegExp(`assets/sanctuary/scenes/${scene.replace(".", "\\.")}`));
    assert.equal(existsSync(new URL(`../assets/sanctuary/scenes/${scene}`, import.meta.url)), true);
  }
  assert.match(moduleSource, /Entrada do Santuário/);
  assert.match(moduleSource, /Galerias do Santuário/);
  assert.match(moduleSource, /Núcleo do Santuário/);
});

test("as nove primeiras formas aparecem em todos os níveis a partir do nível 10", () => {
  for (const id of ["pedrilho", "leonito", "hidropotamo", "rinolito", "tartarim", "macabroto", "faistrino", "croquim", "gororoc"]) {
    assert.match(moduleSource, new RegExp(`\\b${id}\\b`));
    assert.equal(existsSync(new URL(`../assets/sanctuary/creatures/${id}.webp`, import.meta.url)), true);
  }
  assert.match(moduleSource, /min: 10, max: 12/);
  assert.match(moduleSource, /const shuffled = \[\.\.\.WILD_FORMS\]/);
  assert.match(html, /const ECHO_WILD_CHAINS = EVOLUTION_CHAINS\.slice\(3, 9\)/);
});

test("Macabroto é forma única e não participa de outra evolução", () => {
  assert.match(html, /\["macabroto"\]/);
  assert.doesNotMatch(html, /\["[^"]+",\s*"macabroto"/);
  assert.doesNotMatch(html, /\["macabroto",\s*"[^"]+"/);
  assert.match(moduleSource, /Macabroto é uma espécie única e/);
});

test("evoluções e equipe do Guardião respeitam os níveis definidos", () => {
  const expectedChains = [
    '["pedrilho", "granfante"]', '["leonito", "terralion"]',
    '["hidropotamo", "pantanamo"]', '["rinolito", "rocichifre", "titanochifre"]',
    '["tartarim", "terratuga"]', '["faistrino", "titrovao"]',
    '["croquim", "aquadrilo", "toxidrilo"]', '["gororoc", "montgoril"]'
  ];
  expectedChains.forEach((chain) => assert.equal(html.includes(chain), true, chain));
  assert.match(html, /rocichifre[^}]+minLevel: 14/);
  assert.match(html, /titanochifre[^}]+minLevel: 35/);
  assert.match(html, /pantanamo[^}]+minLevel: 16/);
  assert.match(html, /aquadrilo[^}]+minLevel: 17/);
  assert.match(html, /toxidrilo[^}]+minLevel: 34/);
  assert.match(moduleSource, /formId: "rocichifre", level: 15/);
  assert.match(moduleSource, /formId: "terratuga", level: 16/);
  assert.match(moduleSource, /formId: "terralion", level: 18/);
  assert.match(moduleSource, /captureAllowed: false/);
});

test("derrota do Guardião reinicia o Santuário no nível 1", () => {
  assert.match(moduleSource, /showDefeat\("sanctuary"\)/);
  assert.match(moduleSource, /if \(defeatScope === "sanctuary"\) state\.levelIndex = 0/);
  assert.match(moduleSource, /Puzzle 2 liberado/);
});
