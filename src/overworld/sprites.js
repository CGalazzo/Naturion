import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const HERO_COLUMNS = 11;
const HERO_ROWS = 8;
const HERO_CANVAS_WIDTH = 96;
const HERO_CANVAS_HEIGHT = 160;
const HERO_WORLD_WIDTH = 1.55;
const HERO_WORLD_HEIGHT = 3.28;
const NPC_COLUMNS = 4;
const NPC_ROWS = 12;
const textureLoader = new THREE.TextureLoader();
const sheetBaseCache = new Map();
const imagePromiseCache = new Map();
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

const loadImage = (url) => {
  if (imagePromiseCache.has(url)) return imagePromiseCache.get(url);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Não foi possível carregar ${url}.`));
    image.src = url;
  });
  imagePromiseCache.set(url, promise);
  return promise;
};

const directionFromVelocity = (velocity, fallback = "front") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const angle = Math.atan2(velocity.x, velocity.z);
  const index = Math.round(angle / (Math.PI / 4));
  return DIRECTIONS[(index + 8) % 8];
};

const getOpaqueBounds = (image) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[((y * canvas.width) + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  }

  const paddingX = Math.max(1, Math.round((maxX - minX + 1) * 0.025));
  const paddingY = Math.max(1, Math.round((maxY - minY + 1) * 0.015));
  const x = Math.max(0, minX - paddingX);
  const y = Math.max(0, minY - paddingY);
  return {
    x,
    y,
    width: Math.min(canvas.width - x, maxX - minX + 1 + paddingX * 2),
    height: Math.min(canvas.height - y, maxY - minY + 1 + paddingY * 2)
  };
};

const drawContained = (context, image, source, { bottomPadding = 2 } = {}) => {
  const availableWidth = HERO_CANVAS_WIDTH - 8;
  const availableHeight = HERO_CANVAS_HEIGHT - 4 - bottomPadding;
  const scale = Math.min(availableWidth / source.width, availableHeight / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const x = Math.round((HERO_CANVAS_WIDTH - width) / 2);
  const y = HERO_CANVAS_HEIGHT - height - bottomPadding;
  context.clearRect(0, 0, HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    x,
    y,
    width,
    height
  );
};

const createSelectionHeroTexture = ({ characterImage, variant }) => {
  const canvas = document.createElement("canvas");
  canvas.width = HERO_CANVAS_WIDTH;
  canvas.height = HERO_CANVAS_HEIGHT;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;

  const texture = new THREE.CanvasTexture(canvas);
  configureSheet(texture, `overworld-selection-hero-${variant}`);
  texture.userData.selectionReady = false;

  const fallbackUrl = `assets/overworld/characters/hero-${variant}/hero-${variant}-sheet.png`;
  loadImage(fallbackUrl).then((image) => {
    if (texture.userData.selectionReady) return;
    const frameWidth = Math.floor(image.width / HERO_COLUMNS);
    const frameHeight = Math.floor(image.height / HERO_ROWS);
    drawContained(context, image, {
      x: 0,
      y: 0,
      width: frameWidth,
      height: frameHeight
    }, { bottomPadding: 4 });
    texture.needsUpdate = true;
  }).catch((error) => console.warn("[Naturion Overworld] Falha no sprite de segurança.", error));

  loadImage(characterImage).then((image) => {
    const bounds = getOpaqueBounds(image);
    drawContained(context, image, bounds, { bottomPadding: 1 });
    texture.userData.selectionReady = true;
    texture.needsUpdate = true;
  }).catch((error) => console.error("[Naturion Overworld] Falha ao carregar o protagonista original da seleção.", error));

  return texture;
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
    this.texture = createSelectionHeroTexture({ characterImage, variant: this.variant });

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.035,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.name = `OverworldHeroSelectionSprite-${this.variant}`;
    this.sprite.center.set(0.5, 0.025);
    this.sprite.scale.set(HERO_WORLD_WIDTH, HERO_WORLD_HEIGHT, 1);
    this.sprite.frustumCulled = true;

    this.root = new THREE.Group();
    this.root.name = `OverworldSelectionPlayer-${this.variant}`;
    this.root.add(this.sprite);
  }

  update({ state, velocity, elapsed }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    const moving = state !== "idle";
    const frequency = state === "running" ? 12 : state === "walking" ? 8 : 2.2;
    const phase = Math.sin(elapsed * frequency);
    const bob = state === "running"
      ? Math.abs(phase) * 0.075
      : state === "walking"
        ? Math.abs(phase) * 0.045
        : phase * 0.012;
    const squash = moving ? Math.abs(phase) * 0.018 : 0;
    const facingLeft = this.direction.includes("left");
    const signedWidth = HERO_WORLD_WIDTH * (facingLeft ? -1 : 1) * (1 + squash * 0.45);

    this.sprite.scale.set(signedWidth, HERO_WORLD_HEIGHT * (1 - squash), 1);
    this.sprite.position.y = Math.round(bob * 64) / 64;
    const worldZ = this.root.parent?.position?.z ?? 0;
    this.sprite.renderOrder = depthOrderForZ(worldZ, 20);
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
  imagePromiseCache.clear();
};
