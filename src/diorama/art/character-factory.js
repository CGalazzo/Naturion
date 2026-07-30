import { THREE } from "../engine.js";
import { createDioramaMaterials } from "./materials.js";
import { createGroundShadow } from "./prop-factory.js";

const addPart = (group, { name, size, position, material, pivot = null, castShadow = true }) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  if (!pivot) {
    group.add(mesh);
    return { pivot: group, mesh };
  }
  const pivotGroup = new THREE.Group();
  pivotGroup.name = `${name}Pivot`;
  pivotGroup.position.set(pivot.x, pivot.y, pivot.z);
  mesh.position.sub(pivotGroup.position);
  pivotGroup.add(mesh);
  group.add(pivotGroup);
  return { pivot: pivotGroup, mesh };
};

const createFacePixel = (parent, material, x, y, z, width = 0.08, height = 0.1) => {
  const pixel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.035), material);
  pixel.position.set(x, y, z);
  parent.add(pixel);
  return pixel;
};

export class VoxelCharacterRig {
  constructor({ characterImage }) {
    this.materials = createDioramaMaterials();
    this.isFemale = String(characterImage).includes("female");
    this.root = new THREE.Group();
    this.root.name = "VoxelNaturionHero";
    this.model = new THREE.Group();
    this.model.rotation.y = Math.PI;
    this.root.add(this.model);

    const skin = this.materials.tint(this.materials.rune, this.isFemale ? 0xf2bd91 : 0xd8a274, `skin-${this.isFemale}`);
    const skinLight = this.materials.tint(this.materials.rune, this.isFemale ? 0xffd1a5 : 0xe8b486, `skin-light-${this.isFemale}`);
    const hair = this.materials.tint(this.materials.barkDark, this.isFemale ? 0x593b2d : 0x3d2d27, `hair-${this.isFemale}`);
    const shirt = this.materials.tint(this.materials.rune, this.isFemale ? 0x59a3a8 : 0x3b7f91, `shirt-${this.isFemale}`);
    const shirtAccent = this.materials.tint(this.materials.crystal, this.isFemale ? 0xbde8d8 : 0x7ed2d1, `shirt-accent-${this.isFemale}`);
    const trousers = this.materials.tint(this.materials.stoneDark, this.isFemale ? 0x4b526b : 0x3e4a5b, `trousers-${this.isFemale}`);
    const boots = this.materials.tint(this.materials.barkDark, 0x3d2d24, "hero-boots");
    const eye = new THREE.MeshBasicMaterial({ color: 0x17231f });
    const highlight = new THREE.MeshBasicMaterial({ color: 0xf8fff0 });

    this.torso = addPart(this.model, {
      name: "Torso",
      size: new THREE.Vector3(0.78, 1.02, 0.45),
      position: new THREE.Vector3(0, 1.68, 0),
      material: shirt
    }).mesh;
    const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.48), shirtAccent);
    chestBand.position.set(0, 1.8, 0.01);
    chestBand.castShadow = true;
    this.model.add(chestBand);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.16, 0.48), this.materials.barkDark);
    belt.position.set(0, 1.15, 0);
    belt.castShadow = true;
    this.model.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), this.materials.crystal);
    buckle.position.set(0, 1.15, -0.27);
    this.model.add(buckle);

    this.head = addPart(this.model, {
      name: "Head",
      size: new THREE.Vector3(0.82, 0.78, 0.72),
      position: new THREE.Vector3(0, 2.6, 0),
      material: skinLight
    }).mesh;

    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.78), hair);
    hairCap.position.set(0, 2.92, 0.02);
    hairCap.castShadow = true;
    this.model.add(hairCap);
    const fringePositions = this.isFemale
      ? [[-0.31, 2.72, -0.39, 0.2, 0.38], [0.12, 2.76, -0.4, 0.28, 0.3], [0.34, 2.68, -0.38, 0.15, 0.42]]
      : [[-0.3, 2.74, -0.4, 0.22, 0.3], [0, 2.8, -0.41, 0.28, 0.24], [0.3, 2.72, -0.39, 0.2, 0.34]];
    fringePositions.forEach(([x, y, z, width, height]) => {
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), hair);
      fringe.position.set(x, y, z);
      fringe.castShadow = true;
      this.model.add(fringe);
    });
    if (this.isFemale) {
      [-1, 1].forEach((side) => {
        const sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.44), hair);
        sideHair.position.set(side * 0.46, 2.55, 0.08);
        sideHair.castShadow = true;
        this.model.add(sideHair);
      });
      const ponytail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.75, 0.38), hair);
      ponytail.position.set(0.35, 2.45, 0.42);
      ponytail.rotation.z = -0.18;
      ponytail.castShadow = true;
      this.model.add(ponytail);
    }

    createFacePixel(this.model, eye, -0.2, 2.61, -0.375, 0.09, 0.12);
    createFacePixel(this.model, eye, 0.2, 2.61, -0.375, 0.09, 0.12);
    createFacePixel(this.model, highlight, -0.18, 2.635, -0.398, 0.025, 0.035);
    createFacePixel(this.model, highlight, 0.22, 2.635, -0.398, 0.025, 0.035);

    const armX = 0.55;
    this.leftArm = addPart(this.model, {
      name: "LeftArm",
      size: new THREE.Vector3(0.28, 0.9, 0.3),
      position: new THREE.Vector3(-armX, 1.55, 0),
      pivot: new THREE.Vector3(-armX, 1.95, 0),
      material: shirt
    }).pivot;
    this.rightArm = addPart(this.model, {
      name: "RightArm",
      size: new THREE.Vector3(0.28, 0.9, 0.3),
      position: new THREE.Vector3(armX, 1.55, 0),
      pivot: new THREE.Vector3(armX, 1.95, 0),
      material: shirt
    }).pivot;
    [-1, 1].forEach((side) => {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.25, 0.25), skin);
      hand.position.set(side * armX, 1.06, 0);
      hand.castShadow = true;
      this.model.add(hand);
    });

    this.leftLeg = addPart(this.model, {
      name: "LeftLeg",
      size: new THREE.Vector3(0.34, 0.92, 0.38),
      position: new THREE.Vector3(-0.23, 0.66, 0),
      pivot: new THREE.Vector3(-0.23, 1.05, 0),
      material: trousers
    }).pivot;
    this.rightLeg = addPart(this.model, {
      name: "RightLeg",
      size: new THREE.Vector3(0.34, 0.92, 0.38),
      position: new THREE.Vector3(0.23, 0.66, 0),
      pivot: new THREE.Vector3(0.23, 1.05, 0),
      material: trousers
    }).pivot;
    [-1, 1].forEach((side) => {
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.54), boots);
      boot.position.set(side * 0.23, 0.17, -0.07);
      boot.castShadow = true;
      this.model.add(boot);
    });

    const shoulderPack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.26), this.materials.bark);
    shoulderPack.position.set(0, 1.68, 0.34);
    shoulderPack.castShadow = true;
    this.model.add(shoulderPack);

    this.shadow = createGroundShadow({ parent: this.root, width: 1.7, depth: 0.82, opacity: 0.38 });
    this.model.scale.setScalar(1.08);
    this.lastRotation = Math.PI;
  }

  update({ state, velocity, elapsed }) {
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed > 0.05) {
      const desiredRotation = Math.atan2(velocity.x, velocity.z);
      let delta = desiredRotation - this.lastRotation;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.lastRotation += delta * 0.22;
      this.model.rotation.y = this.lastRotation;
    }

    const running = state === "running";
    const walking = state === "walking";
    const frequency = running ? 13.2 : walking ? 8.4 : 1.8;
    const legAmplitude = running ? 0.78 : walking ? 0.48 : 0.025;
    const armAmplitude = running ? 0.7 : walking ? 0.44 : 0.025;
    const phase = elapsed * frequency;
    const swing = Math.sin(phase);
    this.leftLeg.rotation.x = swing * legAmplitude;
    this.rightLeg.rotation.x = -swing * legAmplitude;
    this.leftArm.rotation.x = -swing * armAmplitude;
    this.rightArm.rotation.x = swing * armAmplitude;
    this.leftArm.rotation.z = -0.06;
    this.rightArm.rotation.z = 0.06;
    this.model.position.y = state === "idle"
      ? Math.sin(elapsed * 1.8) * 0.018
      : Math.abs(Math.sin(phase * 0.5)) * (running ? 0.11 : 0.065);
    this.model.rotation.z = state === "idle" ? Math.sin(elapsed * 1.3) * 0.006 : -velocity.x * 0.012;
    this.shadow.scale.set(
      running ? 0.88 + Math.abs(swing) * 0.08 : 1,
      running ? 0.92 : 1,
      1
    );
    this.shadow.material.opacity = running ? 0.32 : 0.38;
  }

  dispose() {
    this.root.traverse((object) => {
      object.geometry?.dispose?.();
    });
    this.root.removeFromParent();
  }
}
