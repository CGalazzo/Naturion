import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.doesNotMatch(
  index,
  /\.character-card::(?:before|after)/,
  "a seleção não deve desenhar molduras ou formas ovais atrás dos personagens"
);
assert.match(
  index,
  /\.character-card\s*\{[\s\S]*?border-radius:\s*0\s*!important;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none\s*!important;/,
  "a área clicável deve permanecer visualmente transparente"
);
assert.match(index, /@keyframes character-idle/, "a animação de repouso dos personagens deve permanecer");
assert.match(
  index,
  /\.character-card\.selected \.character-art\s*\{[\s\S]*?transform:\s*translateY\(-9px\) scale\(1\.045\);/,
  "a animação visual de seleção deve permanecer"
);
assert.match(
  index,
  /characterCards\.forEach\(\(card\) => \{[\s\S]*?card\.addEventListener\("click"/,
  "a lógica original de escolha dos personagens deve permanecer"
);

console.log("Seleção de personagem validada sem molduras, com animações e lógica preservadas.");
