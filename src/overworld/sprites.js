import { THREE } from "./engine.js";
import { configureAtlasFrame } from "./textures.js";
import { depthOrderForZ } from "./depth.js";

const NPC_COLUMNS = 4;
const NPC_ROWS = 12;
const textureLoader = new THREE.TextureLoader();
const sheetBaseCache = new Map();
let sharedShadowTexture = null;

const DIRECTIONS = Object.freeze([
  "front", "front-right", "right", "back-right",
  "back", "back-left", "left", "front-left"
]);
const DIRECTION_ANGLE = Object.freeze({
  front: 0,
  "front-right": Math.PI / 4,
  right: Math.PI / 2,
  "back-right": Math.PI * 0.75,
  back: Math.PI,
  "back-left": -Math.PI * 0.75,
  left: -Math.PI / 2,
  "front-left": -Math.PI / 4
});
const NPC_ROWS_BY_ROLE = Object.freeze({ story: 0, resident: 4, researcher: 8, merchant: 0 });

const HERO_PALETTES = Object.freeze({
  male: Object.freeze({
    skin: 0xd7a178, skinLight: 0xf0c092, skinShadow: 0xa86f55,
    hair: 0x352018, hairLight: 0x68402a,
    shirt: 0xd0b07a, shirtShadow: 0x8d7049,
    vest: 0x356c4a, vestLight: 0x5d9361,
    pants: 0x293b46, pantsLight: 0x425a62,
    boot: 0x34271f, bootLight: 0x6b4a2e,
    pack: 0x315f43, packLight: 0x57865b,
    leather: 0x7a4f2c, accent: 0xd6a955, eye: 0x132027
  }),
  female: Object.freeze({
    skin: 0xe2ac82, skinLight: 0xf8caa0, skinShadow: 0xb67c60,
    hair: 0x41241f, hairLight: 0x74402f,
    shirt: 0xe0c99b, shirtShadow: 0xa18358,
    vest: 0x426f3d, vestLight: 0x719553,
    pants: 0x3b342d, pantsLight: 0x5e5143,
    boot: 0x392820, bootLight: 0x704d31,
    pack: 0x496b3f, packLight: 0x78935b,
    leather: 0x855331, accent: 0xd8ad58, eye: 0x17212a
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

const getSheetBase = (url) => {
  if (sheetBaseCache.has(url)) return sheetBaseCache.get(url);
  const texture = configureSheet(textureLoader.load(url), `base:${url}`);
  sheetBaseCache.set(url, texture);
  return texture;
};
const createSheetInstance = (url, name) => configureSheet(getSheetBase(url).clone(), name);

const directionFromVelocity = (velocity, fallback = "front") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const index = Math.round(Math.atan2(velocity.x, velocity.z) / (Math.PI / 4));
  return DIRECTIONS[(index + 8) % 8];
};

const colorMaterial = (color, emissive = 0x000000, emissiveIntensity = 0) => {
  const material = new THREE.MeshLambertMaterial({
    color, emissive, emissiveIntensity, flatShading: true
  });
  material.toneMapped = false;
  return material;
};

const createMesh = ({ geometry, material, name, position, rotation, scale }) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  if (position) mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  return mesh;
};
const addMesh = (parent, options) => {
  const mesh = createMesh(options);
  parent.add(mesh);
  return mesh;
};

const makeArm = ({ side, materials, geometries }) => {
  const shoulder = new THREE.Group();
  shoulder.name = `${side}-shoulder`;
  shoulder.position.set(side === "left" ? -0.47 : 0.47, 1.88, 0);
  const upper = addMesh(shoulder, {
    geometry: geometries.upperArm, material: materials.shirt,
    name: `${side}-upper-arm`, position: [0, -0.28, 0]
  });
  const highlight = addMesh(upper, {
    geometry: geometries.sleeveHighlight, material: materials.shirtLight,
    name: `${side}-sleeve-highlight`,
    position: [side === "left" ? -0.055 : 0.055, 0.07, 0.07]
  });
  highlight.rotation.z = side === "left" ? 0.06 : -0.06;
  const elbow = new THREE.Group();
  elbow.name = `${side}-elbow`;
  elbow.position.y = -0.53;
  shoulder.add(elbow);
  addMesh(elbow, {
    geometry: geometries.forearm, material: materials.skin,
    name: `${side}-forearm`, position: [0, -0.21, 0]
  });
  addMesh(elbow, {
    geometry: geometries.hand, material: materials.skinLight,
    name: `${side}-hand`, position: [0, -0.47, 0.025]
  });
  return { shoulder, elbow };
};

const makeLeg = ({ side, materials, geometries }) => {
  const hip = new THREE.Group();
  hip.name = `${side}-hip`;
  hip.position.set(side === "left" ? -0.19 : 0.19, 1.05, 0);
  addMesh(hip, {
    geometry: geometries.thigh, material: materials.pants,
    name: `${side}-thigh`, position: [0, -0.25, 0]
  });
  const knee = new THREE.Group();
  knee.name = `${side}-knee`;
  knee.position.y = -0.48;
  hip.add(knee);
  addMesh(knee, {
    geometry: geometries.shin, material: materials.pantsLight,
    name: `${side}-shin`, position: [0, -0.23, 0]
  });
  addMesh(knee, {
    geometry: geometries.boot, material: materials.boot,
    name: `${side}-boot`, position: [0, -0.52, 0.095]
  });
  addMesh(knee, {
    geometry: geometries.bootToe, material: materials.bootLight,
    name: `${side}-boot-toe`, position: [0, -0.52, 0.25]
  });
  return { hip, knee };
};

const createHeroModel = (variant) => {
  const palette = HERO_PALETTES[variant];
  const materials = {
    skin: colorMaterial(palette.skin),
    skinLight: colorMaterial(palette.skinLight),
    skinShadow: colorMaterial(palette.skinShadow),
    hair: colorMaterial(palette.hair),
    hairLight: colorMaterial(palette.hairLight),
    shirt: colorMaterial(palette.shirt),
    shirtLight: colorMaterial(palette.shirtShadow),
    vest: colorMaterial(palette.vest),
    vestLight: colorMaterial(palette.vestLight),
    pants: colorMaterial(palette.pants),
    pantsLight: colorMaterial(palette.pantsLight),
    boot: colorMaterial(palette.boot),
    bootLight: colorMaterial(palette.bootLight),
    pack: colorMaterial(palette.pack),
    packLight: colorMaterial(palette.packLight),
    leather: colorMaterial(palette.leather),
    accent: colorMaterial(palette.accent, 0x271800, 0.05),
    eyeWhite: colorMaterial(0xfff1d4),
    eye: colorMaterial(palette.eye)
  };
  const geometries = {
    torso: new THREE.BoxGeometry(0.64, 1.12, 0.54),
    chestPanel: new THREE.BoxGeometry(0.46, 0.56, 0.09),
    belt: new THREE.BoxGeometry(0.69, 0.12, 0.48),
    buckle: new THREE.BoxGeometry(0.12, 0.1, 0.055),
    head: new THREE.BoxGeometry(0.78, 0.82, 0.70),
    cheek: new THREE.BoxGeometry(0.48, 0.17, 0.055),
    ear: new THREE.BoxGeometry(0.13, 0.18, 0.13),
    eyeWhite: new THREE.BoxGeometry(0.14, 0.14, 0.045),
    eye: new THREE.BoxGeometry(0.055, 0.085, 0.04),
    eyebrow: new THREE.BoxGeometry(0.11, 0.035, 0.035),
    nose: new THREE.BoxGeometry(0.07, 0.07, 0.06),
    mouth: new THREE.BoxGeometry(0.13, 0.025, 0.045),
    hairCap: new THREE.BoxGeometry(0.84, 0.40, 0.74),
    hairSpike: new THREE.BoxGeometry(0.18, 0.38, 0.18),
    hairLock: new THREE.BoxGeometry(0.15, 0.31, 0.17),
    backpack: new THREE.BoxGeometry(0.62, 0.70, 0.28),
    backpackPocket: new THREE.BoxGeometry(0.43, 0.27, 0.11),
    backpackFlap: new THREE.BoxGeometry(0.50, 0.15, 0.10),
    strap: new THREE.BoxGeometry(0.095, 0.67, 0.07),
    upperArm: new THREE.BoxGeometry(0.25, 0.56, 0.26),
    sleeveHighlight: new THREE.BoxGeometry(0.08, 0.24, 0.07),
    forearm: new THREE.BoxGeometry(0.21, 0.43, 0.22),
    hand: new THREE.BoxGeometry(0.22, 0.24, 0.22),
    thigh: new THREE.BoxGeometry(0.29, 0.51, 0.31),
    shin: new THREE.BoxGeometry(0.27, 0.47, 0.29),
    boot: new THREE.BoxGeometry(0.29, 0.23, 0.42),
    bootToe: new THREE.BoxGeometry(0.25, 0.09, 0.18),
    hairTail: new THREE.BoxGeometry(0.20, 0.55, 0.20),
    accessory: new THREE.OctahedronGeometry(0.105, 0),
    neckOutline: new THREE.BoxGeometry(0.66, 0.06, 0.50)
  };

  const root = new THREE.Group();
  root.name = `OverworldReferenceHero-${variant}`;
  const model = new THREE.Group();
  model.name = "HeroAnimatedModel";
  model.position.y = 0.02;
  root.add(model);

  const torso = addMesh(model, {
    geometry: geometries.torso, material: materials.vest,
    name: "hero-torso", position: [0, 1.55, 0], scale: [1.08, 1, 0.88]
  });
  addMesh(model, {
    geometry: geometries.chestPanel, material: materials.shirt,
    name: "hero-shirt-front", position: [0, 1.56, 0.285]
  });
  addMesh(model, {
    geometry: geometries.chestPanel, material: materials.vestLight,
    name: "hero-vest-highlight", position: [-0.22, 1.58, 0.302], scale: [0.23, 0.84, 1]
  });
  addMesh(model, {
    geometry: geometries.belt, material: materials.leather,
    name: "hero-belt", position: [0, 1.13, 0]
  });
  addMesh(model, {
    geometry: geometries.buckle, material: materials.accent,
    name: "hero-buckle", position: [0, 1.13, 0.266]
  });

  const headPivot = new THREE.Group();
  headPivot.name = "hero-head-pivot";
  headPivot.position.set(0, 2.38, 0);
  model.add(headPivot);
  addMesh(headPivot, {
    geometry: geometries.head, material: materials.skin,
    name: "hero-head", scale: [0.94, 1.05, 0.92]
  });
  addMesh(headPivot, {
    geometry: geometries.cheek, material: materials.skinLight,
    name: "hero-face-light", position: [0, -0.055, 0.388]
  });
  addMesh(headPivot, {
    geometry: geometries.ear, material: materials.skinShadow,
    name: "hero-ear-left", position: [-0.405, -0.01, 0]
  });
  addMesh(headPivot, {
    geometry: geometries.ear, material: materials.skinShadow,
    name: "hero-ear-right", position: [0.405, -0.01, 0]
  });
  [-0.145, 0.145].forEach((x, index) => {
    addMesh(headPivot, {
      geometry: geometries.eyeWhite, material: materials.eyeWhite,
      name: `hero-eye-white-${index}`, position: [x, -0.015, 0.414]
    });
    addMesh(headPivot, {
      geometry: geometries.eye, material: materials.eye,
      name: `hero-eye-${index}`, position: [x, -0.02, 0.444]
    });
    addMesh(headPivot, {
      geometry: geometries.eyebrow, material: materials.hair,
      name: `hero-eyebrow-${index}`, position: [x, 0.105, 0.407],
      rotation: [0, 0, index === 0 ? -0.08 : 0.08]
    });
  });
  addMesh(headPivot, {
    geometry: geometries.nose, material: materials.skinShadow,
    name: "hero-nose", position: [0, -0.09, 0.422]
  });
  addMesh(headPivot, {
    geometry: geometries.mouth, material: materials.leather,
    name: "hero-mouth", position: [0, -0.21, 0.42]
  });
  addMesh(headPivot, {
    geometry: geometries.hairCap, material: materials.hair,
    name: "hero-hair-cap", position: [0, 0.285, -0.12], scale: [1.04, 0.62, 0.90]
  });

  const spikeData = variant === "female"
    ? [[-0.31, 0.42, 0.05, -0.15], [-0.08, 0.49, 0.02, -0.04], [0.17, 0.47, 0.03, 0.08], [0.34, 0.36, -0.02, 0.18]]
    : [[-0.34, 0.43, 0.08, -0.24], [-0.17, 0.54, 0, -0.13], [0.02, 0.58, -0.02, 0.02], [0.22, 0.53, 0.01, 0.16], [0.38, 0.39, 0.04, 0.27]];
  spikeData.forEach(([x, y, z, rotationZ], index) => {
    addMesh(headPivot, {
      geometry: index % 2 ? geometries.hairLock : geometries.hairSpike,
      material: index === 2 ? materials.hairLight : materials.hair,
      name: `hero-hair-spike-${index}`, position: [x, y, z],
      rotation: [index % 2 ? -0.08 : 0.06, 0, rotationZ]
    });
  });
  if (variant === "female") {
    addMesh(headPivot, {
      geometry: geometries.hairTail, material: materials.hair,
      name: "hero-hair-tail-left", position: [-0.34, -0.20, -0.20], rotation: [0.18, 0, 0.10]
    });
    addMesh(headPivot, {
      geometry: geometries.hairTail, material: materials.hair,
      name: "hero-hair-tail-right", position: [0.34, -0.20, -0.20], rotation: [0.18, 0, -0.10]
    });
    addMesh(headPivot, {
      geometry: geometries.accessory, material: materials.accent,
      name: "hero-hair-accessory", position: [0.39, 0.30, 0.20]
    });
  }

  const backpackPivot = new THREE.Group();
  backpackPivot.name = "hero-backpack-pivot";
  backpackPivot.position.set(0, 1.58, -0.34);
  model.add(backpackPivot);
  addMesh(backpackPivot, {
    geometry: geometries.backpack, material: materials.pack, name: "hero-backpack"
  });
  addMesh(backpackPivot, {
    geometry: geometries.backpackFlap, material: materials.packLight,
    name: "hero-backpack-flap", position: [0, 0.22, -0.17]
  });
  addMesh(backpackPivot, {
    geometry: geometries.backpackPocket, material: materials.leather,
    name: "hero-backpack-pocket", position: [0, -0.18, -0.19]
  });
  addMesh(model, {
    geometry: geometries.strap, material: materials.leather,
    name: "hero-strap-left", position: [-0.25, 1.58, 0.29], rotation: [0, 0, -0.10]
  });
  addMesh(model, {
    geometry: geometries.strap, material: materials.leather,
    name: "hero-strap-right", position: [0.25, 1.58, 0.29], rotation: [0, 0, 0.10]
  });

  const leftArm = makeArm({ side: "left", materials, geometries });
  const rightArm = makeArm({ side: "right", materials, geometries });
  model.add(leftArm.shoulder, rightArm.shoulder);
  const leftLeg = makeLeg({ side: "left", materials, geometries });
  const rightLeg = makeLeg({ side: "right", materials, geometries });
  model.add(leftLeg.hip, rightLeg.hip);
  const neckOutline = addMesh(model, {
    geometry: geometries.neckOutline, material: materials.leather,
    name: "hero-neck-outline", position: [0, 2.02, 0], rotation: [Math.PI / 2, 0, 0]
  });
  neckOutline.scale.z = 0.75;

  return { root, model, torso, headPivot, backpackPivot, leftArm, rightArm, leftLeg, rightLeg };
};

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    this.variant = String(characterImage).includes("female") ? "female" : "male";
    this.direction = "front";
    this.parts = createHeroModel(this.variant);
    this.root = this.parts.root;
    this.root.scale.setScalar(1.24);
    this.renderables = [];
    this.root.traverse((object) => {
      if (object.isMesh) this.renderables.push(object);
    });
  }

  update({ state, velocity, elapsed, worldZ = 0 }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    const targetRotation = DIRECTION_ANGLE[this.direction] ?? 0;
    let difference = targetRotation - this.root.rotation.y;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    this.root.rotation.y += difference * 0.42;

    const walking = state === "walking";
    const running = state === "running";
    const moving = walking || running;
    const frequency = running ? 12 : walking ? 8 : 2.2;
    const phase = Math.sin(elapsed * frequency);
    const opposite = Math.sin(elapsed * frequency + Math.PI);
    const armAmplitude = running ? 0.86 : walking ? 0.56 : 0.035;
    const legAmplitude = running ? 0.78 : walking ? 0.53 : 0;
    const bob = moving
      ? Math.abs(phase) * (running ? 0.095 : 0.052)
      : Math.sin(elapsed * 2.2) * 0.014;

    this.parts.leftArm.shoulder.rotation.x = phase * armAmplitude;
    this.parts.rightArm.shoulder.rotation.x = opposite * armAmplitude;
    this.parts.leftArm.elbow.rotation.x = moving ? Math.max(0, -phase) * (running ? 0.48 : 0.24) : 0.04;
    this.parts.rightArm.elbow.rotation.x = moving ? Math.max(0, -opposite) * (running ? 0.48 : 0.24) : 0.04;
    this.parts.leftLeg.hip.rotation.x = opposite * legAmplitude;
    this.parts.rightLeg.hip.rotation.x = phase * legAmplitude;
    this.parts.leftLeg.knee.rotation.x = moving ? Math.max(0, phase) * (running ? 0.70 : 0.38) : 0;
    this.parts.rightLeg.knee.rotation.x = moving ? Math.max(0, opposite) * (running ? 0.70 : 0.38) : 0;
    this.parts.model.position.y = 0.02 + bob;
    this.parts.model.rotation.x = running ? 0.075 : walking ? 0.025 : 0;
    this.parts.torso.rotation.z = moving ? phase * (running ? 0.035 : 0.018) : 0;
    this.parts.headPivot.rotation.z = -this.parts.torso.rotation.z * 0.6;
    this.parts.headPivot.rotation.y = moving ? phase * 0.025 : Math.sin(elapsed * 1.3) * 0.025;
    this.parts.backpackPivot.rotation.x = running
      ? -0.08 + Math.abs(phase) * 0.055
      : walking ? -0.025 + Math.abs(phase) * 0.025 : 0;
    const renderOrder = depthOrderForZ(worldZ, 18);
    this.renderables.forEach((mesh) => { mesh.renderOrder = renderOrder; });
  }

  dispose() {
    const disposedGeometry = new Set();
    const disposedMaterial = new Set();
    this.root.traverse((object) => {
      if (object.geometry && !disposedGeometry.has(object.geometry)) {
        object.geometry.dispose?.();
        disposedGeometry.add(object.geometry);
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        if (disposedMaterial.has(material)) return;
        material.dispose?.();
        disposedMaterial.add(material);
      });
    });
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
    map: texture, transparent: true, alphaTest: 0.08,
    depthTest: false, depthWrite: false, toneMapped: false
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
    map: getPixelShadowTexture(), transparent: true, alphaTest: 0.02,
    depthWrite: false, depthTest: false, opacity, toneMapped: false
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
