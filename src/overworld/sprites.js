import { THREE } from "./engine.js";

const sharedTextures = new Map();

const createCanvasTexture = (key, width, height, painter) => {
  if (sharedTextures.has(key)) return sharedTextures.get(key);
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
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  sharedTextures.set(key, texture);
  return texture;
};

const fill = (context, color, x, y, width, height) => {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
};

const colorMaterial = (color, { emissive = 0x000000, emissiveIntensity = 0 } = {}) => new THREE.MeshLambertMaterial({
  color,
  emissive,
  emissiveIntensity,
  flatShading: true
});

const boxMesh = (width, height, depth, material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const addBox = ({ parent, material, width, height, depth, x = 0, y = 0, z = 0, castShadow = true, receiveShadow = true, name = "" }) => {
  const mesh = boxMesh(width, height, depth, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
};

const directionFromVelocity = (velocity, fallback = "front") => {
  if (Math.hypot(velocity.x, velocity.z) < 0.05) return fallback;
  const angle = Math.atan2(velocity.x, velocity.z);
  const index = Math.round(angle / (Math.PI / 4));
  const normalized = (index + 8) % 8;
  return ["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"][normalized];
};

const directionAngle = {
  front: 0,
  "front-right": Math.PI / 4,
  right: Math.PI / 2,
  "back-right": Math.PI * .75,
  back: Math.PI,
  "back-left": -Math.PI * .75,
  left: -Math.PI / 2,
  "front-left": -Math.PI / 4
};

const HERO_PALETTES = {
  male: {
    skin: 0xd9a77f,
    skinLight: 0xf3c39a,
    hair: 0x3b2e28,
    hairLight: 0x6b4b37,
    shirt: 0x3d8b55,
    shirtLight: 0x69bb68,
    pants: 0x32465f,
    boot: 0x382e2a,
    pack: 0x845635,
    accent: 0xe3c95f
  },
  female: {
    skin: 0xe6b58b,
    skinLight: 0xffd0a3,
    hair: 0x5a2f34,
    hairLight: 0x8c4c4e,
    shirt: 0x3f77a5,
    shirtLight: 0x64a9cf,
    pants: 0x273d62,
    boot: 0x392d2a,
    pack: 0x8a5d36,
    accent: 0xf0c868
  }
};

const createLimb = ({ material, width, length, depth, pivotX, pivotY, pivotZ }) => {
  const pivot = new THREE.Group();
  pivot.position.set(pivotX, pivotY, pivotZ);
  const mesh = boxMesh(width, length, depth, material);
  mesh.position.y = -length * .5;
  pivot.add(mesh);
  return { pivot, mesh };
};

const createHeroModel = (variant) => {
  const palette = HERO_PALETTES[variant];
  const materials = {
    skin: colorMaterial(palette.skin),
    skinLight: colorMaterial(palette.skinLight),
    hair: colorMaterial(palette.hair),
    hairLight: colorMaterial(palette.hairLight),
    shirt: colorMaterial(palette.shirt),
    shirtLight: colorMaterial(palette.shirtLight),
    pants: colorMaterial(palette.pants),
    boot: colorMaterial(palette.boot),
    pack: colorMaterial(palette.pack),
    accent: colorMaterial(palette.accent, { emissive: 0x342700, emissiveIntensity: .08 }),
    eye: colorMaterial(0x16232a)
  };

  const root = new THREE.Group();
  root.name = `Overworld3DHero-${variant}`;
  const model = new THREE.Group();
  model.position.y = 0.02;
  root.add(model);

  const torso = addBox({ parent: model, material: materials.shirt, width: .88, height: 1.08, depth: .5, y: 1.55, name: "torso" });
  addBox({ parent: model, material: materials.shirtLight, width: .58, height: .18, depth: .525, y: 1.83, z: .018, name: "shirt-highlight" });
  addBox({ parent: model, material: materials.accent, width: .12, height: .62, depth: .54, y: 1.5, z: .025, name: "shirt-accent" });

  const head = new THREE.Group();
  head.position.y = 2.45;
  model.add(head);
  addBox({ parent: head, material: materials.skin, width: .86, height: .82, depth: .78, name: "head" });
  addBox({ parent: head, material: materials.skinLight, width: .54, height: .2, depth: .805, y: .1, z: .02, name: "face-light" });

  addBox({ parent: head, material: materials.hair, width: .92, height: .28, depth: .84, y: .38, name: "hair-top" });
  addBox({ parent: head, material: materials.hair, width: .18, height: .48, depth: .82, x: -.38, y: .18, name: "hair-left" });
  addBox({ parent: head, material: materials.hair, width: .18, height: .44, depth: .82, x: .38, y: .2, name: "hair-right" });
  addBox({ parent: head, material: materials.hairLight, width: .42, height: .12, depth: .85, x: -.08, y: .39, z: .025, name: "hair-highlight" });

  if (variant === "female") {
    addBox({ parent: head, material: materials.hair, width: .22, height: .82, depth: .26, x: -.36, y: -.25, z: -.28, name: "long-hair-left" });
    addBox({ parent: head, material: materials.hair, width: .22, height: .82, depth: .26, x: .36, y: -.25, z: -.28, name: "long-hair-right" });
    addBox({ parent: head, material: materials.accent, width: .18, height: .12, depth: .12, x: .4, y: .28, z: .4, name: "hair-accessory" });
  } else {
    addBox({ parent: head, material: materials.hair, width: .26, height: .22, depth: .26, x: -.3, y: .5, z: .22, name: "hair-spike-a" });
    addBox({ parent: head, material: materials.hair, width: .24, height: .18, depth: .26, x: .05, y: .51, z: .24, name: "hair-spike-b" });
  }

  [-.18, .18].forEach((eyeX) => addBox({
    parent: head,
    material: materials.eye,
    width: .07,
    height: .09,
    depth: .035,
    x: eyeX,
    y: .02,
    z: .405,
    castShadow: false,
    receiveShadow: false,
    name: "eye"
  }));

  const backpack = addBox({ parent: model, material: materials.pack, width: .72, height: .82, depth: .3, y: 1.62, z: -.38, name: "backpack" });
  addBox({ parent: model, material: materials.accent, width: .42, height: .13, depth: .32, y: 1.86, z: -.4, name: "backpack-detail" });

  const leftArm = createLimb({ material: materials.shirt, width: .28, length: .94, depth: .3, pivotX: -.58, pivotY: 1.98, pivotZ: 0 });
  const rightArm = createLimb({ material: materials.shirt, width: .28, length: .94, depth: .3, pivotX: .58, pivotY: 1.98, pivotZ: 0 });
  model.add(leftArm.pivot, rightArm.pivot);
  addBox({ parent: leftArm.mesh, material: materials.skin, width: .23, height: .24, depth: .25, y: -.54, name: "left-hand" });
  addBox({ parent: rightArm.mesh, material: materials.skin, width: .23, height: .24, depth: .25, y: -.54, name: "right-hand" });

  const leftLeg = createLimb({ material: materials.pants, width: .32, length: 1.02, depth: .38, pivotX: -.23, pivotY: 1.03, pivotZ: 0 });
  const rightLeg = createLimb({ material: materials.pants, width: .32, length: 1.02, depth: .38, pivotX: .23, pivotY: 1.03, pivotZ: 0 });
  model.add(leftLeg.pivot, rightLeg.pivot);
  addBox({ parent: leftLeg.mesh, material: materials.boot, width: .36, height: .27, depth: .48, y: -.6, z: .05, name: "left-boot" });
  addBox({ parent: rightLeg.mesh, material: materials.boot, width: .36, height: .27, depth: .48, y: -.6, z: .05, name: "right-boot" });

  return {
    root,
    model,
    torso,
    head,
    backpack,
    leftArm: leftArm.pivot,
    rightArm: rightArm.pivot,
    leftLeg: leftLeg.pivot,
    rightLeg: rightLeg.pivot,
    materials
  };
};

export class DirectionalSpriteRig {
  constructor({ characterImage }) {
    this.variant = String(characterImage).includes("female") ? "female" : "male";
    this.parts = createHeroModel(this.variant);
    this.root = this.parts.root;
    this.root.scale.setScalar(.92);
    this.direction = "front";
  }

  update({ state, velocity, elapsed }) {
    this.direction = directionFromVelocity(velocity, this.direction);
    const targetRotation = directionAngle[this.direction] ?? 0;
    let difference = targetRotation - this.root.rotation.y;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    this.root.rotation.y += difference * .34;

    const walking = state === "walking";
    const running = state === "running";
    const frequency = running ? 11.5 : walking ? 7.2 : 2.2;
    const amplitude = running ? .78 : walking ? .52 : .035;
    const swing = Math.sin(elapsed * frequency) * amplitude;
    const bob = running ? Math.abs(Math.sin(elapsed * frequency)) * .085 : walking ? Math.abs(Math.sin(elapsed * frequency)) * .045 : Math.sin(elapsed * 2.2) * .018;

    this.parts.leftArm.rotation.x = swing;
    this.parts.rightArm.rotation.x = -swing;
    this.parts.leftLeg.rotation.x = -swing * .82;
    this.parts.rightLeg.rotation.x = swing * .82;
    this.parts.model.position.y = .02 + bob;
    this.parts.torso.rotation.z = running ? Math.sin(elapsed * frequency) * .025 : 0;
    this.parts.head.rotation.z = running ? -this.parts.torso.rotation.z * .7 : 0;
    this.parts.backpack.rotation.x = running ? -.08 + Math.abs(Math.sin(elapsed * frequency)) * .05 : 0;
  }

  dispose() {
    this.root.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
  }
}

const NPC_PALETTES = {
  story: { skin: 0xe1b084, hair: 0x49352f, shirt: 0x6e9f58, accent: 0xd9c76c, pants: 0x344c5f },
  resident: { skin: 0xd8a47b, hair: 0x6a3e36, shirt: 0x4f7ca0, accent: 0xe2a860, pants: 0x3a4c62 },
  researcher: { skin: 0xe4b489, hair: 0x3b3332, shirt: 0xdfd7bb, accent: 0x4c9d8f, pants: 0x3f5960 },
  merchant: { skin: 0xd0a078, hair: 0x5b4434, shirt: 0x9a6240, accent: 0xd9bd65, pants: 0x4b4a55 }
};

const createNpcModel = (role) => {
  const palette = NPC_PALETTES[role] || NPC_PALETTES.story;
  const materials = {
    skin: colorMaterial(palette.skin),
    hair: colorMaterial(palette.hair),
    shirt: colorMaterial(palette.shirt),
    accent: colorMaterial(palette.accent),
    pants: colorMaterial(palette.pants),
    boot: colorMaterial(0x392e2a),
    eye: colorMaterial(0x17252a),
    coat: colorMaterial(0xe4dfca)
  };

  const root = new THREE.Group();
  root.name = `Overworld3DNpc-${role}`;
  const body = new THREE.Group();
  root.add(body);

  const headScale = role === "resident" ? .92 : role === "researcher" ? .98 : 1;
  addBox({ parent: body, material: materials.skin, width: .78 * headScale, height: .76 * headScale, depth: .7 * headScale, y: 2.25, name: "npc-head" });
  addBox({ parent: body, material: materials.hair, width: .84 * headScale, height: .25, depth: .75 * headScale, y: 2.6, name: "npc-hair-top" });

  if (role === "story") {
    addBox({ parent: body, material: materials.hair, width: .2, height: .65, depth: .24, x: -.32, y: 2.12, z: -.22 });
    addBox({ parent: body, material: materials.hair, width: .2, height: .65, depth: .24, x: .32, y: 2.12, z: -.22 });
  } else if (role === "resident") {
    addBox({ parent: body, material: materials.hair, width: .25, height: .22, depth: .25, x: -.28, y: 2.76, z: .12 });
  } else if (role === "researcher") {
    addBox({ parent: body, material: materials.hair, width: .18, height: .42, depth: .72, x: -.34, y: 2.45 });
    addBox({ parent: body, material: materials.hair, width: .18, height: .42, depth: .72, x: .34, y: 2.45 });
  }

  [-.16, .16].forEach((eyeX) => addBox({ parent: body, material: materials.eye, width: .06, height: .08, depth: .035, x: eyeX, y: 2.24, z: .36, castShadow: false, receiveShadow: false }));

  const torsoMaterial = role === "researcher" ? materials.coat : materials.shirt;
  const torsoWidth = role === "resident" ? .9 : .82;
  addBox({ parent: body, material: torsoMaterial, width: torsoWidth, height: 1.05, depth: .48, y: 1.42, name: "npc-torso" });
  addBox({ parent: body, material: materials.accent, width: .54, height: .16, depth: .5, y: 1.72, z: .015, name: "npc-accent" });

  if (role === "researcher") {
    addBox({ parent: body, material: materials.shirt, width: .36, height: .7, depth: .5, y: 1.34, z: .02 });
    addBox({ parent: body, material: materials.accent, width: .12, height: .48, depth: .52, y: 1.43, z: .03 });
  }

  [-.52, .52].forEach((armX) => addBox({ parent: body, material: torsoMaterial, width: .25, height: .88, depth: .27, x: armX, y: 1.42, name: "npc-arm" }));
  [-.22, .22].forEach((legX) => {
    addBox({ parent: body, material: materials.pants, width: .3, height: .9, depth: .34, x: legX, y: .56, name: "npc-leg" });
    addBox({ parent: body, material: materials.boot, width: .34, height: .22, depth: .43, x: legX, y: .1, z: .04, name: "npc-boot" });
  });

  if (role === "researcher") {
    addBox({ parent: body, material: materials.accent, width: .42, height: .28, depth: .12, x: .56, y: 1.25, z: .28, name: "research-device" });
  }

  return { root, body, materials };
};

export const createNpcSprite = (role) => {
  const model = createNpcModel(role);
  model.root.scale.setScalar(.86);
  model.root.rotation.y = Math.PI;
  const disposable = {
    dispose() {
      model.root.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
    }
  };
  return { sprite: model.root, material: disposable };
};

export const createPixelShadowTexture = () => createCanvasTexture("ow3d-shadow", 32, 16, (context) => {
  fill(context, "rgba(7,20,18,.12)", 3, 5, 26, 7);
  fill(context, "rgba(7,20,18,.26)", 7, 4, 18, 9);
  fill(context, "rgba(7,20,18,.42)", 11, 5, 10, 7);
});

export const createGroundShadow = ({ width = 1.8, depth = 0.72, opacity = 0.34 } = {}) => {
  const material = new THREE.MeshBasicMaterial({
    map: createPixelShadowTexture(),
    transparent: true,
    depthWrite: false,
    alphaTest: .02,
    opacity
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return { mesh, material };
};

export const disposeSpriteFrames = () => {
  sharedTextures.forEach((texture) => texture.dispose());
  sharedTextures.clear();
};
