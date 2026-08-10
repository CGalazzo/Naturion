const MAP_ID = "santuario-central-overworld";
const screen = document.getElementById("centralSanctuaryScreen");
const worldMap = document.getElementById("openForestMap");
const destination = document.getElementById("worldCentralDestination");
const bridge = () => window.NaturionOverworldBridge;
const player = () => bridge()?.getPlayer?.() || {};
const forms = () => window.__naturionEcho?.forms || {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const LEVELS = Object.freeze([
  { id: "entrada", title: "Entrada do Santuário", subtitle: "Nível 1 de 3 · Naturions Nv. 10–12", scene: "/assets/sanctuary/scenes/entrada.webp", min: 10, max: 12 },
  { id: "galerias", title: "Galerias do Santuário", subtitle: "Nível 2 de 3 · Naturions Nv. 11–14", scene: "/assets/sanctuary/scenes/galerias.webp", min: 11, max: 14 },
  { id: "nucleo", title: "Núcleo do Santuário", subtitle: "Nível 3 de 3 · Naturions Nv. 13–16", scene: "/assets/sanctuary/scenes/nucleo.webp", min: 13, max: 16 }
]);

// Somente primeiras formas selvagens. Macabroto é uma espécie única e
// independente: aparece em todos os níveis e não evolui para/de outra forma.
const WILD_FORMS = Object.freeze([
  "pedrilho", "leonito", "hidropotamo", "rinolito", "tartarim",
  "macabroto", "faistrino", "croquim", "gororoc"
]);

const GUARDIAN_TEAM = Object.freeze([
  { formId: "rocichifre", level: 15 },
  { formId: "terratuga", level: 16 },
  { formId: "terralion", level: 18 }
]);

let active = false;
let busy = false;
let guardianBattle = false;
let state = null;
let ui = null;
let frame = 0;
let lastFrame = 0;
let lastSave = 0;
let logs = [];
let encounters = [];
let defeatScope = "level";
let defeatTimer = 0;
let defeatSeconds = 5;
let storyStep = 0;

const html = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const toast = (message) => {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2400);
};

const appendStylesheet = (id, href) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
};

const ensureCss = () => {
  appendStylesheet("idlePhaseOneCss", "src/overworld/idle/phase1.css?v=8");
  appendStylesheet("idleTreadmillCss", "src/overworld/idle/treadmill.css?v=4");
  appendStylesheet("centralSanctuaryCss", "src/overworld/idle/central-sanctuary.css?v=2");
};

const formFor = (id) => forms()[id] || { id, name: id || "Naturion", type: "Natureza", image: "" };

const roster = () => {
  const snapshot = player();
  const catalog = new Map();
  [snapshot.starter, ...(snapshot.team || []), ...(snapshot.storage || [])]
    .filter(Boolean)
    .forEach((member) => catalog.set(member.uid || `${member.formId || member.id}-${member.name}`, member));
  const order = Array.isArray(snapshot.partyOrderUids)
    ? snapshot.partyOrderUids
    : [snapshot.starter?.uid, ...(snapshot.team || []).map((member) => member.uid)];
  return order.map((uid) => catalog.get(uid)).filter(Boolean).slice(0, 3);
};

const randomSeed = () => Math.floor(Math.random() * 2147483646) + 1;

