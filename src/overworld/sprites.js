import { THREE } from "./engine.js";
import { configureAtlasFrame, loadPixelTexture } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const HERO_COLUMNS = 11;
const HERO_ROWS = 8;
const NPC_COLUMNS = 4;
const NPC_ROWS = 3;

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
  resident: 1,
  researcher: 2,
  merchant: 1
});

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

const sharedShadowTexture = () => loadPixelTexture(
  "visual-reset-contact-shadow-shared",
  "assets/overworld/visual-reset/validation/contact-shadow.png"
);

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    this.variant = String(characterImage).includes("female") ? "female" : "male";
    this.direction = "front";
    const source = `assets/overworld/visual-reset/validation/hero-${this.variant}.png`;
    const baseTexture = loadPixelTexture(`visual-reset-hero-${this.variant}`, source);
    this.texture = baseTexture.clone();
    this.texture.name = `visual-reset-hero-${this.variant}-instance`;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    setHeroFrame(this.texture, this.direction, 0);

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.06,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.name = `OverworldHeroSprite-${this.variant}`;
    this.sprite.center.set(0.5, 0.055);
    this.sprite.scale.set(2.62, 3.28, 1);

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
  const baseTexture = loadPixelTexture(
    "visual-reset-npc-atlas",
    "assets/overworld/visual-reset/validation/npc-atlas.png"
  );
  const texture = baseTexture.clone();
  texture.name = `visual-reset-npc-${role}`;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const row = NPC_ROWS_BY_ROLE[role] ?? NPC_ROWS_BY_ROLE.story;
  configureAtlasFrame(texture, { columns: NPC_COLUMNS, rows: NPC_ROWS, column: 0, row });
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.06,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = `OverworldNpcSprite-${role}`;
  sprite.center.set(0.5, 0.055);
  sprite.scale.set(2.42, 3.05, 1);
  let lastColumn = -1;
  sprite.userData.updateFrame = (elapsed, worldZ = 0) => {
    const column = Math.floor(elapsed * 2.5) % NPC_COLUMNS;
    if (column !== lastColumn) {
      configureAtlasFrame(texture, { columns: NPC_COLUMNS, rows: NPC_ROWS, column, row });
      lastColumn = column;
    }
    sprite.renderOrder = depthOrderForZ(worldZ, 18);
  };
  sprite.userData.ownedTexture = texture;
  return { sprite, material };
};

export const createGroundShadow = ({ width = 1.8, depth = 0.72, opacity = 0.34 } = {}) => {
  const material = new THREE.MeshBasicMaterial({
    map: sharedShadowTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = depthOrderForZ(-40, -200);
  return { mesh, material };
};

export const disposeSpriteFrames = () => {};
