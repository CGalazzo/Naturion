const MAP_ID = "clareira-dos-ecos-overworld";
const MAP_SCENE = "assets/overworld/clareira-dos-ecos/ground-v2.webp";
const SANCTUARY_SCENE = "assets/puzzle/echoes-sanctuary-unlocked.webp";
// Temporário: libera a repetição do Puzzle 1 nos testes, sem apagar a
// conclusão original nem conceder novamente sua progressão.
const PUZZLE_REPLAY_TEST_MODE = true;
const screen = document.getElementById("echoOverworldScreen");
const worldMap = document.getElementById("openForestMap");
const destination = document.getElementById("worldFirstDestination");
const bridge = () => window.NaturionOverworldBridge;
const player = () => bridge()?.getPlayer?.() || {};
const forms = () => window.__naturionEcho?.forms || {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ENCOUNTERS = Object.freeze([
  { id: "idle-escaruli-01", at: 14, formId: "escaruli", level: 3 },
  { id: "idle-lumpirim-02", at: 31, formId: "lumpirim", level: 4 },
  { id: "idle-failino-03", at: 49, formId: "failino", level: 5 },
  { id: "idle-hambrio-04", at: 67, formId: "hambrio", level: 5 },
  { id: "idle-canumi-05", at: 84, formId: "canumi", level: 4 },
  { id: "idle-zumbel-06", at: 96, formId: "zumbel", level: 5 }
]);
const SEGMENTS = Object.freeze([
  ["Entrada Luminal", "Níveis 1–5"],
  ["Trilha dos Sussurros", "Níveis 3–7"],
  ["Clareira Profunda", "Níveis 5–10"],
  ["Ruínas dos Ecos", "Níveis 7–13"],
  ["Santuário Oeste", "Prova ancestral"]
]);

let active = false;
let busy = false;
let state = null;
let ui = null;
let puzzle = null;
let frame = 0;
let lastFrame = 0;
let lastSave = 0;
let logs = [];
let defeatCountdownTimer = 0;
let defeatSeconds = 5;
let encounterPhase = "idle";

const html = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const toast = (message) => {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2300);
};

const puzzleFlags = () => player().echoOverworldProgress?.puzzles || {};

const loadState = () => {
  const saved = player().echoOverworldProgress?.idleExpedition || {};
  const replay = Boolean(puzzleFlags().echoesSolved);
  return {
    progress: 0,
    running: false,
    speed: [1, 2, 3].includes(Number(saved.speed)) ? Number(saved.speed) : 1,
    battleMode: saved.battleMode === "manual" ? "manual" : "automatic",
    completedIds: [],
    wins: Math.max(0, Number(saved.battlesWon) || 0),
    captures: Math.max(0, Number(saved.captures) || 0),
    defeats: Math.max(0, Number(saved.defeats) || 0),
    puzzleUnlocked: false,
    completed: false,
    replay
  };
};

const savePayload = () => ({
  progress: Number(state.progress.toFixed(2)),
  running: Boolean(state.running && !busy && !state.completed),
  speed: state.speed,
  battleMode: state.battleMode,
  completedEncounterIds: [...state.completedIds],
  battlesWon: state.wins,
  captures: state.captures,
  defeats: state.defeats,
  puzzleUnlocked: state.puzzleUnlocked,
  completed: Boolean(state.completed && !state.replay),
  updatedAt: new Date().toISOString()
});

const save = (force = false) => {
  if (!state || !bridge()?.saveEchoMapState) return;
  const now = performance.now();
  if (!force && now - lastSave < 1200) return;
  lastSave = now;
  bridge().saveEchoMapState({
    mapId: MAP_ID,
    idleExpedition: savePayload(),
    puzzles: { ...puzzleFlags(), echoesSolved: Boolean(state.completed || puzzleFlags().echoesSolved) }
  });
};

const formFor = (id) => forms()[id] || { id, name: id || "Naturion", type: "Natureza", image: "" };

