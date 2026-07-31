import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const HERO_COLUMNS = 11;
const HERO_ROWS = 8;
const NPC_COLUMNS = 4;
const NPC_ROWS = 12;
const textureLoader = new THREE.TextureLoader();
const sheetBaseCache = new Map();
let sharedShadowTexture = null;

const DIRECTIONS = Object.freeze([
  "front",
  "front-right",
  "right",
  "back-right",
  "back",
  "back-left",
  "left",
  "front-left"
]);

const NPC_ROWS_BY_ROLE = Object.freeze({
  story: 0,
  resident: 4,
  researcher: 8,
  merchant: 0
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

const getSheetBase = (url) => {
  if (sheetBaseCache.has(url)) return sheetBaseCache.get(url);
  const texture = configureSheet(textureLoader.load(url), `base:${url}`);
  sheetBaseCache.set(url, texture);
  return texture;
};

const createSheetInstance = (url, name) => {
  const texture = getSheetBase(url).clone();
  configureSheet(texture, name);
  return texture;
};

const directionFromVelocity = (velocity, fallback = "front") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const angle = Math.atan2(velocity.x, velocity.z);
  const index = Math.round(angle / (Math.PI / 4));
  return DIRECTIONS[(index + 8) % 8];
};

const setHeroFrame = (texture, direction, column) => {
  configureAtlasFrame(texture, {
    columns: HERO_COLUMNS,
    rows: HERO_ROWS,
    column,
    row: Math.max(0, DIRECTIONS.indexOf(direction))
  });
};

const getPixelShadowTexture = () => {
  if (sharedShadowTexture) return sharedShadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 16;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 32, 16);
  context.fillStyle = "rgba(5, 17, 16, .14)";
  context.fillRect(3, 6, 26, 5);
  context.fillStyle = "rgba(5, 17, 16, .25)";
  context.fillRect(7, 4, 18, 9);
  context.fillStyle = "rgba(5, 17, 16, .38)";
  context.fillRect(11, 5, 10, 7);
  sharedShadowTexture = new THREE.CanvasTexture(canvas);
  sharedShadowTexture.name = "overworld-shared-shadow";
  sharedShadowTexture.colorSpace = THREE.SRGBColorSpace;
  sharedShadowTexture.magFilter = THREE.NearestFilter;
  sharedShadowTexture.minFilter = THREE.NearestFilter;
  sharedShadowTexture.generateMipmaps = false;
  sharedShadowTexture.needsUpdate = true;
  return sharedShadowTexture;
};

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    this.variant = String(characterImage).includes("female") ? "female" : "male";
    this.direction = "front";
    this.texture = createSheetInstance(
      `assets/overworld/characters/hero-${this.variant}/hero-${this.variant}-sheet.png`,
      `overworld-hero-${this.variant}`
    );
    setHeroFrame(this.texture, this.direction, 0);

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.08,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.name = `OverworldHeroSprite-${this.variant}`;
    this.sprite.center.set(0.5, 0.055);
    this.sprite.scale.set(2.5, 3.12, 1);
    this.sprite.frustumCulled = true;

    this.root = new THREE.Group();
    this.root.name = `OverworldDirectionalPlayer-${this.variant}`;
    this.root.add(this.sprite);
    this.lastFrameKey = "";
  }

  update({ state, velocity, elapsed }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    let column = Math.floor(elapsed * 2.2) % 3;
    if (state === "walking") column = 3 + (Math.floor(elapsed * 8) % 4);
    if (state === "running") column = 7 + (Math.floor(elapsed * 12) % 4);
    const frameKey = `${this.direction}:${column}`;
    if (frameKey !== this.lastFrameKey) {
      setHeroFrame(this.texture, this.direction, column);
      this.lastFrameKey = frameKey;
    }
    const worldZ = this.root.parent?.position?.z ?? 0;
    this.sprite.renderOrder = depthOrderForZ(worldZ, 20);
    this.sprite.position.y = state === "idle"
      ? Math.round(Math.sin(elapsed * 2.2) * 2) / 96
      : 0;
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}

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
  sheetBaseCache.forEach((texture) => texture.dispose());
  sheetBaseCache.clear();
};
