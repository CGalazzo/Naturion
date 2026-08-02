import { OverworldEngine } from "./engine.js";
import { OverworldCamera } from "./camera.js";
import { OverworldInput } from "./input.js";
import { OverworldPlayer } from "./player.js";
import { OverworldEntities } from "./entities.js";
import { OverworldBattleBridge } from "./battle-bridge.js";
import {
  bosqueLuminalMap,
  buildBosqueLuminal,
  isBosqueLuminalWalkable
} from "./maps/bosque-luminal.js";

const TUTORIAL_OBJECTIVE = "Siga a orientação da Dra. Íris e encontre Plumirel.";
const TUTORIAL_PLUMIREL = Object.freeze({
  id: "plumirel",
  name: "Plumirel",
  type: "Voador",
  image: "assets/map/plumirel.webp",
  stage: 1
});
const TUTORIAL_NPCS = Object.freeze([
  Object.freeze({
    id: "dra-iris-tutorial",
    name: "Dra. Íris",
    image: "assets/story/dr-iris.webp",
    aspect: 571 / 1090,
    scale: 3.8,
    steady: true,
    position: Object.freeze({ x: -3.4, z: 8.2 }),
    dialogue: "Muito bem! Siga o caminho central. Plumirel foi avistado perto da casa ao lado do lago. Aproxime-se com calma."
  })
]);
const TUTORIAL_NATURIONS = Object.freeze([
  Object.freeze({
    id: "plumirel-tutorial",
    formId: "plumirel",
    level: 3,
    behavior: "idle",
    flying: true,
    altitude: 2.5,
    position: Object.freeze({ x: 13.8, z: 1.4 }),
    speed: 0,
    scale: 2.25
  })
]);

const screen = document.getElementById("overworldScreen");
const viewport = document.getElementById("overworldViewport");
const objective = document.getElementById("overworldObjective");
const interactionPrompt = document.getElementById("overworldInteraction");
const stateLabel = document.getElementById("overworldMovementState");
const backButton = document.getElementById("overworldBackMap");
const teamButton = document.getElementById("overworldTeamButton");
const worldMap = document.getElementById("openForestMap");
const destinationButton = document.getElementById("worldFirstDestination");
const teamPanel = document.getElementById("overworldTeamPanel");
const teamGrid = document.getElementById("overworldTeamGrid");
const teamClose = document.getElementById("overworldTeamClose");
const dialogue = document.getElementById("overworldDialogue");
const dialogueName = document.getElementById("overworldDialogueName");
const dialogueText = document.getElementById("overworldDialogueText");
const dialogueClose = document.getElementById("overworldDialogueClose");

let engine = null;
let camera = null;
let player = null;
let input = null;
let entities = null;
let mapBuild = null;
let activeInteraction = null;
let active = false;
let interactionLocked = false;
let lastSaveAt = 0;
let encounterCooldownUntil = 0;
let touchEncounterPending = false;
let tutorialActive = false;

const bridge = () => window.NaturionOverworldBridge;

const showToast = (message) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2300);
};

const getPlayerSnapshot = () => bridge()?.getPlayer?.() || {};

const setPrompt = (interaction) => {
  activeInteraction = interaction;
  if (!interaction) {
    interactionPrompt.hidden = true;
    interactionPrompt.textContent = "";
    return;
  }
  interactionPrompt.textContent = interaction.label;
  interactionPrompt.hidden = false;
};

const showDialogue = ({ name = "Bosque Luminal", message }) => {
  input?.reset?.();
  dialogueName.textContent = name;
  dialogueText.textContent = message;
  dialogue.hidden = false;
  dialogueClose.focus();
};

const closeDialogue = () => {
  dialogue.hidden = true;
  viewport?.focus();
};

const recoverFromOverworldError = (error) => {
  console.error("[Naturion Overworld] Falha ao carregar o tutorial do Bosque Luminal:", error);
  active = false;
  interactionLocked = false;
  try { input?.reset?.(); } catch (resetError) { console.warn(resetError); }
  try { input?.dispose?.(); } catch (disposeError) { console.warn(disposeError); }
  try { entities?.dispose?.(); } catch (disposeError) { console.warn(disposeError); }
  try { player?.dispose?.(); } catch (disposeError) { console.warn(disposeError); }
  try { mapBuild?.dispose?.(); } catch (disposeError) { console.warn(disposeError); }
  try { engine?.dispose?.(); } catch (disposeError) { console.warn(disposeError); }
  engine = null;
  camera = null;
  player = null;
  input = null;
  entities = null;
  mapBuild = null;
  teamPanel.hidden = true;
  dialogue.hidden = true;
  setPrompt(null);
  screen.hidden = true;
  bridge()?.recoverTutorialEntry?.();
  showToast("Não foi possível carregar o Bosque Luminal. Tente iniciar o tutorial novamente.");
};

