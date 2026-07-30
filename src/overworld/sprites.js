import { THREE } from "./engine.js";
import { createSpriteMaterial } from "./textures.js";

const frameCache = new Map();
const DIRECTIONS = ["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"];

const canvasTexture = (key, width, height, painter) => {
  if (frameCache.has(key)) return frameCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  painter(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  frameCache.set(key, texture);
  return texture;
};

const fill = (context, color, x, y, width, height) => {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
};

const getPalette = (variant) => variant === "female"
  ? { outline: "#172b2b", skin: "#e6b58b", skinLight: "#ffd0a3", hair: "#5a2f34", hairLight: "#8c4c4e", shirt: "#3f77a5", shirtLight: "#64a9cf", pants: "#273d62", boot: "#392d2a", pack: "#8a5d36" }
  : { outline: "#172b2b", skin: "#d9a77f", skinLight: "#f4c399", hair: "#3b2e28", hairLight: "#6b4b37", shirt: "#3d8b55", shirtLight: "#69bb68", pants: "#32465f", boot: "#382e2a", pack: "#845635" };

const drawHeroFrame = (context, { variant, direction, phase, running }) => {
  const palette = getPalette(variant);
  const back = direction.startsWith("back");
  const side = direction === "left" || direction === "right";
  const diagonal = direction.includes("-");
  const facingLeft = direction.endsWith("left") || direction === "left";
  const stride = phase === 1 ? (running ? 3 : 2) : phase === 2 ? (running ? -3 : -2) : 0;
  const bob = phase ? (running ? 1 : 0) : 0;
  const bodyX = 16 + (diagonal ? (facingLeft ? -1 : 1) : 0);

  fill(context, palette.outline, bodyX - 8, 7 + bob, 16, 15);
  fill(context, palette.skin, bodyX - 6, 9 + bob, 12, 11);
  if (!back) {
    fill(context, palette.skinLight, bodyX - 4, 10 + bob, 7, 4);
    if (!side) {
      fill(context, palette.outline, bodyX - 4, 14 + bob, 2, 2);
      fill(context, palette.outline, bodyX + 2, 14 + bob, 2, 2);
    } else {
      fill(context, palette.outline, bodyX + (facingLeft ? -4 : 2), 14 + bob, 2, 2);
    }
  }
  fill(context, palette.hair, bodyX - 7, 6 + bob, 14, 6);
  fill(context, palette.hairLight, bodyX - 5, 7 + bob, side ? 5 : 8, 2);
  if (back) fill(context, palette.hair, bodyX - 6, 11 + bob, 12, 7);

  fill(context, palette.outline, bodyX - 7, 21 + bob, 14, 16);
  fill(context, palette.shirt, bodyX - 5, 22 + bob, 10, 13);
  fill(context, palette.shirtLight, bodyX - 4, 23 + bob, back ? 3 : 7, 3);
  if (back) {
    fill(context, palette.pack, bodyX - 4, 23 + bob, 8, 9);
    fill(context, palette.outline, bodyX - 3, 24 + bob, 6, 2);
  }

  const armSwing = phase === 1 ? 2 : phase === 2 ? -2 : 0;
  fill(context, palette.outline, bodyX - 10, 23 + bob + armSwing, 4, 12);
  fill(context, palette.shirt, bodyX - 9, 24 + bob + armSwing, 2, 8);
  fill(context, palette.skin, bodyX - 9, 32 + bob + armSwing, 2, 3);
  fill(context, palette.outline, bodyX + 6, 23 + bob - armSwing, 4, 12);
  fill(context, palette.shirt, bodyX + 7, 24 + bob - armSwing, 2, 8);
  fill(context, palette.skin, bodyX + 7, 32 + bob - armSwing, 2, 3);

  fill(context, palette.outline, bodyX - 6 + stride, 35 + bob, 5, 12);
  fill(context, palette.pants, bodyX - 5 + stride, 35 + bob, 3, 8);
  fill(context, palette.boot, bodyX - 6 + stride, 43 + bob, 5, 4);
  fill(context, palette.outline, bodyX + 1 - stride, 35 + bob, 5, 12);
  fill(context, palette.pants, bodyX + 2 - stride, 35 + bob, 3, 8);
  fill(context, palette.boot, bodyX + 1 - stride, 43 + bob, 5, 4);
};

const buildHeroFrames = (variant) => {
  const frames = new Map();
  DIRECTIONS.forEach((direction) => {
    ["idle", "walk-a", "walk-b", "run-a", "run-b"].forEach((state) => {
      const phase = state.endsWith("a") ? 1 : state.endsWith("b") ? 2 : 0;
      frames.set(`${direction}:${state}`, canvasTexture(
        `hero-${variant}-${direction}-${state}`,
        32,
        48,
        (context) => drawHeroFrame(context, { variant, direction, phase, running: state.startsWith("run") })
      ));
    });
  });
  return frames;
};

const directionFromVelocity = (velocity, fallback = "front") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const angle = Math.atan2(velocity.x, velocity.z);
  const index = Math.round(angle / (Math.PI / 4));
  const normalized = (index + 8) % 8;
  return ["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"][normalized];
};

