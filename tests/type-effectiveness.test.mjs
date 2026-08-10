import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../src/battle/type-effectiveness.js");

const {
  TYPE_CHART,
  getPrimaryType,
  getSingleTypeMultiplier,
  getTypeMultiplier,
  getEffectivenessMessage,
  resolveTypedDamage
} = globalThis.NaturionTypeSystem;

const expectedChart = {
  "Água": { strong: ["Fogo", "Terra", "Pedra"], weak: ["Planta", "Elétrico", "Veneno"] },
  "Fogo": { strong: ["Planta", "Gelo", "Inseto"], weak: ["Água", "Pedra", "Terra"] },
  "Planta": { strong: ["Água", "Elétrico", "Terra"], weak: ["Fogo", "Gelo", "Pedra", "Inseto"] },
  "Elétrico": { strong: ["Voador", "Água", "Inseto"], weak: ["Pedra", "Terra"] },
  "Inseto": { strong: ["Terra", "Normal", "Planta"], weak: ["Fogo", "Elétrico", "Gelo", "Lutador"] },
  "Gelo": { strong: ["Planta", "Inseto", "Dragão"], weak: ["Fogo", "Sombrio"] },
  "Sombrio": { strong: ["Sangue", "Dragão"], weak: ["Luz", "Normal"] },
  "Luz": { strong: ["Sombrio", "Lutador"], weak: ["Sangue", "Veneno", "Normal"] },
  "Sangue": { strong: ["Luz", "Normal"], weak: ["Sombrio"] },
  "Terra": { strong: ["Elétrico", "Fogo"], weak: ["Água", "Planta", "Inseto", "Veneno"] },
  "Pedra": { strong: ["Voador", "Elétrico", "Dragão", "Veneno"], weak: ["Água"] },
  "Veneno": { strong: ["Luz", "Terra", "Água", "Lutador"], weak: ["Lutador", "Pedra"] },
  "Voador": { strong: ["Lutador", "Normal"], weak: ["Elétrico", "Pedra", "Dragão"] },
  "Lutador": { strong: ["Normal", "Inseto"], weak: ["Voador", "Dragão", "Veneno", "Luz"] },
  "Dragão": { strong: ["Voador", "Lutador"], weak: ["Gelo", "Sombrio", "Pedra"] },
  "Normal": { strong: ["Sombrio", "Luz"], weak: ["Lutador", "Voador", "Sangue"] }
};

assert.deepEqual(Object.keys(TYPE_CHART), Object.keys(expectedChart), "a tabela deve conter exatamente os 16 tipos definidos");

Object.entries(expectedChart).forEach(([attackType, relations]) => {
  assert.deepEqual(TYPE_CHART[attackType].strongAgainst, relations.strong, `${attackType}: vantagens precisam permanecer exatas`);
  assert.deepEqual(TYPE_CHART[attackType].weakAgainst, relations.weak, `${attackType}: fraquezas precisam permanecer exatas`);
  relations.strong.forEach((defenderType) => {
    assert.equal(getSingleTypeMultiplier(attackType, defenderType), 1.5, `${attackType} > ${defenderType}`);
  });
  relations.weak.forEach((defenderType) => {
    const expectedMultiplier = relations.strong.includes(defenderType) ? 1.5 : .75;
    assert.equal(getSingleTypeMultiplier(attackType, defenderType), expectedMultiplier, `${attackType} < ${defenderType}`);
  });
  const neutralType = Object.keys(expectedChart).find((candidate) => (
    candidate !== attackType && !relations.strong.includes(candidate) && !relations.weak.includes(candidate)
  ));
  assert.equal(getSingleTypeMultiplier(attackType, neutralType), 1, `${attackType} deve ser neutro contra ${neutralType}`);
});

assert.equal(getTypeMultiplier("Água", "Fogo/Terra"), 2.25, "duas vantagens devem multiplicar para 2,25×");
assert.equal(getTypeMultiplier("Água", "Fogo/Normal"), 1.5, "vantagem e neutralidade devem resultar em 1,5×");
assert.equal(getTypeMultiplier("Planta", "Água/Inseto"), 1.125, "vantagem e fraqueza devem resultar em 1,125×");
assert.equal(getTypeMultiplier("Fogo", "Água/Terra"), .5625, "duas fraquezas devem multiplicar para 0,5625×");
assert.equal(
  getSingleTypeMultiplier("Veneno", "Lutador"),
  1.5,
  "quando uma relação aparece nas duas listas, a vantagem declarada primeiro deve prevalecer"
);

assert.equal(getPrimaryType("Inseto/Veneno"), "Inseto", "um golpe deve usar somente um tipo");
assert.equal(
  getTypeMultiplier("Inseto/Veneno", "Planta"),
  1.5,
  "a dupla tipagem do atacante nunca deve multiplicar o dano do golpe"
);

assert.equal(getEffectivenessMessage(2.25), "Extremamente efetivo!");
assert.equal(getEffectivenessMessage(1.5), "Super efetivo!");
assert.equal(getEffectivenessMessage(1.125), "");
assert.equal(getEffectivenessMessage(1), "");
assert.equal(getEffectivenessMessage(.75), "Pouco efetivo...");
assert.equal(getEffectivenessMessage(.5625), "Muito pouco efetivo...");

assert.deepEqual(
  resolveTypedDamage(10, "Água", "Fogo/Terra"),
  {
    attackType: "Água",
    defenderTypes: ["Fogo", "Terra"],
    baseDamage: 10,
    multiplier: 2.25,
    damage: 23,
    message: "Extremamente efetivo!"
  },
  "o dano final deve ser arredondado depois de aplicar a tipagem"
);
assert.equal(resolveTypedDamage(10, "Normal", "Voador").damage, 8, "ataques básicos devem poder usar a tabela do tipo Normal");

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.ok(
  indexSource.indexOf("src/battle/type-effectiveness.js?v=1") < indexSource.indexOf("const STORAGE_KEY"),
  "o sistema de tipos precisa carregar antes da lógica principal"
);
assert.match(indexSource, /resolveTypedDamage\(baseDamage, attackType, echoEncounter\.form\.type\)/, "o dano causado precisa considerar o tipo do defensor");
assert.match(indexSource, /resolveTypedDamage\(wildBaseDamage, wildAttackType, playerForm\.type\)/, "o dano recebido precisa considerar o tipo do jogador");
assert.match(indexSource, /resolveTypedDamage\(battleData\.skillDamage, battleData\.attackType, "Voador"\)/, "o tutorial precisa usar o tipo próprio da técnica elemental");

console.log("Sistema de tipos validado: tabela completa, dupla tipagem, mensagens e integração das batalhas.");
