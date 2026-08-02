import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const HERO_COLUMNS = 8;
const HERO_ROWS = 3;
const NPC_COLUMNS = 4;
const NPC_ROWS = 12;
const textureLoader = new THREE.TextureLoader();
let sharedShadowTexture = null;

const DIRECTIONS = Object.freeze([
  "front", "front-right", "right", "back-right",
  "back", "back-left", "left", "front-left"
]);
const DIRECTION_COLUMN = Object.freeze(Object.fromEntries(
  DIRECTIONS.map((direction, index) => [direction, index])
));
const NPC_ROWS_BY_ROLE = Object.freeze({ story: 0, resident: 4, researcher: 8, merchant: 0 });
const HERO_SHEETS = Object.freeze({
  male: Object.freeze({
    url: "assets/overworld/characters/hero-male/hero-male-overworld.webp",
    frameAspect: 209 / 314
  }),
  female: Object.freeze({
    url: "assets/overworld/characters/hero-female/hero-female-overworld.webp",
    frameAspect: 222 / 296
  })
});

const configureSheet = (texture, name) => {
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
};

const createSheetInstance = (url, name) => configureSheet(textureLoader.load(url), name);

const directionFromVelocity = (velocity, fallback = "back") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const index = Math.round(Math.atan2(velocity.x, velocity.z) / (Math.PI / 4));
  return DIRECTIONS[(index + 8) % 8];
};

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    this.variant = String(characterImage).includes("female") ? "female" : "male";
    this.direction = "back";
    this.lastFrameKey = "";
    const sheet = HERO_SHEETS[this.variant];
    this.texture = createSheetInstance(sheet.url, `overworld-hero-${this.variant}`);
    configureAtlasFrame(this.texture, {
      columns: HERO_COLUMNS,
      rows: HERO_ROWS,
      column: DIRECTION_COLUMN[this.direction],
      row: 0
    });
    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.035,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.name = `OverworldApprovedHero-${this.variant}`;
    this.sprite.center.set(0.5, 0.045);
    this.sprite.scale.set(4.8 * sheet.frameAspect, 4.8, 1);
    this.sprite.frustumCulled = false;
    this.root = new THREE.Group();
    this.root.name = `OverworldApprovedHeroRig-${this.variant}`;
    this.root.add(this.sprite);
  }

  update({ state, velocity, elapsed, worldZ = 0 }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    const walking = state === "walking";
    const running = state === "running";
    const moving = walking || running;
    const frameRate = running ? 11 : 7;
    const row = moving ? 1 + (Math.floor(elapsed * frameRate) % 2) : 0;
    const column = DIRECTION_COLUMN[this.direction] ?? 0;
    const frameKey = `${column}:${row}`;
    if (frameKey !== this.lastFrameKey) {
      configureAtlasFrame(this.texture, {
        columns: HERO_COLUMNS,
        rows: HERO_ROWS,
        column,
        row
      });
      this.lastFrameKey = frameKey;
    }

    const phase = Math.sin(elapsed * (running ? 11 : walking ? 7 : 2));
    this.root.position.y = moving
      ? Math.abs(phase) * (running ? 0.055 : 0.028)
      : Math.sin(elapsed * 2) * 0.008;
    const stretch = running ? 1 + Math.abs(phase) * 0.018 : 1;
    this.root.scale.set(1 / stretch, stretch, 1);
    this.material.rotation = moving ? phase * (running ? 0.018 : 0.008) : 0;
    this.sprite.renderOrder = depthOrderForZ(worldZ, 18);
  }

  dispose() {
    this.material.dispose();
    this.texture.dispose();
    this.root.removeFromParent();
  }
}

const getPixelShadowTexture = () => {
  if (sharedShadowTexture) return sharedShadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 16;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Não foi possível criar a sombra do protagonista.");
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 32, 16);
  context.fillStyle = "rgba(7, 18, 16, .12)";
  context.fillRect(3, 6, 26, 5);
  context.fillStyle = "rgba(7, 18, 16, .25)";
  context.fillRect(7, 4, 18, 9);
  context.fillStyle = "rgba(7, 18, 16, .40)";
  context.fillRect(11, 5, 10, 7);
  sharedShadowTexture = new THREE.CanvasTexture(canvas);
  configureSheet(sharedShadowTexture, "overworld-shared-shadow");
  return sharedShadowTexture;
};

export const createNpcSprite = (role = "story") => {
  const texture = createSheetInstance(
    "assets/overworld/characters/npcs/npc-sheet.png",
    `overworld-npc-${role}`
  );
  const row = NPC_ROWS_BY_ROLE[role] ?? NPC_ROWS_BY_ROLE.story;
  configureAtlasFrame(texture, { columns: NPC_COLUMNS, rows: NPC_ROWS, column: 0, row });
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = `OverworldNpcSprite-${role}`;
  sprite.center.set(0.5, 0.055);
  sprite.scale.set(2.35, 2.95, 1);
  sprite.frustumCulled = true;
  let lastColumn = -1;
  sprite.userData.updateFrame = (elapsed, worldZ = 0) => {
    const column = Math.floor(elapsed * 2.5) % NPC_COLUMNS;
    if (column !== lastColumn) {
      configureAtlasFrame(texture, { columns: NPC_COLUMNS, rows: NPC_ROWS, column, row });
      lastColumn = column;
    }
    sprite.renderOrder = depthOrderForZ(worldZ, 18);
  };
  return { sprite, material, texture };
};

export const createGroundShadow = ({ width = 1.8, depth = 0.72, opacity = 0.34 } = {}) => {
  const material = new THREE.MeshBasicMaterial({
    map: getPixelShadowTexture(),
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    depthTest: false,
    opacity,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = depthOrderForZ(-40, -200);
  mesh.frustumCulled = true;
  return { mesh, material };
};

export const disposeSpriteFrames = () => {
  sharedShadowTexture?.dispose?.();
  sharedShadowTexture = null;
};
