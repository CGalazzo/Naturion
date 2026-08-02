import { OverworldEngine } from "./engine.js";
import { OverworldCamera } from "./camera.js";
import { OverworldInput } from "./input.js";
import { OverworldPlayer } from "./player.js";
import {
  clareiraDosEcosMap,
  buildClareiraDosEcos
} from "./maps/clareira-dos-ecos.js?v=3";

const screen = document.getElementById("echoOverworldScreen");
const viewport = document.getElementById("echoOverworldViewport");
const objective = document.getElementById("echoOverworldObjective");
const stateLabel = document.getElementById("echoOverworldMovementState");
const backButton = document.getElementById("echoOverworldBackMap");
const teamButton = document.getElementById("echoOverworldTeamButton");
const worldMap = document.getElementById("openForestMap");
const destinationButton = document.getElementById("worldFirstDestination");
const teamPanel = document.getElementById("echoOverworldTeamPanel");
const teamGrid = document.getElementById("echoOverworldTeamGrid");
const teamClose = document.getElementById("echoOverworldTeamClose");

let engine = null;
let camera = null;
let player = null;
let input = null;
let mapBuild = null;
let active = false;
let lastSaveAt = 0;

const bridge = () => window.NaturionOverworldBridge;
const getPlayerSnapshot = () => bridge()?.getPlayer?.() || {};

const showToast = (message) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2300);
};

const getSavedPosition = () => {
  const progress = getPlayerSnapshot().echoOverworldProgress;
  if (progress?.mapId !== clareiraDosEcosMap.id) return clareiraDosEcosMap.startPosition;
  const x = Number(progress.position?.x);
  const z = Number(progress.position?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return clareiraDosEcosMap.startPosition;
  return { x, z };
};

const renderTeam = () => {
  const playerData = getPlayerSnapshot();
  const team = [playerData.starter, ...(playerData.team || [])].filter(Boolean).slice(0, 3);
  teamGrid.replaceChildren();
  if (!team.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nenhum Naturion está registrado na equipe.";
    teamGrid.append(empty);
    return;
  }

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
};

const openTeam = () => {
  if (!active) return;
  input?.reset?.();
  renderTeam();
  teamPanel.hidden = false;
  teamClose.focus();
};

const closeTeam = () => {
  teamPanel.hidden = true;
  viewport?.focus();
};

const savePosition = (force = false) => {
  if (!player || !active) return;
  const now = performance.now();
  if (!force && now - lastSaveAt < 900) return;
  lastSaveAt = now;
  bridge()?.saveEchoMapState?.({
    mapId: clareiraDosEcosMap.id,
    position: {
      x: Number(player.group.position.x.toFixed(3)),
      z: Number(player.group.position.z.toFixed(3))
    },
    direction: player.rig.direction
  });
};

const returnToMap = () => {
  if (!active) return;
  savePosition(true);
  active = false;
  input?.reset?.();
  teamPanel.hidden = true;
  engine?.stop?.();
  screen.hidden = true;
  worldMap.hidden = false;
  bridge()?.returnEchoMapToWorld?.();
  destinationButton?.focus();
};

const createScene = () => {
  const playerData = getPlayerSnapshot();
  const savedPosition = getSavedPosition();

  engine = new OverworldEngine({ container: viewport, map: clareiraDosEcosMap });
  camera = new OverworldCamera({ engine, map: clareiraDosEcosMap });
  mapBuild = buildClareiraDosEcos({ scene: engine.scene, engine });

  input = new OverworldInput({
    isActive: () => active && !screen.hidden && teamPanel.hidden,
    onInteract: () => {},
    onMenu: openTeam,
    onEscape: returnToMap,
    elements: {
      joystickBase: document.getElementById("echoOverworldJoystick"),
      joystickKnob: document.getElementById("echoOverworldJoystickKnob"),
      interactButton: document.getElementById("echoOverworldMobileInteract"),
      runButton: document.getElementById("echoOverworldMobileRun"),
      teamButton: document.getElementById("echoOverworldMobileTeam"),
      mapButton: document.getElementById("echoOverworldMobileMap")
    }
  });

  const characterImage = playerData.character === "female"
    ? "assets/selection/hero-female.webp"
    : "assets/selection/hero-male.webp";
  const safeStart = mapBuild.collision.collides(savedPosition.x, savedPosition.z, 0.56)
    ? clareiraDosEcosMap.startPosition
    : savedPosition;
  player = new OverworldPlayer({
    scene: engine.scene,
    collision: mapBuild.collision,
    input,
    characterImage,
    startPosition: safeStart
  });
  camera.setPlayerObject(player.group);

  engine.addUpdater((delta) => {
    const movement = player.update(delta);
    camera.update(delta, movement.velocity);
    stateLabel.textContent = movement.state === "running"
      ? "Correndo"
      : movement.state === "walking"
        ? "Caminhando"
        : "Parado";
    savePosition();
  });
};

const recoverFromMapError = (error) => {
  console.error("[Naturion Overworld] Falha ao carregar a Clareira dos Ecos:", error);
  active = false;
  try { input?.reset?.(); } catch {}
  try { engine?.stop?.(); } catch {}
  screen.hidden = true;
  worldMap.hidden = false;
  bridge()?.returnEchoMapToWorld?.();
  showToast("Não foi possível carregar a Clareira dos Ecos. Tente novamente.");
};

const enterClareira = () => {
  if (active || !screen) return;
  try {
    bridge()?.prepareEchoMapEntry?.();
    worldMap.hidden = true;
    teamPanel.hidden = true;
    screen.hidden = false;
    objective.textContent = clareiraDosEcosMap.objective;
    if (!engine) createScene();
    else {
      const savedPosition = getSavedPosition();
      const safeStart = mapBuild.collision.collides(savedPosition.x, savedPosition.z, 0.56)
        ? clareiraDosEcosMap.startPosition
        : savedPosition;
      player.teleport(safeStart);
      camera.setPlayerObject(player.group);
    }
    active = true;
    input.enabled = true;
    engine.start();
    viewport.focus();
    showToast("Clareira dos Ecos · WASD para mover · Shift para correr");
  } catch (error) {
    recoverFromMapError(error);
  }
};

backButton?.addEventListener("click", returnToMap);
teamButton?.addEventListener("click", openTeam);
teamClose?.addEventListener("click", closeTeam);
teamPanel?.addEventListener("click", (event) => {
  if (event.target === teamPanel) closeTeam();
});
window.addEventListener("keydown", (event) => {
  if (!active || event.code !== "Escape" || teamPanel.hidden) return;
  event.preventDefault();
  closeTeam();
});
window.addEventListener("naturion:open-echo-overworld", enterClareira);
window.addEventListener("naturion:overworld-art-error", (event) => {
  if (!String(event.detail?.url || "").includes("clareira-dos-ecos")) return;
  recoverFromMapError(new Error(event.detail?.reason || "Falha na arte da Clareira dos Ecos"));
});
window.addEventListener("beforeunload", () => savePosition(true));
