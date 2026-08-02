import { OverworldEngine, THREE } from "./engine.js";
import { OverworldCamera } from "./camera.js";
import { OverworldInput } from "./input.js";
import { OverworldPlayer } from "./player.js";
import { OverworldEntities } from "./entities.js";
import { OverworldBattleBridge } from "./battle-bridge.js";
import {
  clareiraDosEcosMap,
  buildClareiraDosEcos,
  clareiraDosEcosNaturions
} from "./maps/clareira-dos-ecos.js?v=5";

const screen = document.getElementById("echoOverworldScreen");
const viewport = document.getElementById("echoOverworldViewport");
const objective = document.getElementById("echoOverworldObjective");
const stateLabel = document.getElementById("echoOverworldMovementState");
const interactionPrompt = document.getElementById("echoOverworldInteraction");
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
let entities = null;
let mapBuild = null;
let puzzleOne = null;
let activeInteraction = null;
let active = false;
let lastSaveAt = 0;
let encounterCooldownUntil = 0;
let touchEncounterPending = false;

const bridge = () => window.NaturionOverworldBridge;
const getPlayerSnapshot = () => bridge()?.getPlayer?.() || {};
const prefersLessMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const pause = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const setPrompt = (interaction) => {
  activeInteraction = interaction;
  if (!interactionPrompt) return;
  if (!interaction) {
    interactionPrompt.hidden = true;
    interactionPrompt.textContent = "";
    return;
  }
  interactionPrompt.textContent = interaction.label;
  interactionPrompt.hidden = false;
};

const showToast = (message) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2300);
};

const getPuzzleProgress = () => getPlayerSnapshot().echoOverworldProgress?.puzzles || {};
const getMapObjective = () => getPuzzleProgress().echoesSolved
  ? "O Círculo dos Ecos despertou. Procure o próximo santuário."
  : "Encontre o Círculo dos Ecos no santuário oeste.";

