const output = document.getElementById("result");
const errors = [];
const fail = (error) => {
  errors.push(String(error?.stack || error));
  document.documentElement.dataset.testStatus = "failed";
  output.textContent = errors.join("\n");
};
window.addEventListener("error", (event) => fail(event.error || event.message));
window.addEventListener("unhandledrejection", (event) => fail(event.reason));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

window.__naturionEcho = { forms: {
  escaruli: { id: "escaruli", name: "Escaruli", image: "../assets/story/musgurso.webp", stage: 1 },
  zumbel: { id: "zumbel", name: "Zumbel", image: "../assets/echo-creatures/umbrester.webp", stage: 1 },
  failino: { id: "failino", name: "Failino", image: "../assets/echo-creatures/lumpirim.webp", stage: 1 }
}};
let savedState = null;
let returned = false;
let battleCalls = 0;
window.NaturionOverworldBridge = {
  getPlayer: () => ({ character: "male", starter: null, team: [], overworldProgress: { mapId: "bosque-luminal-overworld", position: { x: 0, z: 20 } } }),
  requestMapEntry: async () => true,
  prepareMapEntry: () => true,
  saveState: (state) => { savedState = state; },
  returnToWorldMap: () => { returned = true; },
  startBattle: async () => ({ outcome: battleCalls++ === 0 ? "fled" : "victory" })
};

try {
  const engineModule = await import("../src/overworld/engine.js");
  const cameraModule = await import("../src/overworld/camera.js");
  const playerModule = await import("../src/overworld/player.js");
  const entityModule = await import("../src/overworld/entities.js");
  const battleModule = await import("../src/overworld/battle-bridge.js");
  const mapModule = await import("../src/overworld/maps/bosque-luminal.js");

  const testEngine = new engineModule.OverworldEngine({ container: document.getElementById("testView"), map: mapModule.bosqueLuminalMap });
  const testCamera = new cameraModule.OverworldCamera({ engine: testEngine, map: mapModule.bosqueLuminalMap });
  const build = mapModule.buildBosqueLuminal({ scene: testEngine.scene, engine: testEngine });
  const checks = [[-9, 5], [9, 1], [-17, -5], [-14, 9], [0, -20], [-27, -21]];
  checks.forEach(([x, z], index) => assert(build.collision.collides(x, z, .56), `Colisão ${index + 1} ausente.`));
  assert(build.interactions.filter((item) => item.type === "door").length === 2, "Portas não registradas.");
  assert(build.interactions.some((item) => item.type === "gate"), "Portão não registrado.");
  assert(build.interactions.some((item) => item.type === "puzzle"), "Puzzle reservado não registrado.");

  const testInput = { movement: { x: 1, z: 0, running: false }, getMovement() { return this.movement; } };
  const walker = new playerModule.OverworldPlayer({ scene: testEngine.scene, collision: build.collision, input: testInput, characterImage: "../assets/selection/hero-male.webp", startPosition: { x: 0, z: 20 } });
  testCamera.setPlayerObject(walker.group);
  for (let index = 0; index < 24; index += 1) walker.update(1 / 60, index / 60);
  const walkingDistance = walker.group.position.x;
  walker.teleport({ x: 0, z: 20 });
  testInput.movement = { x: 1, z: 0, running: true };
  for (let index = 0; index < 24; index += 1) walker.update(1 / 60, index / 60);
  assert(walkingDistance > .8, "Caminhada não deslocou o personagem.");
  assert(walker.group.position.x > walkingDistance, "Corrida não ficou mais rápida.");

  const battleBridge = new battleModule.OverworldBattleBridge({ mapId: mapModule.bosqueLuminalMap.id, sceneImage: mapModule.bosqueLuminalMap.sceneImage });
  let dialogues = 0;
  const entitySystem = new entityModule.OverworldEntities({ scene: testEngine.scene, collision: build.collision, forms: window.__naturionEcho.forms, onEncounter: (entity) => battleBridge.start(entity), onDialogue: () => { dialogues += 1; } });
  entitySystem.spawn({ naturions: mapModule.bosqueLuminalNaturions, npcs: mapModule.bosqueLuminalNpcs });
  assert(entitySystem.naturions.length === 3, "Naturions ausentes.");
  assert(entitySystem.npcs.length === 3, "NPCs ausentes.");
  const first = entitySystem.naturions[0];
  entitySystem.update(.016, 1, first.root.position);
  const flee = await entitySystem.consumeTouchEncounter();
  assert(flee?.outcome === "fled" && first.root.visible, "Fuga falhou.");
  const second = entitySystem.naturions[2];
  entitySystem.update(.016, 2, second.root.position);
  const victory = await entitySystem.consumeTouchEncounter();
  assert(victory?.outcome === "victory" && !second.root.visible, "Vitória falhou.");
  const npc = entitySystem.npcs[0];
  entitySystem.update(.016, 3, npc.root.position);
  await entitySystem.interact();
  assert(dialogues === 1, "Diálogo de NPC falhou.");
  entitySystem.dispose(); walker.dispose(); build.dispose(); testEngine.dispose();

  await import("../src/overworld/main.js");
  window.dispatchEvent(new CustomEvent("naturion:open-overworld"));
  await wait(1800);
  assert(!document.getElementById("overworldScreen").hidden, "Mapa não abriu pelo fluxo real.");
  assert(document.querySelector("#overworldViewport canvas"), "Canvas ausente.");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", bubbles: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft", bubbles: true }));
  await wait(650);
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW", bubbles: true }));
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "ShiftLeft", bubbles: true }));
  await wait(250);
  document.getElementById("overworldTeamButton").click();
  assert(!document.getElementById("overworldTeamPanel").hidden, "Equipe não abriu.");
  document.getElementById("overworldTeamClose").click();
  document.getElementById("overworldBackMap").click();
  assert(returned && document.getElementById("overworldScreen").hidden, "Retorno ao mapa-múndi falhou.");
  assert(savedState?.mapId === "bosque-luminal-overworld", "Save do overworld ausente.");
  assert(savedState.position.z < 19.5, `A posição final não foi salva após o retorno ao mapa: ${JSON.stringify(savedState)}`);
  assert(errors.length === 0, "Erros de execução detectados.");
  document.documentElement.dataset.testStatus = "passed";
  output.textContent = JSON.stringify({ collisions: checks.length, houses: 2, npcs: 3, naturions: 3, battles: ["fled", "victory"], savedState, returned });
} catch (error) {
  fail(error);
}
