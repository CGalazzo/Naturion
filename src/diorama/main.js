import { DioramaEngine } from "./engine.js";
import { InputController } from "./input-controller.js";
import { PlayerController } from "./player-controller.js";
import { EntitySystem } from "./entity-system.js";
import { BattleBridge } from "./battle-bridge.js";
import { bosqueClareiraStage, buildBosqueClareira, bosqueEntities } from "./stages/bosque-clareira.js";

const screen = document.getElementById("dioramaScreen");
const viewport = document.getElementById("dioramaViewport");
const objective = document.getElementById("dioramaObjective");
const interactionPrompt = document.getElementById("dioramaInteraction");
const stateLabel = document.getElementById("dioramaMovementState");
const backButton = document.getElementById("dioramaBackMap");
const teamButton = document.getElementById("dioramaTeamButton");
const worldMap = document.getElementById("openForestMap");
const destinationButton = document.getElementById("worldFirstDestination");
const teamPanel = document.getElementById("dioramaTeamPanel");
const teamGrid = document.getElementById("dioramaTeamGrid");
const teamClose = document.getElementById("dioramaTeamClose");

let engine = null;
let player = null;
let input = null;
let entities = null;
let stageBuild = null;
let activeInteraction = null;
let active = false;
let interactionLocked = false;
let lastSaveAt = 0;

const bridge = () => window.NaturionDioramaBridge;

const showToast = (message) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
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

const getStaticInteraction = () => {
  if (!player || !stageBuild) return null;
  const position = player.group.position;
  let nearest = null;
  let distance = Infinity;
  stageBuild.interactions.forEach((interaction) => {
    const currentDistance = Math.hypot(position.x - interaction.position.x, position.z - interaction.position.z);
    if (currentDistance < distance) {
      nearest = interaction;
      distance = currentDistance;
    }
  });
  if (!nearest || distance > 2.35) return null;
  return { ...nearest, label: nearest.label };
};

const handleInteraction = async () => {
  if (!active || interactionLocked || !activeInteraction) return;
  interactionLocked = true;
  input.reset();
  try {
    if (activeInteraction.type === "naturion") {
      await entities.interact();
      screen.hidden = false;
      active = true;
      engine.start();
      objective.textContent = bosqueClareiraStage.objective;
    } else if (activeInteraction.type === "blocked") {
      engine.focusOn(bosqueClareiraStage.focusPoints.blockedGate, { duration: 0.75, zoom: 1.12 });
      objective.textContent = "A passagem está selada. Um puzzle será adicionado em uma próxima etapa.";
      showToast("Passagem bloqueada: estrutura pronta para receber um puzzle.");
      window.setTimeout(() => {
        engine.returnToPlayer();
        objective.textContent = bosqueClareiraStage.objective;
      }, 1800);
    } else if (activeInteraction.type === "reserved") {
      engine.focusOn(bosqueClareiraStage.focusPoints.npcArena, { duration: 0.7, zoom: 1.1 });
      showToast("Área reservada para a futura batalha obrigatória contra NPC.");
      window.setTimeout(() => engine.returnToPlayer(), 1500);
    } else if (activeInteraction.type === "exit") {
      engine.focusOn(bosqueClareiraStage.focusPoints.finalArea, { duration: 0.75, zoom: 1.08 });
      showToast("A próxima fase ainda não foi construída.");
      window.setTimeout(() => engine.returnToPlayer(), 1500);
    } else if (activeInteraction.type === "shortcut") {
      showToast("Atalho fechado. Ele poderá ser liberado futuramente.");
    }
  } finally {
    interactionLocked = false;
  }
};