const getSavedPosition = () => {
  const progress = getPlayerSnapshot().echoOverworldProgress;
  if (progress?.mapId !== clareiraDosEcosMap.id) return clareiraDosEcosMap.startPosition;
  const x = Number(progress.position?.x);
  const z = Number(progress.position?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return clareiraDosEcosMap.startPosition;
  return { x, z };
};

const artworkToWorld = (pixelX, pixelY) => ({
  x: clareiraDosEcosMap.bounds.minX
    + (pixelX / 1536) * (clareiraDosEcosMap.bounds.maxX - clareiraDosEcosMap.bounds.minX),
  z: clareiraDosEcosMap.bounds.minZ
    + (pixelY / 1024) * (clareiraDosEcosMap.bounds.maxZ - clareiraDosEcosMap.bounds.minZ)
});

const ensurePuzzleOneStyles = () => {
  if (document.getElementById("echoesPuzzleOneStyles")) return;
  const style = document.createElement("style");
  style.id = "echoesPuzzleOneStyles";
  style.textContent = `
    .echoes-puzzle-screen[hidden] { display: none !important; }
    .echoes-puzzle-screen {
      --echoes-cyan: #68f6ff;
      --echoes-blue: #1e8fbd;
      --echoes-deep: #07251f;
      --echoes-gold: #efcf67;
      position: fixed;
      z-index: 120;
      inset: 0;
      display: grid;
      place-items: center;
      overflow: hidden;
      padding: max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
      background: #061912;
      color: #f7ffe8;
      opacity: 0;
      transform: scale(1.025);
      transition: opacity .28s ease, transform .34s cubic-bezier(.2,.78,.2,1);
      font-family: var(--pixel-font, ui-monospace, "Courier New", monospace);
    }
    .echoes-puzzle-screen.is-open { opacity: 1; transform: scale(1); }
    .echoes-puzzle-backdrop {
      position: absolute;
      z-index: -4;
      inset: -7%;
      background-image: url("assets/overworld/clareira-dos-ecos/ground-v2.webp");
      background-repeat: no-repeat;
      background-size: 240% auto;
      background-position: 4% 3%;
      filter: saturate(1.08) contrast(1.08) brightness(.62);
      transform: scale(1.03);
    }
    .echoes-puzzle-screen::before {
      position: absolute;
      z-index: -3;
      inset: 0;
      content: "";
      background:
        radial-gradient(circle at 50% 45%, rgba(52, 214, 199, .16), transparent 36%),
        linear-gradient(180deg, rgba(2, 15, 11, .42), rgba(2, 13, 10, .78));
      pointer-events: none;
    }
    .echoes-puzzle-screen::after {
      position: absolute;
      z-index: -2;
      inset: 0;
      content: "";
      opacity: .11;
      background-image:
        linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px);
      background-size: 4px 4px;
      mix-blend-mode: soft-light;
      pointer-events: none;
    }
    .echoes-puzzle-shell {
      position: relative;
      display: grid;
      width: min(94vw, 920px);
      max-height: calc(100svh - 36px);
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: clamp(10px, 1.8vh, 18px);
      padding: clamp(16px, 2.8vw, 28px);
      border: 3px solid #263f2c;
      border-radius: 13px;
      outline: 2px solid rgba(239, 207, 103, .76);
      outline-offset: -8px;
      background: linear-gradient(180deg, rgba(10, 42, 31, .97), rgba(4, 22, 17, .98));
      box-shadow: 0 12px 0 #03110d, 0 24px 44px rgba(0,0,0,.62), inset 0 1px rgba(255,255,255,.12);
      overflow: hidden;
    }
    .echoes-puzzle-header { text-align: center; }
    .echoes-puzzle-kicker {
      display: inline-block;
      margin-bottom: 7px;
      padding: 5px 12px;
      border: 1px solid rgba(239,207,103,.58);
      background: rgba(4, 22, 17, .72);
      color: #ffe89a;
      font-size: clamp(.62rem, 1.3vw, .82rem);
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    .echoes-puzzle-header h2 {
      margin: 0;
      color: #fff6bd;
      font-size: clamp(1.3rem, 3.3vw, 2.25rem);
      text-shadow: 3px 3px 0 #142519, 0 0 17px rgba(239,207,103,.25);
      text-transform: uppercase;
    }
    .echoes-puzzle-header p {
      max-width: 690px;
      margin: 8px auto 0;
      color: #d7e9cc;
      font-size: clamp(.72rem, 1.5vw, .94rem);
      line-height: 1.45;
    }
    .echoes-puzzle-close {
      position: absolute;
      z-index: 8;
      top: 14px;
      right: 14px;
      width: 43px;
      height: 43px;
      border: 2px solid #7d6124;
      border-radius: 5px;
      background: linear-gradient(#375244, #132b23);
      color: #fff3af;
      cursor: pointer;
      font-weight: 1000;
      box-shadow: 0 4px 0 #07150f;
    }
    .echoes-puzzle-board {
      position: relative;
      display: grid;
      width: min(68vh, 540px, 88vw);
      aspect-ratio: 1;
      place-self: center;
      place-items: center;
      border: clamp(12px, 2.6vw, 22px) solid #59634c;
      border-radius: 50%;
      background:
        radial-gradient(circle, rgba(25, 77, 63, .98) 0 18%, rgba(10, 45, 36, .96) 19% 43%, rgba(55, 69, 49, .98) 44% 48%, rgba(15, 37, 28, .98) 49% 100%);
      box-shadow:
        0 11px 0 #1d271d,
        0 19px 28px rgba(0,0,0,.5),
        inset 0 0 0 5px #263a2d,
        inset 0 0 0 11px rgba(210,219,150,.16),
        inset 0 0 45px rgba(38, 222, 211, .12);
      isolation: isolate;
    }
    .echoes-puzzle-board::before,
    .echoes-puzzle-board::after {
      position: absolute;
      z-index: -1;
      inset: 11%;
      content: "";
      border: 4px dashed rgba(165,188,128,.48);
      border-radius: 50%;
      transform: rotate(11deg);
    }
    .echoes-puzzle-board::after {
      inset: 25%;
      border-style: solid;
      border-width: 3px;
      opacity: .68;
      transform: rotate(-17deg);
    }
    .echoes-puzzle-crystal {
      position: absolute;
      z-index: 2;
      width: 15%;
      aspect-ratio: .72;
      border: 3px solid #0d5364;
      background: linear-gradient(135deg, #d8ffff 0 13%, #67f3ff 14% 42%, #158ab7 43% 72%, #0c446e 73% 100%);
      clip-path: polygon(50% 0, 100% 30%, 83% 100%, 17% 100%, 0 30%);
      box-shadow: 0 0 0 5px rgba(5,32,31,.7), 0 0 28px rgba(81,241,255,.48);
      animation: echoes-crystal-idle 2s ease-in-out infinite;
    }
    .echoes-puzzle-screen.is-solved .echoes-puzzle-crystal {
      background: linear-gradient(135deg, #fffbd1, #b9ffce 40%, #52ddb5 72%, #197e70);
      box-shadow: 0 0 0 5px rgba(5,32,31,.7), 0 0 45px rgba(110,255,198,.85);
      animation: echoes-crystal-solved .65s ease-in-out infinite alternate;
    }
    .echoes-rune {
      position: absolute;
      z-index: 4;
      display: grid;
      width: clamp(72px, 18%, 104px);
      aspect-ratio: 1;
      place-items: center;
      border: 4px solid #273b31;
      border-radius: 12px;
      outline: 2px solid #847646;
      outline-offset: -8px;
      background: linear-gradient(145deg, #77816b, #3f4f42 58%, #26372e);
      box-shadow: 0 7px 0 #17241d, 0 12px 18px rgba(0,0,0,.34), inset 0 2px rgba(255,255,255,.18);
      color: #91eee9;
      cursor: pointer;
      transition: transform .14s ease, filter .14s ease, box-shadow .14s ease;
    }
    .echoes-rune[data-rune="0"] { top: 7%; left: 50%; transform: translateX(-50%); }
    .echoes-rune[data-rune="1"] { right: 8%; bottom: 14%; }
    .echoes-rune[data-rune="2"] { left: 8%; bottom: 14%; }
    .echoes-rune:hover:not(:disabled),
    .echoes-rune:focus-visible:not(:disabled) { filter: brightness(1.13); }
    .echoes-rune:active:not(:disabled) { box-shadow: 0 2px 0 #17241d; }
    .echoes-rune svg { width: 58%; height: 58%; filter: drop-shadow(0 0 7px currentColor); }
    .echoes-rune.is-active,
    .echoes-rune.is-correct {
      color: #eaffff;
      filter: brightness(1.45) saturate(1.3);
      box-shadow: 0 4px 0 #12302a, 0 0 27px rgba(80,244,255,.88), inset 0 0 18px rgba(84,250,255,.5);
    }
    .echoes-rune[data-rune="0"].is-active,
    .echoes-rune[data-rune="0"].is-correct { transform: translateX(-50%) translateY(-3px) scale(1.06); }
    .echoes-rune[data-rune="1"].is-active,
    .echoes-rune[data-rune="1"].is-correct,
    .echoes-rune[data-rune="2"].is-active,
    .echoes-rune[data-rune="2"].is-correct { transform: translateY(-3px) scale(1.06); }
    .echoes-puzzle-screen.is-error .echoes-puzzle-board { animation: echoes-puzzle-shake .28s linear; }
    .echoes-puzzle-footer { display: grid; justify-items: center; gap: 10px; text-align: center; }
    .echoes-puzzle-status {
      min-height: 2.6em;
      margin: 0;
      color: #eaf4d9;
      font-size: clamp(.72rem, 1.55vw, .92rem);
      line-height: 1.35;
    }
    .echoes-puzzle-progress { display: flex; gap: 9px; }
    .echoes-puzzle-progress span {
      width: 12px;
      height: 12px;
      border: 2px solid #7f8157;
      background: #20352a;
      transform: rotate(45deg);
    }
    .echoes-puzzle-progress span.is-filled { background: #7df6e9; box-shadow: 0 0 10px #66f5e8; }
    .echoes-puzzle-start {
      min-width: min(330px, 82vw);
      min-height: 50px;
      padding: 10px 20px;
      border: 3px solid #143224;
      border-radius: 7px;
      outline: 2px solid #e4bd4f;
      outline-offset: -7px;
      background: linear-gradient(#5aa35a, #276b43 64%, #17452e);
      color: #fff7c5;
      cursor: pointer;
      font-weight: 1000;
      letter-spacing: .06em;
      text-transform: uppercase;
      box-shadow: 0 6px 0 #071b12, 0 11px 18px rgba(0,0,0,.35);
    }
    .echoes-puzzle-start:disabled { cursor: wait; filter: saturate(.5) brightness(.78); }
    @keyframes echoes-crystal-idle { 0%,100% { transform: translateY(2px); } 50% { transform: translateY(-5px); } }
    @keyframes echoes-crystal-solved { from { transform: translateY(-3px) scale(1); } to { transform: translateY(-7px) scale(1.06); } }
    @keyframes echoes-puzzle-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-7px); } 75% { transform: translateX(7px); } }
    @media (max-width: 640px) {
      .echoes-puzzle-shell { width: 96vw; padding: 14px; gap: 8px; }
      .echoes-puzzle-close { top: 10px; right: 10px; width: 39px; height: 39px; }
      .echoes-puzzle-board { width: min(58vh, 88vw); border-width: 11px; }
      .echoes-rune { width: clamp(62px, 19%, 84px); border-width: 3px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .echoes-puzzle-screen, .echoes-rune { transition: none; }
      .echoes-puzzle-crystal { animation: none; }
    }
  `;
  document.head.append(style);
};

const createRuneSvg = (kind) => {
  const paths = [
    '<path d="M12 2 4 9l4 11 4-5 4 5 4-11-8-7Zm0 4 4 4-4 2-4-2 4-4Z" fill="currentColor"/>',
    '<path d="M12 2 3 7l3 13 6-4 6 4 3-13-9-5Zm0 4 4 3-4 4-4-4 4-3Z" fill="currentColor"/>',
    '<path d="M12 2 5 5v6l-3 3 7 8 3-6 3 6 7-8-3-3V5l-7-3Zm0 4 3 2-3 5-3-5 3-2Z" fill="currentColor"/>'
  ];
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
};

class EchoesCirclePuzzle {
  constructor({ scene, mapScreen, onOpen, onClose, onSolved }) {
    this.scene = scene;
    this.mapScreen = mapScreen;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onSolved = onSolved;
    this.location = artworkToWorld(230, 170);
    this.interactionRadius = 3.55;
    this.opened = false;
    this.accepting = false;
    this.sequence = [];
    this.inputIndex = 0;
    this.playbackToken = 0;
    this.audioContext = null;
    this.solved = Boolean(getPuzzleProgress().echoesSolved);
    this.createMapMarker();
    this.createScreen();
  }

  createMapMarker() {
    this.markerCanvas = document.createElement("canvas");
    this.markerCanvas.width = 40;
    this.markerCanvas.height = 56;
    this.markerTexture = new THREE.CanvasTexture(this.markerCanvas);
    this.markerTexture.colorSpace = THREE.SRGBColorSpace;
    this.markerTexture.magFilter = THREE.NearestFilter;
    this.markerTexture.minFilter = THREE.NearestFilter;
    this.markerTexture.generateMipmaps = false;
    this.markerMaterial = new THREE.SpriteMaterial({
      map: this.markerTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.marker = new THREE.Sprite(this.markerMaterial);
    this.marker.name = "PuzzleOneEchoesMarker";
    this.marker.center.set(.5, .08);
    this.marker.scale.set(2.7, 3.75, 1);
    this.marker.position.set(this.location.x, .44, this.location.z);
    this.marker.renderOrder = 9800;
    this.scene.add(this.marker);
    this.drawMapMarker();
  }

  drawMapMarker() {
    const context = this.markerCanvas.getContext("2d", { alpha: true });
    context.clearRect(0, 0, 40, 56);
    const glow = this.solved ? "rgba(115,255,190,.32)" : "rgba(75,239,255,.28)";
    const bright = this.solved ? "#e7ffd0" : "#d8ffff";
    const mid = this.solved ? "#68e7ae" : "#62efff";
    const dark = this.solved ? "#1e7d66" : "#147ca5";
    context.fillStyle = glow;
    context.fillRect(5, 13, 30, 32);
    context.fillRect(9, 8, 22, 42);
    context.fillStyle = "rgba(5,25,23,.62)";
    context.fillRect(14, 6, 12, 4);
    context.fillRect(10, 10, 20, 5);
    context.fillRect(7, 15, 26, 20);
    context.fillRect(10, 35, 20, 8);
    context.fillStyle = dark;
    context.fillRect(16, 8, 8, 4);
    context.fillRect(12, 12, 16, 8);
    context.fillRect(10, 20, 20, 13);
    context.fillRect(14, 33, 12, 8);
    context.fillStyle = mid;
    context.fillRect(18, 8, 4, 4);
    context.fillRect(15, 12, 10, 8);
    context.fillRect(14, 20, 12, 12);
    context.fillRect(17, 32, 6, 7);
    context.fillStyle = bright;
    context.fillRect(18, 12, 4, 15);
    context.fillRect(15, 20, 3, 7);
    context.fillStyle = this.solved ? "rgba(198,255,218,.72)" : "rgba(151,248,255,.7)";
    context.fillRect(4, 48, 32, 2);
    context.fillRect(9, 51, 22, 2);
    this.markerTexture.needsUpdate = true;
  }

  createScreen() {
    ensurePuzzleOneStyles();
    this.screen = document.createElement("main");
    this.screen.className = "echoes-puzzle-screen";
    this.screen.id = "echoesPuzzleOneScreen";
    this.screen.setAttribute("aria-label", "Puzzle Círculo dos Ecos");
    this.screen.hidden = true;
    this.screen.innerHTML = `
      <div class="echoes-puzzle-backdrop" aria-hidden="true"></div>
      <section class="echoes-puzzle-shell">
        <button class="echoes-puzzle-close" type="button" aria-label="Voltar ao mapa">×</button>
        <header class="echoes-puzzle-header">
          <span class="echoes-puzzle-kicker">Puzzle 1 de 3</span>
          <h2>Círculo dos Ecos</h2>
          <p>As três runas guardam uma lembrança antiga. Observe a ordem em que despertam e repita a sequência.</p>
        </header>
        <div class="echoes-puzzle-board" role="group" aria-label="Três runas do Círculo dos Ecos">
          <div class="echoes-puzzle-crystal" aria-hidden="true"></div>
          ${[0, 1, 2].map((index) => `
            <button class="echoes-rune" type="button" data-rune="${index}" aria-label="Runa ${index + 1}" disabled>
              ${createRuneSvg(index)}
            </button>
          `).join("")}
        </div>
        <footer class="echoes-puzzle-footer">
          <div class="echoes-puzzle-progress" aria-label="Progresso da sequência">
            <span></span><span></span><span></span>
          </div>
          <p class="echoes-puzzle-status" aria-live="polite">Pressione “Ouvir os Ecos” para revelar a sequência.</p>
          <button class="echoes-puzzle-start" type="button">Ouvir os Ecos</button>
        </footer>
      </section>
    `;
    document.body.append(this.screen);
    this.closeButton = this.screen.querySelector(".echoes-puzzle-close");
    this.startButton = this.screen.querySelector(".echoes-puzzle-start");
    this.status = this.screen.querySelector(".echoes-puzzle-status");
    this.runeButtons = [...this.screen.querySelectorAll(".echoes-rune")];
    this.progressDots = [...this.screen.querySelectorAll(".echoes-puzzle-progress span")];
    this.closeButton.addEventListener("click", () => void this.close(false));
    this.startButton.addEventListener("click", () => void this.begin());
    this.runeButtons.forEach((button) => {
      button.addEventListener("click", () => void this.chooseRune(Number(button.dataset.rune)));
    });
    this.onKeyDown = (event) => {
      if (!this.opened || event.code !== "Escape") return;
      event.preventDefault();
      void this.close(false);
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  getInteraction(playerPosition) {
    if (this.solved || this.opened) return null;
    const distance = Math.hypot(playerPosition.x - this.location.x, playerPosition.z - this.location.z);
    if (distance > this.interactionRadius) return null;
    return {
      id: "puzzle-one-circle-of-echoes",
      type: "puzzle",
      label: "E · Ativar o Círculo dos Ecos",
      entity: this
    };
  }

  update(elapsed) {
    const pixelBob = Math.round(Math.sin(elapsed * 2.15) * 4) / 32;
    this.marker.position.y = .44 + pixelBob;
    this.markerMaterial.opacity = this.solved
      ? .92
      : .76 + (Math.sin(elapsed * 3.1) + 1) * .09;
  }

  async open() {
    if (this.opened || this.solved) return false;
    this.opened = true;
    this.playbackToken += 1;
    this.accepting = false;
    this.sequence = [];
    this.inputIndex = 0;
    this.screen.classList.remove("is-error", "is-solved");
    this.runeButtons.forEach((button) => {
      button.disabled = true;
      button.classList.remove("is-active", "is-correct");
    });
    this.progressDots.forEach((dot) => dot.classList.remove("is-filled"));
    this.startButton.hidden = false;
    this.startButton.disabled = false;
    this.status.textContent = "Pressione “Ouvir os Ecos” para revelar a sequência.";
    this.onOpen?.();
    this.mapScreen.hidden = true;
    this.screen.hidden = false;
    requestAnimationFrame(() => this.screen.classList.add("is-open"));
    window.setTimeout(() => this.startButton.focus(), prefersLessMotion() ? 0 : 320);
    return true;
  }

  async close(completed) {
    if (!this.opened) return false;
    this.playbackToken += 1;
    this.accepting = false;
    this.runeButtons.forEach((button) => { button.disabled = true; });
    this.screen.classList.remove("is-open");
    await pause(prefersLessMotion() ? 0 : 260);
    this.screen.hidden = true;
    this.mapScreen.hidden = false;
    this.opened = false;
    this.onClose?.({ completed });
    return true;
  }

  shuffledRunes() {
    const values = [0, 1, 2];
    for (let index = values.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
    }
    return values;
  }

  ensureAudio() {
    if (this.audioContext) return this.audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  playTone(index, duration = .18, gainValue = .07) {
    const context = this.ensureAudio();
    if (!context) return;
    void context.resume?.();
    const frequencies = [392, 523.25, 659.25];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequencies[index] || 440, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .03);
  }

  async begin() {
    if (!this.opened || this.startButton.disabled) return;
    this.sequence = this.shuffledRunes();
    this.inputIndex = 0;
    this.progressDots.forEach((dot) => dot.classList.remove("is-filled"));
    this.startButton.disabled = true;
    await this.playSequence();
  }

  async playSequence() {
    const token = ++this.playbackToken;
    this.accepting = false;
    this.runeButtons.forEach((button) => {
      button.disabled = true;
      button.classList.remove("is-active", "is-correct");
    });
    this.status.textContent = "Escute e observe os ecos...";
    await pause(prefersLessMotion() ? 100 : 520);
    for (const runeIndex of this.sequence) {
      if (!this.opened || token !== this.playbackToken) return;
      const button = this.runeButtons[runeIndex];
      button.classList.add("is-active");
      this.playTone(runeIndex, .3, .085);
      await pause(prefersLessMotion() ? 120 : 470);
      button.classList.remove("is-active");
      await pause(prefersLessMotion() ? 70 : 210);
    }
    if (!this.opened || token !== this.playbackToken) return;
    this.inputIndex = 0;
    this.accepting = true;
    this.runeButtons.forEach((button) => { button.disabled = false; });
    this.status.textContent = "Agora repita a sequência tocando nas três runas.";
    this.runeButtons[0].focus();
  }

  async chooseRune(runeIndex) {
    if (!this.opened || !this.accepting) return;
    const button = this.runeButtons[runeIndex];
    button.classList.add("is-active");
    this.playTone(runeIndex, .2, .075);
    window.setTimeout(() => button.classList.remove("is-active"), 180);

    if (runeIndex !== this.sequence[this.inputIndex]) {
      this.accepting = false;
      this.runeButtons.forEach((item) => { item.disabled = true; });
      this.screen.classList.add("is-error");
      this.status.textContent = "A sequência se desfez. Observe novamente.";
      this.progressDots.forEach((dot) => dot.classList.remove("is-filled"));
      this.playTone(0, .34, .05);
      await pause(680);
      this.screen.classList.remove("is-error");
      await this.playSequence();
      return;
    }

    button.classList.add("is-correct");
    window.setTimeout(() => button.classList.remove("is-correct"), 260);
    this.progressDots[this.inputIndex]?.classList.add("is-filled");
    this.inputIndex += 1;
    if (this.inputIndex >= this.sequence.length) await this.solve();
  }

  async solve() {
    this.accepting = false;
    this.runeButtons.forEach((button) => {
      button.disabled = true;
      button.classList.add("is-correct");
    });
    this.solved = true;
    this.screen.classList.add("is-solved");
    this.status.textContent = "Círculo desperto! O segundo santuário respondeu ao chamado.";
    this.startButton.hidden = true;
    const progress = getPuzzleProgress();
    bridge()?.saveEchoMapState?.({
      puzzles: {
        ...progress,
        echoesSolved: true
      },
      puzzleOneSolvedAt: new Date().toISOString()
    });
    this.drawMapMarker();
    this.onSolved?.();
    [0, 1, 2, 1, 2].forEach((index, order) => {
      window.setTimeout(() => this.playTone(index, .26, .065), order * 120);
    });
    await pause(prefersLessMotion() ? 650 : 1850);
    await this.close(true);
  }

  dispose() {
    this.playbackToken += 1;
    window.removeEventListener("keydown", this.onKeyDown);
    this.marker.removeFromParent();
    this.markerMaterial.dispose();
    this.markerTexture.dispose();
    this.screen.remove();
    void this.audioContext?.close?.();
  }
}

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

const runEncounter = async (entity) => {
  savePosition(true);
  active = false;
  input?.reset?.();
  setPrompt(null);
  engine.stop();
  const battleBridge = new OverworldBattleBridge({
    mapId: clareiraDosEcosMap.id,
    sceneImage: clareiraDosEcosMap.sceneImage
  });
  const result = await battleBridge.start(entity);
  active = true;
  engine.start();
  encounterCooldownUntil = performance.now() + 1800;
  if (result?.outcome === "victory") showToast(`${entity.form.name} foi derrotado. Você retornou à Clareira dos Ecos.`);
  if (result?.outcome === "fled") showToast("Você recuou e retornou ao mesmo local.");
  if (result?.outcome === "defeat") showToast("Sua equipe se recuperou e voltou à entrada da Clareira.");
  return result;
};

const openPuzzleOne = async () => {
  if (!active || !puzzleOne) return false;
  savePosition(true);
  active = false;
  input?.reset?.();
  setPrompt(null);
  engine?.stop?.();
  return puzzleOne.open();
};

const handleInteraction = async () => {
  if (!active || !activeInteraction || touchEncounterPending || !teamPanel.hidden) return;
  input?.reset?.();
  if (activeInteraction.type === "puzzle") {
    await openPuzzleOne();
    return;
  }
  await entities?.interact?.();
};

const closeTeam = () => {
  teamPanel.hidden = true;
  setPrompt(null);
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
  setPrompt(null);
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
    isActive: () => active && !screen.hidden && teamPanel.hidden && !puzzleOne?.opened,
    onInteract: handleInteraction,
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

  entities = new OverworldEntities({
    scene: engine.scene,
    collision: mapBuild.collision,
    forms: window.__naturionEcho?.forms || {},
    onEncounter: runEncounter
  });
  entities.spawn({ naturions: clareiraDosEcosNaturions });

  puzzleOne = new EchoesCirclePuzzle({
    scene: engine.scene,
    mapScreen: screen,
    onOpen: () => {
      teamPanel.hidden = true;
      stateLabel.textContent = "Puzzle";
    },
    onClose: ({ completed }) => {
      screen.hidden = false;
      active = true;
      input.enabled = true;
      engine.start();
      objective.textContent = getMapObjective();
      stateLabel.textContent = "Parado";
      setPrompt(null);
      viewport.focus();
      if (completed) showToast("Puzzle 1 concluído · O segundo santuário foi liberado.");
    },
    onSolved: () => {
      objective.textContent = "O Círculo dos Ecos despertou. Procure o próximo santuário.";
    }
  });

  engine.addUpdater((delta, elapsed) => {
    const movement = player.update(delta);
    camera.update(delta, movement.velocity);
    const entityInteraction = entities.update(delta, elapsed, player.group.position);
    puzzleOne.update(elapsed);
    const puzzleInteraction = puzzleOne.getInteraction(player.group.position);
    const nextInteraction = puzzleInteraction || (entityInteraction ? entities.getInteraction() : null);
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
      && !puzzleInteraction
      && performance.now() >= encounterCooldownUntil
      && entities.touchTarget
      && active
      && teamPanel.hidden
    ) {
      touchEncounterPending = true;
      entities.consumeTouchEncounter().finally(() => { touchEncounterPending = false; });
    }
  });
};

const recoverFromMapError = (error) => {
  console.error("[Naturion Overworld] Falha ao carregar a Clareira dos Ecos:", error);
  active = false;
  try { input?.reset?.(); } catch {}
  try { engine?.stop?.(); } catch {}
  setPrompt(null);
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
    setPrompt(null);
    screen.hidden = false;
    objective.textContent = getMapObjective();
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
