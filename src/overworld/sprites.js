import { THREE } from "./engine.js";
import { cloneAtlasTexture, createOverworldTextures, createSpriteMaterial } from "./textures.js";

const DIRECTIONS = ["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"];
const STATE_COLUMNS = Object.freeze({
  idle: [0, 1, 2],
  walking: [3, 4, 5, 6],
  running: [7, 8, 9, 10]
});

const directionFromVelocity = (velocity, fallback = "front") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const angle = Math.atan2(velocity.x, velocity.z);
  return DIRECTIONS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
};

const makeFrameTexture = (sheet, column, row, columns, rows) => cloneAtlasTexture(sheet, columns, rows, column, row);

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    const textures = createOverworldTextures();
    this.sheet = String(characterImage).includes("female") ? textures.heroFemale : textures.heroMale;
    this.frames = new Map();
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 11; column += 1) {
        this.frames.set(`${row}:${column}`, makeFrameTexture(this.sheet, column, row, 11, 8));
      }
    }
    this.material = createSpriteMaterial(this.frames.get("0:0"), { depthWrite: true, alphaTest: 0.08 });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.center.set(0.5, 0.055);
    this.sprite.scale.set(3.05, 3.82, 1);
    this.sprite.renderOrder = 5;
    this.root = new THREE.Group();
    this.root.name = "OverworldDirectionalPlayer";
    this.root.add(this.sprite);
    this.direction = "front";
    this.lastFrame = "0:0";
  }

  update({ state, velocity, elapsed }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    const row = DIRECTIONS.indexOf(this.direction);
    const candidates = STATE_COLUMNS[state] || STATE_COLUMNS.idle;
    const fps = state === "running" ? 12 : state === "walking" ? 8 : 3;
    const column = candidates[Math.floor(elapsed * fps) % candidates.length];
    const key = `${row}:${column}`;
    if (key !== this.lastFrame) {
      this.material.map = this.frames.get(key);
      this.material.needsUpdate = true;
      this.lastFrame = key;
    }
  }

  dispose() {
    this.frames.forEach((texture) => texture.dispose());
    this.material.dispose();
  }
}

const NPC_ROLE_ROW = Object.freeze({
  story: 0,
  resident: 4,
  researcher: 8,
  trainer: 0,
  merchant: 4,
  optional: 8
});

export const createNpcSprite = (role = "story") => {
  const sheet = createOverworldTextures().npcs;
  const baseRow = NPC_ROLE_ROW[role] ?? 0;
  const frames = [0, 1, 2, 3].map((column) => makeFrameTexture(sheet, column, baseRow, 4, 12));
  const material = createSpriteMaterial(frames[0], { depthWrite: true, alphaTest: 0.08 });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.055);
  sprite.scale.set(2.85, 3.56, 1);
  sprite.renderOrder = 4;
  sprite.onBeforeRender = () => {
    const frame = Math.floor(performance.now() / 420) % frames.length;
    if (material.map !== frames[frame]) {
      material.map = frames[frame];
      material.needsUpdate = true;
    }
  };
  return {
    sprite,
    material,
    frames,
    update(elapsed, phase = 0) {
      const frame = Math.floor((elapsed + phase) * 2.3) % frames.length;
      if (material.map !== frames[frame]) {
        material.map = frames[frame];
        material.needsUpdate = true;
      }
    }
  };
};

export const createPixelShadowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 16;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 32, 16);
  context.fillStyle = "rgba(7,20,18,.14)";
  context.fillRect(3, 5, 26, 7);
  context.fillStyle = "rgba(7,20,18,.28)";
  context.fillRect(7, 4, 18, 9);
  context.fillStyle = "rgba(7,20,18,.42)";
  context.fillRect(11, 5, 10, 7);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
};

export const createGroundShadow = ({ width = 1.8, depth = 0.72, opacity = 0.34 } = {}) => {
  const material = new THREE.MeshBasicMaterial({
    map: createPixelShadowTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return { mesh, material };
};

export const disposeSpriteFrames = () => {};