const getStaticInteraction = () => {
  // O cenário aprovado é usado aqui somente no tutorial. Portas, puzzle e
  // outros pontos do futuro mapa maior da Clareira permanecem desativados.
  return null;
};

const handleEntityDialogue = (npc) => showDialogue({ name: npc.name, message: npc.dialogue });

const handleStaticInteraction = (interaction) => {
  if (tutorialActive) return;
  if (interaction.focus) camera.focusOn(interaction.focus, { duration: .65, zoom: 1.08 });
  if (interaction.type === "gate") objective.textContent = "O portão exige um desafio ainda não disponível.";
  showDialogue({
    name: interaction.type === "door"
      ? "Casa"
      : interaction.type === "gate"
        ? "Portão de raízes"
        : interaction.type === "puzzle"
          ? "Altar Luminal"
          : "Placa",
    message: interaction.message
  });
  if (interaction.focus) {
    window.setTimeout(() => {
      camera.returnToPlayer();
      objective.textContent = TUTORIAL_OBJECTIVE;
    }, 1500);
  }
};

const handleInteraction = async () => {
  if (!active || interactionLocked || !activeInteraction || !dialogue.hidden || !teamPanel.hidden) return;
  interactionLocked = true;
  input.reset();
  try {
    if (activeInteraction.type === "naturion" || activeInteraction.type === "npc") await entities.interact();
    else handleStaticInteraction(activeInteraction);
  } finally {
    interactionLocked = false;
  }
};

const openTeam = () => {
  if (!active || !dialogue.hidden) return;
  const playerData = getPlayerSnapshot();
  const team = [playerData.starter, ...(playerData.team || [])].filter(Boolean).slice(0, 3);
  teamGrid.replaceChildren();
  if (!team.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nenhum Naturion está registrado na equipe.";
    teamGrid.append(empty);
  } else {
    team.forEach((member) => {
      const card = document.createElement("article");
      const image = document.createElement("img");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      const info = document.createElement("small");
      image.src = member.image || window.__naturionEcho?.forms?.[member.formId]?.image || "";
      image.alt = member.name || "Naturion";
      name.textContent = member.name || member.formId || "Naturion";
      info.textContent = `${member.type || "Elemento desconhecido"} · Nv. ${member.level || 1}`;
      copy.append(name, info);
      card.append(image, copy);
      teamGrid.append(card);
    });
  }
  input?.reset();
  teamPanel.hidden = false;
  teamClose.focus();
};

const savePosition = (force = false) => {
  if (tutorialActive || !player || !active) return;
  const now = performance.now();
  if (!force && now - lastSaveAt < 900) return;
  lastSaveAt = now;
  bridge()?.saveState?.({
    mapId: bosqueLuminalMap.id,
    position: {
      x: Number(player.group.position.x.toFixed(3)),
      z: Number(player.group.position.z.toFixed(3))
    },
    direction: player.rig.direction
  });
};

const returnToMap = () => {
  if (!active) return;
  if (tutorialActive) {
    input?.reset?.();
    showToast("Conclua o encontro com Plumirel para avançar no tutorial.");
    return;
  }
  savePosition(true);
  active = false;
  input.reset();
  teamPanel.hidden = true;
  dialogue.hidden = true;
  setPrompt(null);
  engine.stop();
  screen.hidden = true;
  worldMap.hidden = false;
  bridge()?.returnToWorldMap?.();
  destinationButton?.focus();
};

const runEncounter = async (entity) => {
  if (tutorialActive) {
    active = false;
    input?.reset?.();
    setPrompt(null);
    engine.stop();
    screen.hidden = true;
    const result = await bridge()?.startTutorialBattle?.({
      formId: entity.formId,
      name: entity.form.name,
      level: entity.level
    });
    return result || { outcome: "tutorial-started" };
  }
  active = false;
  engine.stop();
  setPrompt(null);
  const battleBridge = new OverworldBattleBridge({
    mapId: bosqueLuminalMap.id,
    sceneImage: bosqueLuminalMap.sceneImage
  });
  const result = await battleBridge.start(entity);
  active = true;
  engine.start();
  encounterCooldownUntil = performance.now() + 1800;
  if (result?.outcome === "victory") showToast(`${entity.form.name} foi derrotado. Você retornou à Clareira dos Ecos.`);
  if (result?.outcome === "fled") showToast("Você recuou e retornou ao mesmo local.");
  if (result?.outcome === "defeat") showToast("Sua equipe se recuperou e voltou à Clareira dos Ecos.");
  return result;
};

const applyApprovedMapCollision = (collision) => {
  if (!collision) return collision;
  collision.collides = (x, z, radius = 0.56) => !isBosqueLuminalWalkable(x, z, radius);
  return collision;
};

