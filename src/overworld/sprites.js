import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const NPC_COLUMNS = 4;
const NPC_ROWS = 12;
const textureLoader = new THREE.TextureLoader();
let sharedShadowTexture = null;

const DIRECTIONS = Object.freeze([
  "front", "front-right", "right", "back-right",
  "back", "back-left", "left", "front-left"
]);
// Os atlas aprovados masculino e feminino foram exportados com ordens
// horizontais opostas. Cada variante precisa do próprio mapeamento para que
// ambos olhem para o lado real do deslocamento.
const DIRECTION_COLUMNS = Object.freeze({
  male: Object.freeze({
    front: 0,
    "front-right": 7,
    right: 6,
    "back-right": 5,
    back: 4,
    "back-left": 3,
    left: 2,
    "front-left": 1
  }),
  female: Object.freeze(Object.fromEntries(
    DIRECTIONS.map((direction, index) => [direction, index])
  ))
});
const WALK_CYCLE = Object.freeze([0, 1, 0, 2]);
const HERO_HEIGHT = 3.25;
const NPC_ROWS_BY_ROLE = Object.freeze({ story: 0, resident: 4, researcher: 8, merchant: 0 });
const HERO_SHEETS = Object.freeze({
  male: Object.freeze({
    url: "assets/overworld/characters/hero-male/hero-male-overworld.webp?v=3",
    frameAspect: 209 / 314,
    width: 1672,
    height: 942,
    frameWidth: 209,
    frameHeight: 314,
    cropTop: Object.freeze([0, 24, 0]),
    footY: Object.freeze([
      Object.freeze([289, 289, 289, 287, 289, 289, 288, 289]),
      Object.freeze([309, 309, 308, 306, 308, 308, 308, 309]),
      Object.freeze([267, 267, 265, 261, 265, 263, 263, 265])
    ])
  }),
  female: Object.freeze({
    url: "assets/overworld/characters/hero-female/hero-female-overworld.webp?v=3",
    frameAspect: 222 / 296,
    width: 1776,
    height: 888,
    frameWidth: 222,
    frameHeight: 296,
    cropTop: Object.freeze([0, 0, 0]),
    footY: Object.freeze([
      Object.freeze([278, 278, 280, 275, 278, 276, 280, 281]),
      Object.freeze([265, 263, 264, 263, 264, 264, 264, 266]),
      Object.freeze([262, 260, 263, 262, 263, 262, 262, 263])
    ])
  })
});

const configureHeroFrame = (texture, sheet, column, row) => {
  // A primeira linha de caminhada masculina contém 24 px residuais dos pés
  // da linha anterior. O recorte por linha remove esse resíduo, enquanto o
  // pequeno recuo nas bordas impede vazamento entre quadros do atlas.
  const inset = 1;
  const topCrop = sheet.cropTop[row] || 0;
  texture.repeat.set(
    (sheet.frameWidth - inset * 2) / sheet.width,
    (sheet.frameHeight - topCrop - inset * 2) / sheet.height
  );
  texture.offset.set(
    (column * sheet.frameWidth + inset) / sheet.width,
    1 - (((row + 1) * sheet.frameHeight) / sheet.height) + inset / sheet.height
  );
  texture.updateMatrix();
  texture.needsUpdate = true;
};

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
    this.animationTime = 0;
    const sheet = HERO_SHEETS[this.variant];
    this.sheet = sheet;
    this.directionColumns = DIRECTION_COLUMNS[this.variant];
    this.texture = createSheetInstance(sheet.url, `overworld-hero-${this.variant}`);
    configureHeroFrame(this.texture, sheet, this.directionColumns[this.direction], 0);
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
    this.sprite.scale.set(HERO_HEIGHT * sheet.frameAspect, HERO_HEIGHT, 1);
    this.sprite.frustumCulled = false;
    this.root = new THREE.Group();
    this.root.name = `OverworldApprovedHeroRig-${this.variant}`;
    this.root.add(this.sprite);
  }

  update({ state, velocity, delta = 0, worldZ = 0 }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    const walking = state === "walking";
    const running = state === "running";
    const moving = walking || running;
    if (moving) this.animationTime += delta * (running ? 11 : 8);
    else this.animationTime = 0;
    const row = moving
      ? WALK_CYCLE[Math.floor(this.animationTime) % WALK_CYCLE.length]
      : 0;
    const column = this.directionColumns[this.direction] ?? 0;
    const frameKey = `${column}:${row}`;
    if (frameKey !== this.lastFrameKey) {
      configureHeroFrame(this.texture, this.sheet, column, row);
      const idleFootY = this.sheet.footY[0][column];
      const frameFootY = this.sheet.footY[row][column];
      const baseHeight = HERO_HEIGHT;
      const topCrop = this.sheet.cropTop[row] || 0;
      const frameHeight = baseHeight * ((this.sheet.frameHeight - topCrop) / this.sheet.frameHeight);
      this.sprite.scale.set(baseHeight * this.sheet.frameAspect, frameHeight, 1);
      this.sprite.position.y = ((frameFootY - idleFootY) / this.sheet.frameHeight) * baseHeight
        + this.sprite.center.y * (frameHeight - baseHeight);
      this.lastFrameKey = frameKey;
    }

    // Os pés já são alinhados quadro a quadro; não adicionar balanço vertical,
    // alongamento ou rotação que façam a caminhada parecer um salto.
    this.root.position.y = 0;
    this.root.scale.set(1, 1, 1);
    this.material.rotation = 0;
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