const roster = () => {
  const snapshot = player();
  const catalog = new Map();
  [snapshot.starter, ...(snapshot.team || []), ...(snapshot.storage || [])]
    .filter(Boolean)
    .forEach((member) => {
      const key = member.uid || `${member.formId || member.id}-${member.name}`;
      if (!catalog.has(key)) catalog.set(key, member);
    });
  const order = Array.isArray(snapshot.partyOrderUids)
    ? snapshot.partyOrderUids
    : [snapshot.starter?.uid, ...(snapshot.team || []).map((member) => member.uid)];
  const seen = new Set();
  return order.map((uid) => catalog.get(uid)).filter(Boolean).filter((member) => {
    const key = member.uid || `${member.formId || member.id}-${member.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
};

const experienceToNextLevel = (level) => 55 + Math.max(1, Number(level) || 1) * 20;

const experienceSummary = (member) => {
  const required = experienceToNextLevel(member.level);
  const current = clamp(Number(member.experience) || 0, 0, required);
  return {
    current,
    required,
    remaining: Math.max(0, required - current),
    percent: required ? current / required * 100 : 0
  };
};

const segmentIndex = () => Math.min(4, Math.floor(Math.min(state?.progress || 0, 99.99) / 20));

const addLog = (message, kind = "info") => {
  logs.unshift({ message, kind, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
  logs = logs.slice(0, 6);
  renderLogs();
};

const renderLogs = () => {
  if (!ui) return;
  ui.log.innerHTML = logs.length ? logs.map((entry) => `
    <div class="idle-log-entry" data-kind="${html(entry.kind)}">
      <time>${html(entry.time)}</time><span>${html(entry.message)}</span>
    </div>`).join("") : `<div class="idle-log-entry"><time>—</time><span>Nenhum evento registrado.</span></div>`;
};

const ensureCss = () => {
  if (document.getElementById("idlePhaseOneCss")) return;
  const link = document.createElement("link");
  link.id = "idlePhaseOneCss";
  link.rel = "stylesheet";
  link.href = "src/overworld/idle/phase1.css?v=7";
  document.head.append(link);
};

const build = () => {
  ensureCss();
  screen.classList.add("idle-host");
  screen.innerHTML = `
    <main class="idle-app" style="--speed:1">
      <header class="idle-top">
        <div class="idle-title"><small>Expedição idle · Fase 1</small><h1>Clareira dos Ecos</h1></div>
        <div class="idle-actions">
          <button class="idle-btn alt" type="button" data-action="team">Equipe</button>
          <button class="idle-btn warn" type="button" data-action="map">Voltar ao mapa</button>
        </div>
      </header>
      <section class="idle-main">
        <div class="idle-scene">
          <div class="idle-path"></div>
          <div class="idle-badge"><strong data-scene-title>Preparando expedição</strong><br><span data-scene-message>Inicie a jornada automática.</span></div>
          <div class="idle-party">
            <div class="idle-hero-box"><img class="idle-hero" alt=""></div>
            <div class="idle-followers"></div>
          </div>
          <div class="idle-wild"><img alt=""><strong></strong></div>
        </div>
        <aside class="idle-side">
          <section class="idle-card">
            <div class="idle-progress-head">
              <div><h2>Progresso</h2><div class="idle-percent" data-progress>0%</div></div>
              <span data-run-state>Pausada</span>
            </div>
            <div class="idle-track"><div class="idle-fill"></div><div class="idle-marks"><i></i><i></i><i></i><i></i><i></i></div></div>
            <p class="idle-segment" data-segment></p>
          </section>
          <section class="idle-card">
            <h2>Resultados</h2>
            <div class="idle-stats">
              <div class="idle-stat"><strong data-wins>0</strong><small>Vitórias</small></div>
              <div class="idle-stat"><strong data-captures>0</strong><small>Absorções</small></div>
              <div class="idle-stat"><strong data-defeats>0</strong><small>Recuos</small></div>
            </div>
          </section>
          <section class="idle-card">
            <h2>Velocidade</h2>
            <div class="idle-speeds">
              <button class="idle-speed" type="button" data-speed="1">1×</button>
              <button class="idle-speed" type="button" data-speed="2">2×</button>
              <button class="idle-speed" type="button" data-speed="3">3×</button>
            </div>
            <h2 class="idle-mode-heading">Modo de batalha</h2>
            <button class="idle-battle-mode" type="button" data-action="battle-mode" data-mode="automatic" aria-pressed="true">
              <strong data-battle-mode-title>Automática</strong>
              <small data-battle-mode-help>A equipe escolhe seus próprios golpes.</small>
            </button>
          </section>
          <section class="idle-card log-card"><h2>Registro</h2><div class="idle-log" aria-live="polite"></div></section>
        </aside>
      </section>
      <footer class="idle-bottom">
        <div class="idle-objective"><strong>Objetivo:</strong><span data-objective> alcance o Santuário Oeste.</span></div>
        <button class="idle-btn idle-primary" type="button" data-action="toggle">Iniciar expedição</button>
      </footer>
    </main>
    <div class="idle-totem" role="dialog" aria-modal="true" aria-label="Santuário Oeste alcançado">
      <div class="idle-sanctuary-stage">
        <img class="idle-sanctuary-art" src="${SANCTUARY_SCENE}" alt="Santuário Oeste com o Totem do Círculo dos Ecos e o painel do Puzzle 1" width="1672" height="941">
        <div class="idle-sanctuary-party" aria-label="Equipe diante do Totem">
          <div class="idle-sanctuary-companion"><img alt=""></div>
          <div class="idle-sanctuary-hero"><img alt=""></div>
        </div>
        <button class="idle-sanctuary-action" type="button" data-action="puzzle" aria-label="Examinar o Totem"></button>
      </div>
    </div>
    <div class="idle-team" hidden>
      <section class="idle-team-dialog" role="dialog" aria-modal="true">
        <header><h2>Equipe da expedição</h2><button class="idle-btn alt" type="button" data-action="close-team">Fechar</button></header>
        <p>As batalhas respeitam a ordem atual da equipe.</p>
        <div class="idle-team-grid"></div>
      </section>
    </div>
    <div class="idle-defeat" hidden>
      <section class="idle-defeat-dialog" role="alertdialog" aria-modal="true" aria-labelledby="idleDefeatTitle">
        <small>Equipe sem energia</small>
        <h2 id="idleDefeatTitle">Todos os seus Naturions foram derrotados!</h2>
        <p>A expedição desta tela retornou para 0%. Sua equipe foi conduzida para um ponto seguro.</p>
        <strong class="idle-defeat-countdown">Reinício automático em <span data-defeat-seconds>5</span> segundos</strong>
        <div class="idle-defeat-actions">
          <button class="idle-btn" type="button" data-action="restart-defeat">Reiniciar aventura</button>
          <button class="idle-btn warn" type="button" data-action="map-defeat">Voltar ao mapa Naturion</button>
        </div>
      </section>
    </div>`;

  ui = {
    root: screen.querySelector(".idle-app"),
    hero: screen.querySelector(".idle-hero"),
    followers: screen.querySelector(".idle-followers"),
    wild: screen.querySelector(".idle-wild"),
    wildImage: screen.querySelector(".idle-wild img"),
    wildLabel: screen.querySelector(".idle-wild strong"),
    sceneTitle: screen.querySelector("[data-scene-title]"),
    sceneMessage: screen.querySelector("[data-scene-message]"),
    totem: screen.querySelector(".idle-totem"),
    sanctuaryHero: screen.querySelector(".idle-sanctuary-hero img"),
    sanctuaryCompanion: screen.querySelector(".idle-sanctuary-companion img"),
    sanctuaryCompanionBox: screen.querySelector(".idle-sanctuary-companion"),
    progress: screen.querySelector("[data-progress]"),
    fill: screen.querySelector(".idle-fill"),
    runState: screen.querySelector("[data-run-state]"),
    segment: screen.querySelector("[data-segment]"),
    wins: screen.querySelector("[data-wins]"),
    captures: screen.querySelector("[data-captures]"),
    defeats: screen.querySelector("[data-defeats]"),
    objective: screen.querySelector("[data-objective]"),
    toggle: screen.querySelector("[data-action=toggle]"),
    map: screen.querySelector("[data-action=map]"),
    team: screen.querySelector("[data-action=team]"),
    battleMode: screen.querySelector("[data-action=battle-mode]"),
    battleModeTitle: screen.querySelector("[data-battle-mode-title]"),
    battleModeHelp: screen.querySelector("[data-battle-mode-help]"),
    puzzleButton: screen.querySelector("[data-action=puzzle]"),
    speedButtons: [...screen.querySelectorAll("[data-speed]")],
    log: screen.querySelector(".idle-log"),
    teamModal: screen.querySelector(".idle-team"),
    teamGrid: screen.querySelector(".idle-team-grid"),
    closeTeam: screen.querySelector("[data-action=close-team]"),
    defeatModal: screen.querySelector(".idle-defeat"),
    defeatSeconds: screen.querySelector("[data-defeat-seconds]"),
    restartDefeat: screen.querySelector("[data-action=restart-defeat]"),
    mapDefeat: screen.querySelector("[data-action=map-defeat]")
  };
  ui.toggle.addEventListener("click", toggle);
  ui.map.addEventListener("click", returnMap);
  ui.team.addEventListener("click", openTeam);
  ui.battleMode.addEventListener("click", toggleBattleMode);
  ui.closeTeam.addEventListener("click", closeTeam);
  ui.teamModal.addEventListener("click", (event) => { if (event.target === ui.teamModal) closeTeam(); });
  ui.puzzleButton.addEventListener("click", () => puzzle?.open());
  ui.speedButtons.forEach((button) => button.addEventListener("click", () => setSpeed(Number(button.dataset.speed))));
  ui.restartDefeat.addEventListener("click", restartAfterDefeat);
  ui.mapDefeat.addEventListener("click", returnMapAfterDefeat);
};

const renderParty = () => {
  const snapshot = player();
  ui.hero.src = snapshot.character === "female" ? "assets/selection/hero-female.webp" : "assets/selection/hero-male.webp";
  ui.hero.alt = snapshot.name || "Protagonista";
  ui.sanctuaryHero.src = ui.hero.src;
  ui.sanctuaryHero.alt = ui.hero.alt;
  ui.followers.replaceChildren();
  const activeRoster = roster().slice(0, 1);
  ui.sanctuaryCompanionBox.hidden = !activeRoster.length;
  activeRoster.forEach((member, index) => {
    const form = formFor(member.formId || member.id);
    const box = document.createElement("div");
    const image = document.createElement("img");
    box.className = "idle-follower";
    box.style.setProperty("--delay", `${index * -.15}s`);
    image.src = member.image || form.image || "";
    image.alt = member.name || form.name;
    box.append(image);
    ui.followers.append(box);
    ui.sanctuaryCompanion.src = image.src;
    ui.sanctuaryCompanion.alt = image.alt;
  });
};

const renderTeam = () => {
  ui.teamGrid.replaceChildren();
  const members = roster();
  if (!members.length) {
    ui.teamGrid.textContent = "Nenhum Naturion disponível.";
    return;
  }
  members.forEach((member, index) => {
    const form = formFor(member.formId || member.id);
    const experience = experienceSummary(member);
    const card = document.createElement("article");
    card.className = "idle-team-card";
    card.innerHTML = `<img src="${html(member.image || form.image || "")}" alt="${html(member.name || form.name)}">
      <strong>${index + 1}. ${html(member.name || form.name)}</strong>
      <small>${html(member.type || form.type)} · Nv. ${Number(member.level) || 1}</small>
      <div class="idle-team-exp" aria-label="${experience.current} de ${experience.required} pontos de experiência">
        <span><b>EXP</b><em>Faltam ${experience.remaining}</em></span>
        <i><u style="width:${experience.percent}%"></u></i>
      </div>`;
    ui.teamGrid.append(card);
  });
};

const clearDefeatCountdown = () => {
  window.clearInterval(defeatCountdownTimer);
  defeatCountdownTimer = 0;
};

const hideDefeatModal = () => {
  clearDefeatCountdown();
  if (ui?.defeatModal) ui.defeatModal.hidden = true;
};

function restartAfterDefeat() {
  if (!active || !state) return;
  hideDefeatModal();
  state.progress = 0;
  state.completedIds = [];
  state.puzzleUnlocked = false;
  state.completed = false;
  state.running = true;
  wildPreview();
  addLog("A equipe se recuperou. A aventura foi reiniciada em 0%.", "capture");
  renderParty();
  renderTeam();
  render();
  save(true);
  ui.toggle.focus();
}

function returnMapAfterDefeat() {
  if (!active) return;
  hideDefeatModal();
  returnMap();
}

const showPartyDefeat = () => {
  clearDefeatCountdown();
  state.progress = 0;
  state.completedIds = [];
  state.running = false;
  state.puzzleUnlocked = false;
  state.completed = false;
  defeatSeconds = 5;
  ui.defeatSeconds.textContent = String(defeatSeconds);
  ui.defeatModal.hidden = false;
  renderParty();
  renderTeam();
  render();
  save(true);
  ui.restartDefeat.focus();
  defeatCountdownTimer = window.setInterval(() => {
    defeatSeconds -= 1;
    ui.defeatSeconds.textContent = String(Math.max(0, defeatSeconds));
    if (defeatSeconds <= 0) restartAfterDefeat();
  }, 1000);
};

const render = () => {
  if (!ui || !state) return;
  const progress = clamp(state.progress, 0, 100);
  const [segment, levels] = SEGMENTS[segmentIndex()];
  ui.root.style.setProperty("--speed", state.speed);
  ui.root.classList.toggle("running", state.running && !busy);
  ui.progress.textContent = `${Math.floor(progress)}%`;
  ui.fill.style.width = `${progress}%`;
  ui.runState.textContent = busy ? "Evento" : state.running ? `Ativa · ${state.speed}×` : state.completed ? "Concluída" : "Pausada";
  ui.segment.textContent = `${segment} · ${levels}`;
  ui.wins.textContent = state.wins;
  ui.captures.textContent = state.captures;
  ui.defeats.textContent = state.defeats;
  ui.totem.classList.toggle("visible", state.puzzleUnlocked);
  ui.root.classList.toggle("sanctuary-reached", state.puzzleUnlocked);
  ui.root.inert = state.puzzleUnlocked;
  ui.root.setAttribute("aria-hidden", String(state.puzzleUnlocked));
  ui.toggle.disabled = busy || state.puzzleUnlocked || state.completed;
  ui.toggle.textContent = state.completed
    ? "Expedição concluída"
    : state.running
      ? "Pausar expedição"
      : progress
        ? "Continuar expedição"
        : "Iniciar expedição";
  ui.team.disabled = busy;
  ui.map.disabled = busy;
  const automaticBattle = state.battleMode !== "manual";
  ui.battleMode.disabled = busy;
  ui.battleMode.dataset.mode = automaticBattle ? "automatic" : "manual";
  ui.battleMode.setAttribute("aria-pressed", String(automaticBattle));
  ui.battleModeTitle.textContent = automaticBattle ? "Automática" : "Manual";
  ui.battleModeHelp.textContent = automaticBattle
    ? "A equipe escolhe seus próprios golpes."
    : "Você escolhe ataque, defesa ou fuga.";
  ui.speedButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === state.speed);
    button.disabled = busy || state.completed;
  });
  if (state.puzzleUnlocked && PUZZLE_REPLAY_TEST_MODE) {
    ui.sceneTitle.textContent = "Santuário Oeste alcançado";
    ui.sceneMessage.textContent = "Interaja com o Totem para iniciar o Puzzle 1.";
    ui.objective.textContent = state.completed || state.replay
      ? " repita o Círculo dos Ecos em modo de teste."
      : " resolva o Círculo dos Ecos.";
  } else if (state.completed) {
    if (state.replay) {
      ui.sceneTitle.textContent = "Expedição concluída";
      ui.sceneMessage.textContent = "A rota foi percorrida novamente. O Círculo dos Ecos já estava desperto.";
      ui.objective.textContent = " retorne ao mapa quando desejar.";
    } else {
      ui.sceneTitle.textContent = "Santuário desperto";
      ui.sceneMessage.textContent = "O Círculo dos Ecos permanece ativo.";
      ui.objective.textContent = " Puzzle 1 concluído e progresso salvo.";
    }
  } else if (state.puzzleUnlocked) {
    ui.sceneTitle.textContent = "Santuário Oeste alcançado";
    ui.sceneMessage.textContent = "Interaja com o Totem para iniciar o Puzzle 1.";
    ui.objective.textContent = " resolva o Círculo dos Ecos.";
  } else if (busy) {
    if (encounterPhase === "approaching") {
      ui.objective.textContent = " aguarde o Naturion alcançar sua equipe.";
    } else {
      ui.objective.textContent = automaticBattle
        ? " acompanhe a batalha automática e escolha se deseja absorver."
        : " escolha os golpes do seu Naturion e decida se deseja absorver.";
    }
  } else if (state.running) {
    ui.sceneTitle.textContent = segment;
    ui.sceneMessage.textContent = `A equipe avança em ${state.speed}× · batalha ${automaticBattle ? "automática" : "manual"}.`;
    ui.objective.textContent = ` avance pela ${segment}.`;
  } else {
    ui.sceneTitle.textContent = progress ? "Expedição pausada" : "Equipe pronta";
    ui.sceneMessage.textContent = progress ? "Continue do ponto salvo." : "Inicie a expedição automática.";
    ui.objective.textContent = " alcance o Santuário Oeste.";
  }
};

const wildPreview = (encounter = null) => {
  if (!encounter) {
    ui.wild.classList.remove("visible", "approaching", "at-contact");
    ui.wild.removeAttribute("data-locomotion");
    ui.wild.style.removeProperty("--wild-ground-offset");
    return;
  }
  const form = formFor(encounter.formId);
  ui.wildImage.src = form.image || "";
  ui.wildImage.alt = form.name;
  ui.wildLabel.textContent = `${form.name} · Nv. ${encounter.level}`;
  ui.wild.dataset.locomotion = form.flying ? "flying" : "ground";
  ui.wild.style.setProperty("--wild-ground-offset", form.flying ? "0%" : `${Number(form.groundOffset) || 0}%`);
  ui.wild.classList.remove("approaching", "at-contact");
  ui.wild.classList.add("visible");
};

const approachWild = (encounter) => new Promise((resolve) => {
  wildPreview(encounter);
  const duration = reducedMotion() ? 260 : 1250;
  ui.wild.style.setProperty("--wild-approach-duration", `${duration}ms`);
  void ui.wild.offsetWidth;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(fallback);
    ui.wild.removeEventListener("transitionend", onTransitionEnd);
    ui.wild.classList.remove("approaching");
    ui.wild.classList.add("at-contact");
    resolve();
  };
  const onTransitionEnd = (event) => {
    if (event.target === ui.wild && event.propertyName === "right") finish();
  };
  const fallback = window.setTimeout(finish, duration + 180);
  ui.wild.addEventListener("transitionend", onTransitionEnd);
  requestAnimationFrame(() => ui.wild.classList.add("approaching"));
});

const openTeam = () => {
  if (!active || busy) return;
  state.running = false;
  render();
  save(true);
  window.dispatchEvent(new CustomEvent("naturion:open-team-manager", {
    detail: { returnFocus: ui.team }
  }));
};
const closeTeam = () => { ui.teamModal.hidden = true; ui.team.focus(); };

const setSpeed = (speed) => {
  if (busy || state.completed || ![1, 2, 3].includes(speed)) return;
  state.speed = speed;
  addLog(`Velocidade ajustada para ${speed}×.`);
  render();
  save(true);
};

const toggleBattleMode = () => {
  if (!active || busy || !state) return;
  state.battleMode = state.battleMode === "manual" ? "automatic" : "manual";
  addLog(`Batalhas alteradas para o modo ${state.battleMode === "manual" ? "manual" : "automático"}.`);
  render();
  save(true);
};

const toggle = () => {
  if (!active || busy || state.puzzleUnlocked || state.completed) return;
  state.running = !state.running;
  addLog(state.running ? "A expedição começou." : "A expedição foi pausada.");
  render();
  save(true);
};

const pendingEncounter = () => ENCOUNTERS.find((encounter) => state.progress >= encounter.at && !state.completedIds.includes(encounter.id));

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
  encounterPhase = "approaching";
  ui.sceneTitle.textContent = `${form.name} avistou sua equipe`;
  ui.sceneMessage.textContent = form.flying
    ? "Ele voa em sua direção. A batalha começa somente no contato."
    : "Ele corre em sua direção. A batalha começa somente no contato.";
  addLog(`${form.name} apareceu e está se aproximando.`, "battle");
  render();
  save(true);
  await approachWild(data);

  if (!active) {
    busy = false;
    encounterPhase = "idle";
    wildPreview();
    return;
  }
  encounterPhase = "battle";
  const automaticBattle = state.battleMode !== "manual";
  ui.sceneTitle.textContent = `Encontro com ${form.name}`;
  ui.sceneMessage.textContent = automaticBattle
    ? "Sua equipe assumiu os comandos da batalha."
    : "Escolha cada ação usando os comandos de batalha.";
  addLog(`Contato! Batalha ${automaticBattle ? "automática" : "manual"} iniciada.`, "battle");
  render();

  const promise = bridge()?.startBattle?.({
    stageId: MAP_ID,
    encounterId: data.id,
    formId: data.formId,
    level: data.level,
    scene: MAP_SCENE
  });
  if (!promise?.then) {
    busy = false;
    encounterPhase = "idle";
    wildPreview();
    addLog("O sistema de batalha não respondeu.", "danger");
    render();
    save(true);
    return;
  }
  const timer = automaticBattle ? setInterval(autoAttack, 260) : 0;
  let result;
  try { result = await promise; } finally { if (timer) clearInterval(timer); }
  busy = false;
  encounterPhase = "idle";
  wildPreview();

  if (result?.outcome === "victory") {
    if (!state.completedIds.includes(data.id)) state.completedIds.push(data.id);
    state.wins += 1;
    state.progress = Math.max(state.progress, data.at + 1.25);
    if (result.captured) {
      state.captures += 1;
      addLog(`${form.name} foi absorvido e registrado.`, "capture");
    } else {
      addLog(`${form.name} foi derrotado. A expedição continua.`, "battle");
    }
    renderParty();
    state.running = resume;
  } else if (result?.outcome === "defeat") {
    state.defeats += 1;
    addLog("Todos os seus Naturions foram derrotados!", "danger");
    showPartyDefeat();
    return;
  } else {
    state.progress = Math.max(0, data.at - 1.5);
    state.running = resume;
    addLog("O encontro terminou sem vitória.");
  }
  render();
  save(true);
};

const unlockPuzzle = () => {
  state.progress = 100;
  state.running = false;
  state.puzzleUnlocked = true;
  addLog("O Totem do Círculo dos Ecos despertou.", "capture");
  render();
  save(true);
};

const tick = (time) => {
  frame = requestAnimationFrame(tick);
  if (!active || !state || !ui) return;
  const delta = lastFrame ? Math.min(.1, (time - lastFrame) / 1000) : 0;
  lastFrame = time;
  if (!state.running || busy || state.puzzleUnlocked || state.completed || !ui.teamModal.hidden) return;
  state.progress = clamp(state.progress + delta * .6 * state.speed, 0, 100);
  const next = pendingEncounter();
  if (next) { void encounter(next); return; }
  if (state.progress >= 100) {
    unlockPuzzle();
    return;
  }
  render();
  save();
};

class PuzzleOne {
  constructor() {
    this.opened = false;
    this.accepting = false;
    this.sequence = [];
    this.index = 0;
    this.token = 0;
    this.audio = null;
    this.create();
  }
  create() {
    this.element = document.createElement("section");
    this.element.className = "idle-puzzle";
    this.element.hidden = true;
    this.element.innerHTML = `
      <div class="idle-puzzle-shell">
        <header class="idle-puzzle-header"><small>Puzzle 1 de 3</small><h2>Círculo dos Ecos</h2>
          <p>Observe a ordem em que as três runas despertam e repita a sequência.</p></header>
        <div class="idle-puzzle-board">
          <img
            class="idle-puzzle-art"
            src="assets/puzzle/circle-of-echoes-arena.webp"
            alt=""
            width="1672"
            height="941"
          >
          <div class="idle-crystal" aria-hidden="true"></div>
          <button class="idle-rune" type="button" data-rune="0" aria-label="Runa do pedestal superior"><span aria-hidden="true">◇</span></button>
          <i class="idle-energy-path" data-path="0" aria-hidden="true"></i>
          <button class="idle-rune" type="button" data-rune="1" aria-label="Runa do pedestal inferior direito"><span aria-hidden="true">◆</span></button>
          <i class="idle-energy-path" data-path="1" aria-hidden="true"></i>
          <button class="idle-rune" type="button" data-rune="2" aria-label="Runa do pedestal inferior esquerdo"><span aria-hidden="true">✦</span></button>
          <i class="idle-energy-path" data-path="2" aria-hidden="true"></i>
        </div>
        <footer class="idle-puzzle-footer">
          <p class="idle-puzzle-status" aria-live="polite">Ouça os Ecos para revelar a sequência.</p>
          <div class="idle-puzzle-actions">
            <button class="idle-btn" type="button" data-puzzle="start">Ouvir os Ecos</button>
            <button class="idle-btn alt" type="button" data-puzzle="close">Voltar à expedição</button>
          </div>
        </footer>
      </div>`;
    document.body.append(this.element);
    this.status = this.element.querySelector(".idle-puzzle-status");
    this.start = this.element.querySelector("[data-puzzle=start]");
    this.closeButton = this.element.querySelector("[data-puzzle=close]");
    this.art = this.element.querySelector(".idle-puzzle-art");
    this.board = this.element.querySelector(".idle-puzzle-board");
    this.crystal = this.element.querySelector(".idle-crystal");
    this.runes = [...this.element.querySelectorAll("[data-rune]")];
    this.paths = [...this.element.querySelectorAll("[data-path]")];
    const showArtError = () => {
      this.element.classList.add("art-error");
      this.status.textContent = "Não foi possível carregar a arena do puzzle. Volte à expedição e tente novamente.";
      this.start.disabled = true;
    };
    this.art.addEventListener("error", showArtError, { once: true });
    if (this.art.complete && this.art.naturalWidth === 0) showArtError();
    this.start.addEventListener("click", () => void this.begin());
    this.closeButton.addEventListener("click", () => this.close());
    this.runes.forEach((rune) => rune.addEventListener("click", () => void this.choose(Number(rune.dataset.rune))));
    if ("ResizeObserver" in window) {
      this.resizeObserver = new window.ResizeObserver(() => this.alignEnergyPaths());
      this.resizeObserver.observe(this.board);
    }
    window.addEventListener("resize", () => this.alignEnergyPaths());
  }
  alignEnergyPaths() {
    const boardRect = this.board.getBoundingClientRect();
    const crystalRect = this.crystal.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height || !crystalRect.width) return;
    const targetX = crystalRect.left + crystalRect.width / 2;
    const targetY = crystalRect.top + crystalRect.height / 2;
    this.runes.forEach((rune, index) => {
      const runeRect = rune.getBoundingClientRect();
      const startX = runeRect.left + runeRect.width / 2;
      const startY = runeRect.top + runeRect.height / 2;
      const deltaX = targetX - startX;
      const deltaY = targetY - startY;
      const path = this.paths[index];
      path.style.left = `${startX - boardRect.left}px`;
      path.style.top = `${startY - boardRect.top}px`;
      path.style.width = `${Math.hypot(deltaX, deltaY)}px`;
      path.style.transform = `translateY(-50%) rotate(${Math.atan2(deltaY, deltaX)}rad)`;
    });
  }
  tone(index, duration = .2) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    this.audio ||= new Context();
    void this.audio.resume?.();
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    const now = this.audio.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.value = [392, 523.25, 659.25][index] || 440;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.075, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .04);
  }
  open() {
    if (!state?.puzzleUnlocked || this.opened) return;
    const alreadySolved = Boolean(state.completed || puzzleFlags().echoesSolved);
    if (alreadySolved && !PUZZLE_REPLAY_TEST_MODE) { toast("O Círculo dos Ecos já está desperto."); return; }
    this.replayAttempt = alreadySolved;
    state.running = false;
    if (!this.replayAttempt) save(true);
    this.opened = true;
    this.accepting = false;
    this.index = 0;
    this.sequence = [];
    this.runes.forEach((rune) => { rune.disabled = true; rune.classList.remove("active"); });
    this.status.textContent = "Ouça os Ecos para revelar a sequência.";
    this.start.hidden = false;
    this.start.disabled = false;
    this.element.hidden = false;
    requestAnimationFrame(() => this.alignEnergyPaths());
    this.start.focus();
  }
  close() {
    if (!this.opened) return;
    this.token += 1;
    this.opened = false;
    this.accepting = false;
    this.element.hidden = true;
    render();
    ui.puzzleButton.focus();
  }
  shuffle() {
    const values = [0, 1, 2];
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  async begin() {
    if (!this.opened || this.start.disabled) return;
    this.sequence = this.shuffle();
    this.index = 0;
    this.start.disabled = true;
    await this.play();
  }
  async play() {
    const token = ++this.token;
    this.accepting = false;
    this.runes.forEach((rune) => { rune.disabled = true; rune.classList.remove("active"); });
    this.status.textContent = "Observe a ordem das runas...";
    await sleep(reducedMotion() ? 100 : 450);
    for (const value of this.sequence) {
      if (!this.opened || token !== this.token) return;
      const rune = this.runes[value];
      rune.classList.add("active");
      this.tone(value, .28);
      await sleep(reducedMotion() ? 130 : 430);
      rune.classList.remove("active");
      await sleep(reducedMotion() ? 70 : 180);
    }
    if (!this.opened || token !== this.token) return;
    this.accepting = true;
    this.runes.forEach((rune) => { rune.disabled = false; });
    this.status.textContent = "Repita a sequência.";
    this.runes[0].focus();
  }
  async choose(value) {
    if (!this.opened || !this.accepting) return;
    const rune = this.runes[value];
    rune.classList.add("active");
    this.tone(value);
    setTimeout(() => rune.classList.remove("active"), 180);
    if (value !== this.sequence[this.index]) {
      this.accepting = false;
      this.status.textContent = "A sequência se desfez. Observe novamente.";
      this.runes.forEach((item) => { item.disabled = true; });
      await sleep(reducedMotion() ? 220 : 700);
      await this.play();
      return;
    }
    this.index += 1;
    if (this.index >= this.sequence.length) await this.solve();
  }
  async solve() {
    const firstCompletion = !this.replayAttempt && !puzzleFlags().echoesSolved;
    this.accepting = false;
    this.runes.forEach((rune) => { rune.disabled = true; rune.classList.add("active"); });
    this.start.hidden = true;
    this.status.textContent = firstCompletion
      ? "Círculo desperto! O primeiro santuário reconheceu sua equipe."
      : "Sequência concluída novamente em modo de teste.";
    state.completed = true;
    state.puzzleUnlocked = true;
    state.progress = 100;
    state.running = false;
    if (firstCompletion) {
      bridge()?.saveEchoMapState?.({
        mapId: MAP_ID,
        idleExpedition: savePayload(),
        puzzles: { ...puzzleFlags(), echoesSolved: true },
        puzzleOneSolvedAt: new Date().toISOString()
      });
      addLog("Puzzle 1 concluído. O progresso foi salvo.", "capture");
    } else {
      addLog("Puzzle 1 repetido em modo de teste, sem nova recompensa.", "capture");
    }
    [0, 1, 2, 1].forEach((value, order) => setTimeout(() => this.tone(value, .25), order * 130));
    await sleep(reducedMotion() ? 500 : 1700);
    this.close();
    render();
    toast(firstCompletion
      ? "Puzzle 1 concluído · Progresso salvo."
      : "Puzzle 1 repetido · Nenhuma recompensa duplicada.");
  }
}

const returnMap = () => {
  if (!active || busy) return;
  hideDefeatModal();
  state.running = false;
  save(true);
  active = false;
  lastFrame = 0;
  ui.teamModal.hidden = true;
  puzzle?.close();
  screen.hidden = true;
  worldMap.hidden = false;
  bridge()?.returnEchoMapToWorld?.();
  destination?.focus();
};

const enter = () => {
  if (!screen || active) return;
  bridge()?.prepareEchoMapEntry?.();
  if (!ui) {
    build();
    puzzle = new PuzzleOne();
  }
  state = loadState();
  encounterPhase = "idle";
  hideDefeatModal();
  logs = [];
  addLog(state.replay
    ? "Nova expedição de teste iniciada. O puzzle será liberado novamente em 100%."
    : "Clareira preparada para a primeira expedição.");
  renderParty();
  renderTeam();
  render();
  worldMap.hidden = true;
  screen.hidden = false;
  active = true;
  lastFrame = 0;
  if (!frame) frame = requestAnimationFrame(tick);
  ui.toggle.focus();
  toast("Clareira dos Ecos · Expedição idle pronta");
};

window.addEventListener("naturion:open-echo-overworld", enter);
window.addEventListener("naturion:team-updated", () => {
  if (!active || !ui) return;
  renderParty();
  renderTeam();
  render();
});
window.addEventListener("naturion:team-manager-closed", () => {
  if (!active || !ui) return;
  renderParty();
  renderTeam();
  render();
  save(true);
  ui.team.focus();
});
window.addEventListener("beforeunload", () => save(true));
window.addEventListener("keydown", (event) => {
  if (!active || event.code !== "Escape") return;
  if (puzzle?.opened) { event.preventDefault(); puzzle.close(); return; }
  if (!ui?.teamModal.hidden) { event.preventDefault(); closeTeam(); }
});
