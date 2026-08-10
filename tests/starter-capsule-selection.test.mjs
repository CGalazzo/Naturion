import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const laboratoryUrl = new URL("../assets/selection/starter-capsule-lab.webp", import.meta.url);
const laboratory = await readFile(laboratoryUrl);
const laboratoryInfo = await stat(laboratoryUrl);

assert.equal(laboratory.subarray(0, 4).toString("ascii"), "RIFF", "o laboratório deve ser um WebP válido");
assert.equal(laboratory.subarray(8, 12).toString("ascii"), "WEBP", "a arte precisa manter o contêiner WebP");
assert.ok(laboratoryInfo.size > 150_000, "a arte aprovada não pode ser substituída por um placeholder");

assert.match(
  index,
  /class="starter-lab-art"[\s\S]*?starter-capsule-lab\.webp[\s\S]*?width="1672"[\s\S]*?height="941"/,
  "a seleção precisa usar a arte aprovada sem deformação"
);
assert.equal((index.match(/class="starter-card"/g) || []).length, 3, "a seleção precisa manter exatamente três iniciais");
assert.match(index, /data-starter="axolume"[\s\S]*?Axolume[\s\S]*?Água/, "Axolume precisa ocupar a cápsula azul");
assert.match(index, /data-starter="brasguax"[\s\S]*?Brasguax[\s\S]*?Fogo/, "Brasguax precisa ocupar a cápsula laranja");
assert.match(index, /data-starter="musgurso"[\s\S]*?Musgurso[\s\S]*?Planta/, "Musgurso precisa ocupar a cápsula verde");

assert.match(index, /starter-card\[data-starter="axolume"\][^}]*left: 13\.7%/, "Axolume precisa alinhar à cápsula esquerda");
assert.match(index, /starter-card\[data-starter="brasguax"\][^}]*left: 37\.8%/, "Brasguax precisa alinhar à cápsula central");
assert.match(index, /starter-card\[data-starter="musgurso"\][^}]*left: 61\.9%/, "Musgurso precisa alinhar à cápsula direita");
assert.match(index, /@keyframes starter-capsule-float/, "os iniciais precisam flutuar dentro das cápsulas");
assert.match(index, /@keyframes starter-capsule-energy/, "as cápsulas precisam manter partículas em movimento");
assert.doesNotMatch(index, /\.starter-card::before/, "a seleção não deve desenhar formas geométricas sobre as cápsulas");
assert.doesNotMatch(index, /starter-capsule-selected/, "o contorno geométrico animado não deve permanecer");
assert.match(
  index,
  /\.starter-image\s*\{[\s\S]*?top:\s*10%;[\s\S]*?height:\s*68%;/,
  "os iniciais precisam ficar mais baixos, dentro dos tubos e separados das caixas de nome"
);
assert.match(
  index,
  /\.starter-card:hover,[\s\S]*?\.starter-card\.selected\s*\{[\s\S]*?--starter-scale:\s*1\.055;/,
  "a escolha precisa continuar destacada pela animação do próprio Naturion"
);

assert.match(
  index,
  /const selectStarter = \(card\) => \{[\s\S]*?selectedStarter = card\.dataset\.starter;[\s\S]*?aria-pressed[\s\S]*?openStarterConfirmation\.disabled = false;/,
  "a lógica original de seleção e acessibilidade precisa permanecer ativa"
);
assert.match(index, /starterCards\.forEach\(\(card\) => \{\s*card\.addEventListener\("click", \(\) => selectStarter\(card\)\)/, "os mesmos botões precisam continuar selecionáveis");
assert.match(index, /confirmStarter\.addEventListener\("click", beginSynchronization\)/, "a confirmação precisa manter o fluxo original");

console.log("Seleção dos iniciais validada com laboratório, cápsulas animadas e lógica preservada.");