const createScene = () => {
  const playerData = getPlayerSnapshot();
  const startPosition = bosqueLuminalMap.startPosition;

  engine = new OverworldEngine({ container: viewport, map: bosqueLuminalMap });
  camera = new OverworldCamera({ engine, map: bosqueLuminalMap });
  mapBuild = buildBosqueLuminal({ scene: engine.scene, engine });
  applyApprovedMapCollision(mapBuild.collision);

  input = new OverworldInput({
    isActive: () => active && !screen.hidden && teamPanel.hidden && dialogue.hidden,
    onInteract: handleInteraction,
    onMenu: openTeam,
    onEscape: () => {
      input?.reset?.();
      showToast("Conclua o encontro com Plumirel para avançar no tutorial.");
    },
    elements: {
      joystickBase: document.getElementById("overworldJoystick"),
      joystickKnob: document.getElementById("overworldJoystickKnob"),
      interactButton: document.getElementById("overworldMobileInteract"),
      runButton: document.getElementById("overworldMobileRun"),
      teamButton: document.getElementById("overworldMobileTeam"),
      mapButton: document.getElementById("overworldMobileMap")
    }
  });

  const characterImage = playerData.character === "female"
    ? "assets/selection/hero-female.webp"
    : "assets/selection/hero-male.webp";
  player = new OverworldPlayer({
    scene: engine.scene,
    collision: mapBuild.collision,
    input,
    characterImage,
    startPosition
  });
  camera.setPlayerObject(player.group);

  entities = new OverworldEntities({
    scene: engine.scene,
    collision: mapBuild.collision,
    forms: {
      ...(window.__naturionEcho?.forms || {}),
      plumirel: TUTORIAL_PLUMIREL
    },
    onEncounter: runEncounter,
    onDialogue: handleEntityDialogue
  });
  entities.spawn({ naturions: TUTORIAL_NATURIONS, npcs: TUTORIAL_NPCS });

  engine.addUpdater((delta, elapsed) => {
    const movement = player.update(delta, elapsed);
    camera.update(delta, movement.velocity);
    const entityInteraction = entities.update(delta, elapsed, player.group.position);
    const nextInteraction = entityInteraction ? entities.getInteraction() : getStaticInteraction();
    if (nextInteraction?.id !== activeInteraction?.id || nextInteraction?.type !== activeInteraction?.type) {
      setPrompt(nextInteraction);
    }
    stateLabel.textContent = movement.state === "running"
      ? "Correndo"
      : movement.state === "walking"
        ? "Caminhando"
        : "Parado";
    savePosition();
    if (
      !touchEncounterPending
      && performance.now() >= encounterCooldownUntil
      && entities.touchTarget
      && active
      && dialogue.hidden
      && teamPanel.hidden
    ) {
      touchEncounterPending = true;
      entities.consumeTouchEncounter().finally(() => { touchEncounterPending = false; });
    }
  });
};

const enterOverworld = async () => {
  if (active || !screen) return;
  try {
    tutorialActive = true;
    bridge()?.prepareTutorialEntry?.();
    worldMap.hidden = true;
    teamPanel.hidden = true;
    dialogue.hidden = true;
    screen.hidden = false;
    backButton.hidden = true;
    document.getElementById("overworldMobileMap").hidden = true;
    objective.textContent = TUTORIAL_OBJECTIVE;
    if (!engine) createScene();
    else player.teleport(bosqueLuminalMap.startPosition);
    active = true;
    input.enabled = true;
    engine.start();
    viewport.focus();
    showToast("WASD ou setas para mover · Shift para correr · E para falar");
    window.setTimeout(() => {
      if (!active || !tutorialActive || !dialogue.hidden) return;
      showDialogue({
        name: "Dra. Íris",
        message: "Este é o Bosque Luminal. Use WASD ou as setas para caminhar, Shift para correr e siga pela trilha até Plumirel. Eu estarei logo à frente caso precise falar comigo."
      });
    }, 420);
  } catch (error) {
    recoverFromOverworldError(error);
  }
};

const handleDestination = async (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  await bridge()?.showEchoMapPending?.();
};

destinationButton?.addEventListener("click", handleDestination, true);
backButton?.addEventListener("click", returnToMap);
teamButton?.addEventListener("click", openTeam);
teamClose?.addEventListener("click", () => {
  teamPanel.hidden = true;
  viewport.focus();
});
dialogueClose?.addEventListener("click", closeDialogue);
teamPanel?.addEventListener("click", (event) => {
  if (event.target === teamPanel) {
    teamPanel.hidden = true;
    viewport.focus();
  }
});
dialogue?.addEventListener("click", (event) => {
  if (event.target === dialogue) closeDialogue();
});
window.addEventListener("keydown", (event) => {
  if (!active || event.code !== "Escape") return;
  if (!teamPanel.hidden) {
    event.preventDefault();
    teamPanel.hidden = true;
    viewport.focus();
  } else if (!dialogue.hidden) {
    event.preventDefault();
    closeDialogue();
  }
});
window.addEventListener("naturion:open-overworld-tutorial", enterOverworld);
window.addEventListener("beforeunload", () => savePosition(true));