const seededRandom = (seed) => {
  let value = Math.max(1, Number(seed) || 1) % 2147483647;
  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const makeEncounters = (levelIndex) => {
  const level = LEVELS[levelIndex];
  const random = seededRandom(state.levelSeeds[levelIndex]);
  const shuffled = [...WILD_FORMS];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.map((formId, index) => ({
    id: `central-${level.id}-${index + 1}-${formId}`,
    at: 10 + index * 10,
    formId,
    level: level.min + Math.floor(random() * (level.max - level.min + 1))
  }));
};

const loadState = () => {
  const saved = player().centralSanctuaryProgress || {};
  const levelIndex = clamp(Number(saved.levelIndex) || 0, 0, 2);
  return {
    levelIndex,
    progress: clamp(Number(saved.progress) || 0, 0, 100),
    running: false,
    speed: [1, 2, 3].includes(Number(saved.speed)) ? Number(saved.speed) : 1,
    battleMode: saved.battleMode === "manual" ? "manual" : "automatic",
    completedIds: Array.isArray(saved.completedEncounterIds) ? [...saved.completedEncounterIds] : [],
    wins: Math.max(0, Number(saved.battlesWon) || 0),
    captures: Math.max(0, Number(saved.captures) || 0),
    defeats: Math.max(0, Number(saved.defeats) || 0),
    levelSeeds: Array.isArray(saved.levelSeeds) && saved.levelSeeds.length === 3
      ? saved.levelSeeds.map((seed) => Number(seed) || randomSeed())
      : [randomSeed(), randomSeed(), randomSeed()],
    guardianDefeated: Boolean(saved.guardianDefeated),
    puzzleTwoUnlocked: Boolean(saved.puzzleTwoUnlocked)
  };
};

const savePayload = () => ({
  mapId: MAP_ID,
  levelIndex: state.levelIndex,
  levelId: LEVELS[state.levelIndex].id,
  progress: Number(state.progress.toFixed(2)),
  running: Boolean(state.running && !busy),
  speed: state.speed,
  battleMode: state.battleMode,
  completedEncounterIds: [...state.completedIds],
  levelSeeds: [...state.levelSeeds],
  battlesWon: state.wins,
  captures: state.captures,
  defeats: state.defeats,
  guardianDefeated: state.guardianDefeated,
  puzzleTwoUnlocked: state.puzzleTwoUnlocked,
  updatedAt: new Date().toISOString()
});

const save = (force = false) => {
  if (!state || !bridge()?.saveCentralSanctuaryState) return;
  const now = performance.now();
  if (!force && now - lastSave < 1200) return;
  lastSave = now;
  bridge().saveCentralSanctuaryState(savePayload());
};

const addLog = (message, kind = "info") => {
  logs.unshift({ message, kind, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
  logs = logs.slice(0, 6);
  if (!ui) return;
  ui.log.innerHTML = logs.map((entry) => `<div class="idle-log-entry" data-kind="${html(entry.kind)}"><time>${html(entry.time)}</time><span>${html(entry.message)}</span></div>`).join("");
};

// O Santuário usa a mesma esteira limpa da Clareira: uma única faixa inteira,
// sem repetir a imagem em recortes de profundidade que criem sobreposições.
const treadmillMarkup = () => `<div class="idle-treadmill" aria-hidden="true">
  <div class="idle-treadmill-layer idle-treadmill-mid"><div class="idle-treadmill-strip"><span></span><span></span><span></span><span></span></div></div>
</div>`;

const build = () => {
  ensureCss();
  screen.classList.add("idle-host");
  screen.innerHTML = `
    <main class="idle-app" style="--speed:1;--sanctuary-scene:url('${LEVELS[0].scene}')">
      <header class="idle-top"><div class="idle-title"><small>Expedição idle · Santuário Central</small><h1 data-map-title>Entrada do Santuário</h1><div class="central-level-pips" aria-label="Níveis do Santuário"><i></i><i></i><i></i></div></div><div class="idle-actions"><button class="idle-btn alt" type="button" data-action="team">Equipe</button><button class="idle-btn warn" type="button" data-action="map">Voltar ao mapa</button></div></header>
      <section class="idle-main">
        <div class="idle-scene" data-treadmill-ready="true">${treadmillMarkup()}<div class="idle-badge"><strong data-scene-title>Preparando expedição</strong><br><span data-scene-message>Inicie a jornada automática.</span></div><div class="idle-party"><div class="idle-hero-box"><img class="idle-hero idle-hero-static" alt=""><span class="idle-hero-walk" aria-hidden="true"></span></div><div class="idle-followers"></div></div><div class="idle-wild"><img alt=""><strong></strong></div></div>
        <aside class="idle-side">
          <section class="idle-card"><div class="idle-progress-head"><div><h2>Progresso</h2><div class="idle-percent" data-progress>0%</div></div><span data-run-state>Pausada</span></div><div class="idle-track"><div class="idle-fill"></div><div class="idle-marks"><i></i><i></i><i></i><i></i><i></i></div></div><p class="idle-segment" data-segment></p></section>
          <section class="idle-card"><h2>Resultados</h2><div class="idle-stats"><div class="idle-stat"><strong data-wins>0</strong><small>Vitórias</small></div><div class="idle-stat"><strong data-captures>0</strong><small>Absorções</small></div><div class="idle-stat"><strong data-defeats>0</strong><small>Recuos</small></div></div></section>
          <section class="idle-card"><h2>Velocidade</h2><div class="idle-speeds"><button class="idle-speed" type="button" data-speed="1">1×</button><button class="idle-speed" type="button" data-speed="2">2×</button><button class="idle-speed" type="button" data-speed="3">3×</button></div><h2 class="idle-mode-heading">Modo de batalha</h2><button class="idle-battle-mode" type="button" data-action="battle-mode" data-mode="automatic" aria-pressed="true"><strong data-battle-mode-title>Automática</strong><small data-battle-mode-help>A equipe escolhe seus próprios golpes.</small></button></section>
          <section class="idle-card log-card"><h2>Registro</h2><div class="idle-log" aria-live="polite"></div></section>
        </aside>
      </section>
      <footer class="idle-bottom"><div class="idle-objective"><strong>Objetivo:</strong><span data-objective> atravesse os três níveis.</span></div><button class="idle-btn idle-primary" type="button" data-action="toggle">Iniciar expedição</button></footer>
    </main>
    <div class="central-flash" hidden><article><small>Essência estabilizada</small><h2 data-flash-title></h2></article></div>
    <div class="idle-defeat" hidden><section class="idle-defeat-dialog" role="alertdialog" aria-modal="true"><small>Equipe sem energia</small><h2>Todos os seus Naturions foram derrotados!</h2><p data-defeat-copy></p><strong class="idle-defeat-countdown">Reinício automático em <span data-defeat-seconds>5</span> segundos</strong><div class="idle-defeat-actions"><button class="idle-btn" type="button" data-action="restart-defeat">Reiniciar aventura</button><button class="idle-btn warn" type="button" data-action="map-defeat">Voltar ao mapa Naturion</button></div></section></div>
    <section class="central-guardian" hidden><article class="central-guardian-card"><div class="central-guardian-art"><div class="central-guardian-sprite" role="img" aria-label="Guardião do Núcleo em pixel art"></div></div><div><small>Guardião do Núcleo</small><h2>A prova antes do Puzzle 2</h2><p>“A Essência dos Ecos abriu o caminho, mas somente uma equipe em sintonia alcançará o grande cristal. Supere meus três Naturions.”</p><ul class="central-guardian-team"><li><strong>Rocichifre</strong> · Nv. 15</li><li><strong>Terratuga</strong> · Nv. 16</li><li><strong>Terralion</strong> · Nv. 18</li></ul><div class="central-guardian-progress" aria-label="Progresso do desafio"><i></i><i></i><i></i></div><div class="central-dialog-actions"><button class="idle-btn" type="button" data-action="guardian">Aceitar o desafio</button><button class="idle-btn alt" type="button" data-action="guardian-map">Voltar ao mapa</button></div></div></article></section>
    <section class="central-puzzle-two" hidden><article class="central-puzzle-card"><div class="central-puzzle-crystal" aria-hidden="true"></div><small>Puzzle 2 liberado</small><h2>O Grande Cristal reconheceu sua equipe</h2><p>O altar do Núcleo está acessível. A mecânica do Puzzle 2 será adicionada na próxima etapa, sem iniciar automaticamente agora.</p><div class="central-dialog-actions"><button class="idle-btn" type="button" data-action="examine-puzzle">Examinar o cristal</button><button class="idle-btn alt" type="button" data-action="puzzle-map">Voltar ao mapa</button></div></article></section>`;

  ui = {
    root: screen.querySelector(".idle-app"), title: screen.querySelector("[data-map-title]"), pips: [...screen.querySelectorAll(".central-level-pips i")],
    scene: screen.querySelector(".idle-scene"), heroBox: screen.querySelector(".idle-hero-box"), hero: screen.querySelector(".idle-hero"), followers: screen.querySelector(".idle-followers"), wild: screen.querySelector(".idle-wild"), wildImage: screen.querySelector(".idle-wild img"), wildLabel: screen.querySelector(".idle-wild strong"),
    sceneTitle: screen.querySelector("[data-scene-title]"), sceneMessage: screen.querySelector("[data-scene-message]"), progress: screen.querySelector("[data-progress]"), fill: screen.querySelector(".idle-fill"), runState: screen.querySelector("[data-run-state]"), segment: screen.querySelector("[data-segment]"), wins: screen.querySelector("[data-wins]"), captures: screen.querySelector("[data-captures]"), defeats: screen.querySelector("[data-defeats]"), objective: screen.querySelector("[data-objective]"), log: screen.querySelector(".idle-log"),
    toggle: screen.querySelector("[data-action=toggle]"), map: screen.querySelector("[data-action=map]"), team: screen.querySelector("[data-action=team]"), battleMode: screen.querySelector("[data-action=battle-mode]"), battleModeTitle: screen.querySelector("[data-battle-mode-title]"), battleModeHelp: screen.querySelector("[data-battle-mode-help]"), speedButtons: [...screen.querySelectorAll("[data-speed]")],
    flash: screen.querySelector(".central-flash"), flashTitle: screen.querySelector("[data-flash-title]"), defeat: screen.querySelector(".idle-defeat"), defeatCopy: screen.querySelector("[data-defeat-copy]"), defeatSeconds: screen.querySelector("[data-defeat-seconds]"), guardian: screen.querySelector(".central-guardian"), guardianButton: screen.querySelector("[data-action=guardian]"), guardianPips: [...screen.querySelectorAll(".central-guardian-progress i")], puzzle: screen.querySelector(".central-puzzle-two")
  };
  ui.toggle.addEventListener("click", toggle);
  ui.map.addEventListener("click", returnMap);
  ui.team.addEventListener("click", openTeam);
  ui.battleMode.addEventListener("click", toggleBattleMode);
  ui.speedButtons.forEach((button) => button.addEventListener("click", () => setSpeed(Number(button.dataset.speed))));
  screen.querySelector("[data-action=restart-defeat]").addEventListener("click", restartAfterDefeat);
  screen.querySelector("[data-action=map-defeat]").addEventListener("click", returnMap);
  ui.guardianButton.addEventListener("click", () => void challengeGuardian());
  screen.querySelector("[data-action=guardian-map]").addEventListener("click", returnMap);
  screen.querySelector("[data-action=examine-puzzle]").addEventListener("click", () => toast("O Puzzle 2 está liberado e será criado na próxima etapa."));
  screen.querySelector("[data-action=puzzle-map]").addEventListener("click", returnMap);
};

const renderParty = () => {
  const snapshot = player();
  ui.hero.src = snapshot.character === "female" ? "assets/selection/hero-female.webp" : "assets/selection/hero-male.webp";
  ui.hero.alt = snapshot.name || "Protagonista";
  ui.heroBox.dataset.variant = snapshot.character === "female" ? "female" : "male";
  ui.heroBox.setAttribute("aria-label", `${snapshot.name || "Protagonista"} caminhando para a direita`);
  ui.followers.setAttribute("aria-label", "Naturion ativo acompanhando atrás do protagonista");
  ui.followers.replaceChildren();
  roster().slice(0, 1).forEach((member) => {
    const form = formFor(member.formId || member.id);
    const box = document.createElement("div");
    const image = document.createElement("img");
    box.className = "idle-follower";
    image.src = member.image || form.image;
    image.alt = member.name || form.name;
    box.append(image);
    ui.followers.append(box);
  });
};

const render = () => {
  if (!ui || !state) return;
  const level = LEVELS[state.levelIndex];
  const automatic = state.battleMode !== "manual";
  ui.root.style.setProperty("--speed", state.speed);
  ui.root.style.setProperty("--sanctuary-scene", `url('${level.scene}')`);
  ui.scene.style.setProperty("--treadmill-image", `url('${level.scene}')`);
  ui.root.classList.toggle("running", state.running && !busy);
  ui.title.textContent = level.title;
  ui.progress.textContent = `${Math.floor(state.progress)}%`;
  ui.fill.style.width = `${state.progress}%`;
  ui.runState.textContent = busy ? "Evento" : state.running ? `Ativa · ${state.speed}×` : "Pausada";
  ui.segment.textContent = level.subtitle;
  ui.wins.textContent = state.wins;
  ui.captures.textContent = state.captures;
  ui.defeats.textContent = state.defeats;
  ui.pips.forEach((pip, index) => { pip.classList.toggle("done", index < state.levelIndex || state.guardianDefeated); pip.classList.toggle("active", index === state.levelIndex && !state.guardianDefeated); });
  ui.toggle.disabled = busy || state.guardianDefeated;
  ui.toggle.textContent = state.guardianDefeated ? "Santuário concluído" : state.running ? "Pausar expedição" : state.progress ? "Continuar expedição" : "Iniciar expedição";
  ui.sceneTitle.textContent = busy ? "Encontro no Santuário" : state.progress ? level.title : "Equipe pronta";
  ui.sceneMessage.textContent = busy ? "A batalha usará a mesma equipe e comandos da Clareira." : state.running ? `Avanço automático em ${state.speed}× · batalha ${automatic ? "automática" : "manual"}.` : "Inicie ou continue a exploração.";
  ui.objective.textContent = state.levelIndex < 2 ? ` conclua ${level.title} para alcançar o próximo nível.` : " alcance o Guardião do Núcleo.";
  ui.battleMode.disabled = busy;
  ui.battleMode.dataset.mode = automatic ? "automatic" : "manual";
  ui.battleMode.setAttribute("aria-pressed", String(automatic));
  ui.battleModeTitle.textContent = automatic ? "Automática" : "Manual";
  ui.battleModeHelp.textContent = automatic ? "A equipe escolhe seus próprios golpes." : "Você escolhe ataque, defesa ou fuga.";
  ui.speedButtons.forEach((button) => { button.classList.toggle("active", Number(button.dataset.speed) === state.speed); button.disabled = busy; });
};

const wildPreview = (data = null) => {
  if (!data) { ui.wild.classList.remove("visible", "approaching", "at-contact"); return; }
  const form = formFor(data.formId);
  ui.wildImage.src = form.image;
  ui.wildImage.alt = form.name;
  ui.wildLabel.textContent = `${form.name} · Nv. ${data.level}`;
  ui.wild.dataset.locomotion = "ground";
  ui.wild.style.setProperty("--wild-ground-offset", "0%");
  ui.wild.classList.remove("approaching", "at-contact");
  ui.wild.classList.add("visible");
};

const approachWild = (data) => new Promise((resolve) => {
  wildPreview(data);
  const duration = reducedMotion() ? 180 : 1100;
  ui.wild.style.setProperty("--wild-approach-duration", `${duration}ms`);
  void ui.wild.offsetWidth;
  requestAnimationFrame(() => ui.wild.classList.add("approaching"));
  window.setTimeout(() => { ui.wild.classList.remove("approaching"); ui.wild.classList.add("at-contact"); resolve(); }, duration + 100);
});

const autoAttack = () => {
  const choice = document.getElementById("echoBattleChoice");
  if (choice && !choice.hidden) return;
  const buttons = [...document.querySelectorAll("[data-echo-battle]")];
  const attack = buttons.find((button) => button.dataset.echoBattle === "elemental" && !button.disabled)
    || buttons.find((button) => button.dataset.echoBattle === "basic" && !button.disabled);
  if (attack?.offsetParent !== null) attack.click();
};

const encounter = async (data) => {
  if (busy || !active) return;
  busy = true;
  const resume = state.running;
  state.running = false;
  const form = formFor(data.formId);
  addLog(`${form.name} Nv. ${data.level} apareceu no ${LEVELS[state.levelIndex].title}.`, "battle");
  render();
  save(true);
  await approachWild(data);
  if (!active) { busy = false; wildPreview(); return; }
  const promise = bridge()?.startBattle?.({ stageId: MAP_ID, encounterId: data.id, formId: data.formId, level: data.level, scene: LEVELS[state.levelIndex].scene });
  if (!promise?.then) { busy = false; wildPreview(); addLog("O sistema de batalha não respondeu.", "danger"); render(); return; }
  const timer = state.battleMode === "automatic" ? window.setInterval(autoAttack, 260) : 0;
  let result;
  try { result = await promise; } finally { if (timer) window.clearInterval(timer); }
  busy = false;
  wildPreview();
  if (result?.outcome === "victory") {
    if (!state.completedIds.includes(data.id)) state.completedIds.push(data.id);
    state.wins += 1;
    state.progress = Math.max(state.progress, data.at + .8);
    if (result.captured) { state.captures += 1; addLog(`${form.name} foi absorvido e registrado.`, "capture"); }
    else addLog(`${form.name} foi derrotado. A expedição continua.`, "battle");
    state.running = resume;
    renderParty();
  } else if (result?.outcome === "defeat") {
    state.defeats += 1;
    showDefeat("level");
    return;
  } else {
    state.progress = Math.max(0, data.at - 1);
    state.running = resume;
    addLog("O encontro terminou sem vitória.");
  }
  render();
  save(true);
};

const transitionLevel = async () => {
  if (busy || state.levelIndex >= 2) return;
  busy = true;
  const resume = state.running;
  state.running = false;
  const nextIndex = state.levelIndex + 1;
  ui.flashTitle.textContent = LEVELS[nextIndex].title;
  ui.flash.hidden = false;
  render();
  await sleep(reducedMotion() ? 220 : 1650);
  state.levelIndex = nextIndex;
  state.progress = 0;
  state.completedIds = [];
  encounters = makeEncounters(nextIndex);
  ui.flash.hidden = true;
  busy = false;
  state.running = resume;
  addLog(`${LEVELS[nextIndex].title} alcançado.`, "capture");
  render();
  save(true);
  toast(`${LEVELS[nextIndex].title} liberado!`);
};

const showGuardian = () => {
  state.progress = 100;
  state.running = false;
  ui.guardianPips.forEach((pip) => pip.classList.remove("done"));
  ui.guardianButton.disabled = false;
  ui.guardianButton.textContent = "Aceitar o desafio";
  ui.guardian.hidden = false;
  render();
  save(true);
};

const challengeGuardian = async () => {
  if (guardianBattle || busy) return;
  guardianBattle = true;
  busy = true;
  ui.guardianButton.disabled = true;
  for (let index = 0; index < GUARDIAN_TEAM.length; index += 1) {
    const enemy = GUARDIAN_TEAM[index];
    const form = formFor(enemy.formId);
    ui.guardianButton.textContent = `Batalha ${index + 1} de 3`;
    addLog(`O Guardião enviou ${form.name} Nv. ${enemy.level}.`, "battle");
    const promise = bridge()?.startBattle?.({ stageId: MAP_ID, encounterId: `central-guardian-${index}-${enemy.formId}`, formId: enemy.formId, level: enemy.level, scene: LEVELS[2].scene, captureAllowed: false });
    if (!promise?.then) { guardianBattle = false; busy = false; ui.guardianButton.disabled = false; return; }
    const timer = state.battleMode === "automatic" ? window.setInterval(autoAttack, 260) : 0;
    let result;
    try { result = await promise; } finally { if (timer) window.clearInterval(timer); }
    if (result?.outcome !== "victory") {
      guardianBattle = false;
      busy = false;
      state.defeats += 1;
      ui.guardian.hidden = true;
      showDefeat("sanctuary");
      return;
    }
    state.wins += 1;
    ui.guardianPips[index].classList.add("done");
    save(true);
    await sleep(reducedMotion() ? 80 : 360);
  }
  guardianBattle = false;
  busy = false;
  state.guardianDefeated = true;
  state.puzzleTwoUnlocked = true;
  ui.guardian.hidden = true;
  ui.puzzle.hidden = false;
  addLog("Guardião vencido. O acesso ao Puzzle 2 foi liberado.", "capture");
  render();
  save(true);
  toast("Puzzle 2 liberado!");
};

const clearDefeatTimer = () => { window.clearInterval(defeatTimer); defeatTimer = 0; };

const showDefeat = (scope) => {
  defeatScope = scope;
  clearDefeatTimer();
  state.running = false;
  ui.defeatCopy.textContent = scope === "sanctuary"
    ? "A derrota para o Guardião reinicia todo o Santuário Central: você voltará à Entrada, no Nível 1 e com 0%."
    : `A expedição de ${LEVELS[state.levelIndex].title} retornará para 0%.`;
  defeatSeconds = 5;
  ui.defeatSeconds.textContent = String(defeatSeconds);
  ui.defeat.hidden = false;
  renderParty();
  render();
  save(true);
  defeatTimer = window.setInterval(() => {
    defeatSeconds -= 1;
    ui.defeatSeconds.textContent = String(Math.max(0, defeatSeconds));
    if (defeatSeconds <= 0) restartAfterDefeat();
  }, 1000);
};

function restartAfterDefeat() {
  clearDefeatTimer();
  ui.defeat.hidden = true;
  if (defeatScope === "sanctuary") state.levelIndex = 0;
  state.progress = 0;
  state.completedIds = [];
  state.guardianDefeated = false;
  state.puzzleTwoUnlocked = false;
  state.levelSeeds[state.levelIndex] = randomSeed();
  encounters = makeEncounters(state.levelIndex);
  state.running = true;
  wildPreview();
  addLog(defeatScope === "sanctuary" ? "A prova recomeçou na Entrada do Santuário." : "A equipe retornou ao início deste nível.", "capture");
  renderParty();
  render();
  save(true);
}

const tick = (time) => {
  frame = requestAnimationFrame(tick);
  if (!active || !state || !ui) return;
  const delta = lastFrame ? Math.min(.1, (time - lastFrame) / 1000) : 0;
  lastFrame = time;
  if (!state.running || busy || state.guardianDefeated || !ui.defeat.hidden || !ui.guardian.hidden || !ui.puzzle.hidden) return;
  state.progress = clamp(state.progress + delta * .6 * state.speed, 0, 100);
  const pending = encounters.find((item) => state.progress >= item.at && !state.completedIds.includes(item.id));
  if (pending) { void encounter(pending); return; }
  if (state.progress >= 100) {
    if (state.levelIndex < 2) void transitionLevel();
    else showGuardian();
    return;
  }
  render();
  save();
};

const toggle = () => { if (!active || busy || state.guardianDefeated) return; state.running = !state.running; addLog(state.running ? "A expedição começou." : "A expedição foi pausada."); render(); save(true); };
const setSpeed = (speed) => { if (busy || ![1, 2, 3].includes(speed)) return; state.speed = speed; addLog(`Velocidade ajustada para ${speed}×.`); render(); save(true); };
const toggleBattleMode = () => { if (busy) return; state.battleMode = state.battleMode === "manual" ? "automatic" : "manual"; addLog(`Batalhas em modo ${state.battleMode === "manual" ? "manual" : "automático"}.`); render(); save(true); };
const openTeam = () => { if (busy) return; state.running = false; render(); save(true); window.dispatchEvent(new CustomEvent("naturion:open-team-manager", { detail: { returnFocus: ui.team } })); };

const returnMap = () => {
  if (!active || guardianBattle) return;
  clearDefeatTimer();
  state.running = false;
  state.progress = 0;
  save(true);
  active = false;
  busy = false;
  lastFrame = 0;
  ui.defeat.hidden = true;
  ui.guardian.hidden = true;
  ui.puzzle.hidden = true;
  screen.hidden = true;
  worldMap.hidden = false;
  bridge()?.returnCentralSanctuaryToWorld?.();
  destination?.focus();
};

const enter = () => {
  if (!screen || active) return;
  bridge()?.prepareCentralSanctuaryEntry?.();
  if (!ui) build();
  state = loadState();
  encounters = makeEncounters(state.levelIndex);
  logs = [];
  busy = false;
  guardianBattle = false;
  clearDefeatTimer();
  ui.defeat.hidden = true;
  ui.guardian.hidden = true;
  ui.puzzle.hidden = !state.puzzleTwoUnlocked;
  addLog(`${LEVELS[state.levelIndex].title} preparada. As nove espécies podem aparecer nesta rota.`);
  renderParty();
  render();
  worldMap.hidden = true;
  screen.hidden = false;
  active = true;
  lastFrame = 0;
  if (!frame) frame = requestAnimationFrame(tick);
  ui.toggle.focus();
  toast(`${LEVELS[state.levelIndex].title} · Expedição pronta`);
};

const createEntryModal = () => {
  const modal = document.createElement("section");
  modal.className = "central-entry";
  modal.hidden = true;
  modal.innerHTML = `<article class="central-entry-card" role="dialog" aria-modal="true"><small>Segundo mapa · 3 níveis</small><img src="${LEVELS[0].scene}" alt="Entrada do Santuário Central em 3D pixel art"><h2>Entrar no Santuário Central?</h2><p>A mesma mecânica da Clareira dos Ecos continuará pela Entrada, Galerias e Núcleo. Ao final, o Guardião protegerá o acesso ao Puzzle 2.</p><div class="central-dialog-actions"><button class="idle-btn" type="button" data-central-entry="confirm">Entrar no Santuário</button><button class="idle-btn alt" type="button" data-central-entry="cancel">Permanecer no mapa</button></div></article>`;
  document.body.append(modal);
  modal.querySelector("[data-central-entry=cancel]").addEventListener("click", () => { modal.hidden = true; destination.focus(); });
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.hidden = true; });
  modal.querySelector("[data-central-entry=confirm]").addEventListener("click", async () => {
    const button = modal.querySelector("[data-central-entry=confirm]");
    button.disabled = true;
    modal.hidden = true;
    button.disabled = false;
    enter();
  });
  return modal;
};

const createStoryModal = () => {
  const modal = document.createElement("section");
  modal.className = "central-story";
  modal.hidden = true;
  modal.innerHTML = `<article class="central-story-card" role="dialog" aria-modal="true"><div class="central-story-visual"><img alt=""></div><div class="central-story-copy"><small data-story-speaker></small><h2 data-story-title></h2><p data-story-text></p><div class="central-dialog-actions"><button class="idle-btn" type="button" data-story-next>Continuar</button></div></div></article>`;
  document.body.append(modal);
  modal.querySelector("[data-story-next]").addEventListener("click", () => void advanceStory(modal));
  return modal;
};

const STORY = Object.freeze([
  { speaker: "Totem do Círculo dos Ecos", title: "A Essência dos Ecos desperta", text: "Ao concluir o Puzzle 1, o Totem reage ao Relógio Cristalíneo. Um pulso verde atravessa o mostrador e transmite a Essência dos Ecos para além da Clareira.", image: "assets/story/crystal-watch-round.webp" },
  { speaker: "Dra. Íris · Contato remoto", title: "Uma antiga rede de santuários", text: "Incrível! A Clareira não era apenas um santuário isolado — ela funcionava como uma chave. O pulso reativou parte de uma rede ancestral que liga os grandes cristais.", image: "assets/story/dr-iris.webp" },
  { speaker: "Dra. Íris · Mapa do mundo", title: "Santuário Central localizado", text: "Acompanhe a linha de energia no mapa-múndi. Ela parte da Clareira dos Ecos e revela o Santuário Central. Prepare sua equipe: há três níveis antes do grande cristal.", image: "assets/story/dr-iris.webp" }
]);

const renderStory = (modal) => {
  const data = STORY[storyStep];
  modal.querySelector("img").src = data.image;
  modal.querySelector("img").alt = data.speaker;
  modal.querySelector("[data-story-speaker]").textContent = data.speaker;
  modal.querySelector("[data-story-title]").textContent = data.title;
  modal.querySelector("[data-story-text]").textContent = data.text;
  modal.querySelector("[data-story-next]").textContent = storyStep === STORY.length - 1 ? "Revelar no mapa" : "Continuar";
};

const advanceStory = async (modal) => {
  if (storyStep < STORY.length - 1) { storyStep += 1; renderStory(modal); return; }
  modal.querySelector("[data-story-next]").disabled = true;
  await bridge()?.unlockCentralSanctuary?.();
  modal.hidden = true;
  modal.querySelector("[data-story-next]").disabled = false;
  destination?.focus();
};

const showStory = (modal) => {
  const snapshot = player();
  if (!snapshot.echoOverworldProgress?.puzzles?.echoesSolved || snapshot.storyFlags?.centralSanctuaryStorySeen) return;
  if (worldMap.hidden) {
    window.setTimeout(() => showStory(modal), 400);
    return;
  }
  storyStep = 0;
  renderStory(modal);
  modal.hidden = false;
  modal.querySelector("[data-story-next]").focus();
};

ensureCss();
const entryModal = createEntryModal();
const storyModal = createStoryModal();

destination?.addEventListener("click", async () => {
  const unlocked = Boolean(player().storyFlags?.centralSanctuaryUnlocked || player().echoOverworldProgress?.puzzles?.echoesSolved);
  if (!unlocked || destination.disabled) return;
  const arrived = await bridge()?.travelToCentralSanctuary?.();
  if (arrived === false) return;
  entryModal.hidden = false;
  entryModal.querySelector("[data-central-entry=confirm]").focus();
});

window.addEventListener("naturion:puzzle-one-solved", () => window.setTimeout(() => showStory(storyModal), reducedMotion() ? 350 : 2550));
window.addEventListener("naturion:open-forest-unlocked", () => window.setTimeout(() => showStory(storyModal), 120));
window.addEventListener("naturion:journey-continued", () => window.setTimeout(() => showStory(storyModal), 180));
window.addEventListener("naturion:team-updated", () => { if (active && ui) renderParty(); });
window.addEventListener("naturion:team-manager-closed", () => { if (active && ui) { renderParty(); save(true); ui.team.focus(); } });
window.addEventListener("beforeunload", () => save(true));
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!storyModal.hidden) return;
  if (!entryModal.hidden) { entryModal.hidden = true; destination?.focus(); return; }
  if (active && !guardianBattle) returnMap();
});
