import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const echoMain = readFileSync(new URL("../src/overworld/echo-main.js", import.meta.url), "utf8");
const exitReset = readFileSync(new URL("../src/overworld/idle/central-sanctuary-exit-reset.js", import.meta.url), "utf8");

test("carrega o encontro em cena do Guardião depois do Santuário", () => {
  const sanctuaryImport = 'import "./idle/central-sanctuary.js?v=2";';
  const guardianImport = 'import "./idle/central-guardian-encounter.js?v=1";';
  assert.match(echoMain, /central-guardian-encounter\.js\?v=1/);
  assert.ok(echoMain.indexOf(sanctuaryImport) < echoMain.indexOf(guardianImport));
});

test("carrega a regra de reinício do progresso ao voltar ao mapa-múndi", () => {
  assert.match(echoMain, /central-sanctuary-exit-reset\.js\?v=1/);
  assert.match(exitReset, /MutationObserver/);
  assert.match(exitReset, /attributeFilter: \["hidden"\]/);
  assert.match(exitReset, /saveCentralSanctuaryState/);
  assert.match(exitReset, /progress: 0/);
  assert.match(exitReset, /running: false/);
  assert.match(exitReset, /completedEncounterIds: \[\]/);
});