const openTeam = () => {
  const playerData = getPlayerSnapshot();
  const team = playerData.team || [];
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

const savePosition = () => {
  if (!player || !active) return;
  const now = performance.now();
  if (now - lastSaveAt < 900) return;
  lastSaveAt = now;
  bridge()?.saveState?.({
    stageId: bosqueClareiraStage.id,
    position: {
      x: Number(player.group.position.x.toFixed(3)),
      z: Number(player.group.position.z.toFixed(3))
    }
  });
};

const returnToMap = () => {
  if (!active) return;
  savePosition();
  active = false;
  input.reset();
  teamPanel.hidden = true;
  setPrompt(null);
  engine.stop();
  screen.hidden = true;
  worldMap.hidden = false;
  bridge()?.returnToWorldMap?.();
  destinationButton?.focus();
};

const createScene = () => {
  const playerData = getPlayerSnapshot();
  const saved = playerData.dioramaProgress?.stageId === bosqueClareiraStage.id ? playerData.dioramaProgress.position : null;
  const startPosition = saved && Number.isFinite(saved.x) && Number.isFinite(saved.z) ? saved : bosqueClareiraStage.startPosition;
  engine = new DioramaEngine({ container: viewport, stage: bosqueClareiraStage });
  stageBuild = buildBosqueClareira({ scene: engine.scene, engine });

  input = new InputController({
    isActive: () => active && !screen.hidden && teamPanel.hidden,
    onInteract: handleInteraction,
    onMenu: openTeam,
    onEscape: returnToMap
  });

  const characterImage = playerData.character === "female" ? "assets/selection/hero-female.webp" : "assets/selection/hero-male.webp";
  player = new PlayerController({ scene: engine.scene, stage: bosqueClareiraStage, input, characterImage, startPosition });
  engine.setPlayerObject(player.group);
  engine.cameraTarget.copy(player.group.position);

  const battleBridge = new BattleBridge({ stageId: bosqueClareiraStage.id, sceneImage: bosqueClareiraStage.sceneImage });
  entities = new EntitySystem({
    scene: engine.scene,
    stage: bosqueClareiraStage,
    forms: window.__naturionEcho?.forms,
    onEncounter: async (entity) => {
      active = false;
      engine.stop();
      setPrompt(null);
      const result = await battleBridge.start(entity);
      active = true;
      engine.start();
      if (result?.outcome === "victory") showToast(`${entity.form.name} foi derrotado. Você retornou ao bosque.`);
      if (result?.outcome === "fled") showToast("Você recuou e retornou ao bosque.");
      return result;
    }
  });
  entities.spawn(bosqueEntities);

  engine.addUpdater((delta, elapsed) => {
    const movement = player.update(delta, elapsed);
    engine.updateCamera(delta, movement.velocity);
    const naturionInteraction = entities.update(delta, elapsed, player.group.position);
    const nextInteraction = naturionInteraction ? entities.getInteraction() : getStaticInteraction();
    if (nextInteraction?.id !== activeInteraction?.id || nextInteraction?.type !== activeInteraction?.type) setPrompt(nextInteraction);
    stateLabel.textContent = movement.state === "running" ? "Correndo" : movement.state === "walking" ? "Caminhando" : "Parado";
    savePosition();
  });
};

const enterDiorama = async () => {
  if (active || !screen) return;
  await bridge()?.requestStageEntry?.();
  bridge()?.prepareStageEntry?.();
  worldMap.hidden = true;
  teamPanel.hidden = true;
  screen.hidden = false;
  objective.textContent = bosqueClareiraStage.objective;
  if (!engine) createScene();
  active = true;
  input.enabled = true;
  engine.start();
  viewport.focus();
  showToast("WASD ou setas para mover · Shift para correr · E para interagir");
};

const handleDestination = async (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  await enterDiorama();
};

destinationButton?.addEventListener("click", handleDestination, true);
backButton?.addEventListener("click", returnToMap);
teamButton?.addEventListener("click", openTeam);
teamClose?.addEventListener("click", () => {
  teamPanel.hidden = true;
  viewport.focus();
});
teamPanel?.addEventListener("click", (event) => {
  if (event.target === teamPanel) {
    teamPanel.hidden = true;
    viewport.focus();
  }
});
window.addEventListener("keydown", (event) => {
  if (!active || teamPanel.hidden || event.code !== "Escape") return;
  event.preventDefault();
  teamPanel.hidden = true;
  viewport.focus();
});
window.addEventListener("naturion:open-diorama", enterDiorama);
window.addEventListener("beforeunload", savePosition);
