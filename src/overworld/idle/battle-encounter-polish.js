const MAP_ID = "clareira-dos-ecos-overworld";
const SCREEN_ID = "echoOverworldScreen";
const STYLE_ID = "idleBattleEncounterPolishCss";
const XP_TO_NEXT_LEVEL = (level) => 55 + Math.max(1, Number(level) || 1) * 20;
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

const bridge = () => window.NaturionOverworldBridge;
const forms = () => window.__naturionEcho?.forms || {};

const ensureStyles = () => {
  let link = document.getElementById(STYLE_ID);
  const href = "src/overworld/idle/battle-encounter-polish.css?v=1";
  if (!link) {
    link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    document.head.append(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
};

const uniqueRoster = () => {
  const snapshot = bridge()?.getPlayer?.() || {};
  const seen = new Set();
  return [snapshot.starter, ...(snapshot.team || [])].filter(Boolean).filter((member) => {
    const key = member.uid || `${member.formId || member.id}-${member.name || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formForMember = (member) => forms()[member?.formId || member?.id] || {};
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("pt-BR");

const activeBattleMember = () => {
  const displayedName = normalize(document.getElementById("echoBattlePlayerName")?.textContent);
  const displayedLevel = Number(String(document.getElementById("echoBattlePlayerLevel")?.textContent || "").match(/\d+/)?.[0]) || 0;
  const roster = uniqueRoster();
  return roster.find((member) => {
    const form = formForMember(member);
    return [member.name, form.name].some((name) => normalize(name) === displayedName)
      && (!displayedLevel || Number(member.level) === displayedLevel);
  }) || roster.find((member) => {
    const form = formForMember(member);
    return [member.name, form.name].some((name) => normalize(name) === displayedName);
  }) || roster[0] || null;
};

const ensureExperienceBar = () => {
  const hpFill = document.getElementById("echoBattlePlayerHp");
  const hpTrack = hpFill?.parentElement;
  const status = hpTrack?.closest(".echo-battle-status");
  if (!status) return null;
  let panel = status.querySelector(".echo-exp-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "echo-exp-panel";
    panel.setAttribute("role", "progressbar");
    panel.setAttribute("aria-label", "Experiência até o próximo nível");
    panel.innerHTML = `
      <div class="echo-exp-head"><span>EXP</span><em data-echo-exp-value>0 / 0</em></div>
      <div class="echo-exp-track"><i data-echo-exp-fill></i></div>`;
    hpTrack.insertAdjacentElement("afterend", panel);
  }
  return panel;
};

const updateExperienceBar = () => {
  const panel = ensureExperienceBar();
  if (!panel) return;
  const member = activeBattleMember();
  const level = Math.max(1, Number(member?.level) || Number(String(document.getElementById("echoBattlePlayerLevel")?.textContent || "").match(/\d+/)?.[0]) || 1);
  const needed = XP_TO_NEXT_LEVEL(level);
  const experience = clamp(Number(member?.experience) || 0, 0, needed);
  const percent = clamp((experience / needed) * 100, 0, 100);
  const fill = panel.querySelector("[data-echo-exp-fill]");
  const value = panel.querySelector("[data-echo-exp-value]");
  if (fill) fill.style.width = `${percent}%`;
  if (value) value.textContent = `${Math.floor(experience)} / ${needed}`;
  panel.setAttribute("aria-valuemin", "0");
  panel.setAttribute("aria-valuemax", String(needed));
  panel.setAttribute("aria-valuenow", String(Math.floor(experience)));
};

const identifyWildForm = (wild) => {
  const image = wild?.querySelector("img");
  const alt = normalize(image?.alt);
  const source = String(image?.getAttribute("src") || image?.src || "");
  return Object.values(forms()).find((form) => normalize(form?.name) === alt)
    || Object.values(forms()).find((form) => source && String(form?.image || "") && source.includes(String(form.image).split("/").pop()))
    || null;
};

const isFlyingForm = (form) => {
  const descriptor = normalize(JSON.stringify(form || {}));
  const id = normalize(form?.id);
  return /(voador|voadora|flying|a[eé]reo|asas?|wing)/.test(descriptor)
    || ["plumirel", "zumbel"].includes(id);
};

const approachDuration = () => {
  const speed = clamp(Number(document.querySelector(".idle-app")?.style.getPropertyValue("--speed")) || 1, 1, 3);
  return reducedMotion() ? 80 : Math.max(700, Math.round(2100 / speed));
};

const prepareWildApproach = (wild) => {
  const scene = wild?.closest(".idle-scene");
  const party = scene?.querySelector(".idle-party");
  const hero = scene?.querySelector(".idle-hero-box");
  if (!scene || !party || !hero) return;
  const sceneRect = scene.getBoundingClientRect();
  const partyRect = party.getBoundingClientRect();
  const heroRect = hero.getBoundingClientRect();
  const wildWidth = clamp(wild.getBoundingClientRect().width || sceneRect.width * .12, 86, 180);
  const startLeft = sceneRect.width + Math.max(28, wildWidth * .22);
  const targetLeft = clamp(partyRect.right - sceneRect.left - wildWidth * .3, sceneRect.width * .46, sceneRect.width * .72);
  const travel = targetLeft - startLeft;
  const baseBottom = Math.max(7, sceneRect.bottom - partyRect.bottom + 1);
  const form = identifyWildForm(wild);
  const flying = isFlyingForm(form);
  const lift = flying ? clamp(heroRect.height * .4, 55, 112) : 0;
  const duration = approachDuration();
  wild.classList.remove("contact", "is-flying");
  wild.style.left = `${startLeft}px`;
  wild.style.right = "auto";
  wild.style.bottom = `${baseBottom + lift}px`;
  wild.style.setProperty("--wild-travel-x", `${travel}px`);
  wild.style.setProperty("--wild-approach-duration", `${duration}ms`);
  wild.classList.toggle("is-flying", flying);
  void wild.offsetWidth;
  wild.classList.add("approaching");
  wild.dataset.approachEndsAt = String(performance.now() + duration);
  scene.classList.add("encounter-approach");
};

const finishWildApproach = (wild) => {
  const scene = wild?.closest(".idle-scene");
  wild?.classList.add("contact");
  scene?.classList.remove("encounter-approach");
};

const clearWildApproach = (wild) => {
  const scene = wild?.closest(".idle-scene");
  wild?.classList.remove("approaching", "contact", "is-flying");
  wild?.style.removeProperty("left");
  wild?.style.removeProperty("right");
  wild?.style.removeProperty("bottom");
  wild?.style.removeProperty("--wild-travel-x");
  wild?.style.removeProperty("--wild-approach-duration");
  if (wild?.dataset) delete wild.dataset.approachEndsAt;
  scene?.classList.remove("encounter-approach");
};

const observeWild = () => {
  const wild = document.querySelector(`#${SCREEN_ID} .idle-wild`);
  if (!wild || wild.dataset.approachObserver === "true") return;
  wild.dataset.approachObserver = "true";
  const sync = () => {
    if (wild.classList.contains("visible")) {
      if (!wild.classList.contains("approaching")) prepareWildApproach(wild);
    } else if (wild.classList.contains("approaching") || wild.classList.contains("contact")) {
      clearWildApproach(wild);
    }
  };
  new MutationObserver(sync).observe(wild, { attributes: true, attributeFilter: ["class"] });
  sync();
};

let wrappedBridge = null;
let originalStartBattle = null;

const installBattleDelay = () => {
  const currentBridge = bridge();
  if (!currentBridge?.startBattle || currentBridge === wrappedBridge) return;
  originalStartBattle = currentBridge.startBattle;
  const wrapped = async function startBattleAfterVisibleContact(payload) {
    const screen = document.getElementById(SCREEN_ID);
    const isIdleEncounter = payload?.stageId === MAP_ID && screen?.classList.contains("idle-host") && !screen.hidden;
    if (isIdleEncounter) {
      const wild = screen.querySelector(".idle-wild.visible");
      if (wild) {
        const endsAt = Number(wild.dataset.approachEndsAt) || performance.now();
        const remaining = Math.max(0, endsAt - performance.now());
        if (remaining) await sleep(remaining);
        finishWildApproach(wild);
        if (!reducedMotion()) await sleep(140);
      }
    }
    return originalStartBattle.apply(this, arguments);
  };
  wrapped.__naturionIdleApproachWrapper = true;
  currentBridge.startBattle = wrapped;
  wrappedBridge = currentBridge;
};

const refresh = () => {
  ensureStyles();
  observeWild();
  installBattleDelay();
  updateExperienceBar();
};

const observer = new MutationObserver(() => refresh());
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class"] });
window.addEventListener("naturion:open-echo-overworld", () => requestAnimationFrame(refresh));
window.setInterval(() => {
  installBattleDelay();
  const battle = document.getElementById("echoBattle");
  if (battle && !battle.hidden) updateExperienceBar();
}, 180);
refresh();