export const createPixelShadowTexture = () => canvasTexture("ow-shadow", 32, 16, (context) => {
  context.clearRect(0, 0, 32, 16);
  fill(context, "rgba(7,20,18,.14)", 3, 5, 26, 7);
  fill(context, "rgba(7,20,18,.28)", 7, 4, 18, 9);
  fill(context, "rgba(7,20,18,.42)", 11, 5, 10, 7);
});

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    this.variant = String(characterImage).includes("female") ? "female" : "male";
    this.frames = buildHeroFrames(this.variant);
    this.material = createSpriteMaterial(this.frames.get("front:idle"), { depthWrite: true, fog: true });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.center.set(0.5, 0.04);
    this.sprite.scale.set(2.55, 3.82, 1);
    this.sprite.renderOrder = 5;
    this.root = new THREE.Group();
    this.root.name = "OverworldDirectionalPlayer";
    this.root.add(this.sprite);
    this.direction = "front";
    this.lastFrame = "front:idle";
  }

  update({ state, velocity, elapsed }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    let frameState = "idle";
    if (state === "walking") frameState = Math.floor(elapsed * 7) % 2 ? "walk-a" : "walk-b";
    if (state === "running") frameState = Math.floor(elapsed * 11) % 2 ? "run-a" : "run-b";
    const key = `${this.direction}:${frameState}`;
    if (key !== this.lastFrame) {
      this.material.map = this.frames.get(key);
      this.material.needsUpdate = true;
      this.lastFrame = key;
    }
    this.sprite.position.y = state === "idle" ? Math.round(Math.sin(elapsed * 2) * 2) / 64 : 0;
  }

  dispose() {
    this.material.dispose();
  }
}

const NPC_PALETTES = {
  story: { hair: "#49352f", shirt: "#6e9f58", accent: "#d9c76c" },
  resident: { hair: "#6a3e36", shirt: "#4f7ca0", accent: "#e2a860" },
  researcher: { hair: "#3b3332", shirt: "#dfd7bb", accent: "#4c9d8f" },
  merchant: { hair: "#5b4434", shirt: "#9a6240", accent: "#d9bd65" }
};

const createNpcTexture = (role) => canvasTexture(`npc-${role}`, 32, 48, (context) => {
  const palette = NPC_PALETTES[role] || NPC_PALETTES.story;
  fill(context, "#172b2b", 8, 6, 16, 16);
  fill(context, "#e2b287", 10, 9, 12, 11);
  fill(context, palette.hair, 9, 5, 14, 7);
  fill(context, "#172b2b", 12, 14, 2, 2);
  fill(context, "#172b2b", 18, 14, 2, 2);
  fill(context, "#172b2b", 8, 21, 16, 17);
  fill(context, palette.shirt, 10, 22, 12, 14);
  fill(context, palette.accent, 12, 24, 8, 3);
  fill(context, "#172b2b", 7, 23, 4, 13);
  fill(context, "#172b2b", 21, 23, 4, 13);
  fill(context, "#31465f", 10, 36, 5, 10);
  fill(context, "#31465f", 17, 36, 5, 10);
  fill(context, "#392e2a", 9, 44, 6, 3);
  fill(context, "#392e2a", 17, 44, 6, 3);
});

export const createNpcSprite = (role) => {
  const material = createSpriteMaterial(createNpcTexture(role), { depthWrite: true });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.04);
  sprite.scale.set(2.35, 3.52, 1);
  sprite.renderOrder = 4;
  return { sprite, material };
};

export const createGroundShadow = ({ width = 1.8, depth = 0.72, opacity = 0.34 } = {}) => {
  const material = new THREE.MeshBasicMaterial({ map: createPixelShadowTexture(), transparent: true, depthWrite: false, opacity });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return { mesh, material };
};

export const disposeSpriteFrames = () => {
  frameCache.forEach((texture) => texture.dispose());
  frameCache.clear();
};
