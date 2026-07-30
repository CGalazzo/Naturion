import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";
import { createDioramaMaterials } from "./materials.js";
import { createGroundShadow } from "./prop-factory.js";
import { createOutlineMaterial } from "./toon-materials.js";

const createOutlinedMesh = ({ geometry, material, outlineScale = ART_DIRECTION.outline.characterScale, castShadow = true }) => {
  const group = new THREE.Group();
  if (ART_DIRECTION.outline.enabled) {
    const outline = new THREE.Mesh(geometry, createOutlineMaterial());
    outline.scale.setScalar(outlineScale);
    outline.renderOrder = 0;
    group.add(outline);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  group.add(mesh);
  return { group, mesh };
};

const createPivotedPart = ({ parent, geometry, material, pivot, localPosition, outlineScale }) => {
  const pivotGroup = new THREE.Group();
  pivotGroup.position.copy(pivot);
  const { group, mesh } = createOutlinedMesh({ geometry, material, outlineScale });
  group.position.copy(localPosition).sub(pivot);
  pivotGroup.add(group);
  parent.add(pivotGroup);
  return { pivot: pivotGroup, group, mesh };
};

const addFaceDisc = (parent, { color, x, y, z, radiusX, radiusY }) => {
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const geometry = new THREE.CircleGeometry(1, 8);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(radiusX, radiusY, 1);
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.PI;
  mesh.renderOrder = 4;
  parent.add(mesh);
  return mesh;
};

export class StorybookCharacterRig {
  constructor({ characterImage }) {
    this.materials = createDioramaMaterials();
    this.isFemale = String(characterImage).includes("female");
    this.root = new THREE.Group();
    this.root.name = "StorybookNaturionHero";
    this.model = new THREE.Group();
    this.model.rotation.y = Math.PI;
    this.root.add(this.model);

    const skin = this.materials.tint(this.materials.rune, this.isFemale ? 0xf0b98d : 0xd89f73, `hero-skin-${this.isFemale}`);
    const skinLight = this.materials.tint(this.materials.rune, this.isFemale ? 0xffd0a5 : 0xeab789, `hero-skin-light-${this.isFemale}`);
    const hair = this.materials.tint(this.materials.barkDark, this.isFemale ? 0x59362f : 0x3b2c27, `hero-hair-${this.isFemale}`);
    const shirt = this.materials.tint(this.materials.rune, this.isFemale ? 0x4d9b9d : 0x387c8d, `hero-shirt-${this.isFemale}`);
    const shirtLight = this.materials.tint(this.materials.crystal, this.isFemale ? 0x9bdac7 : 0x72c8c8, `hero-shirt-light-${this.isFemale}`);
    const trousers = this.materials.tint(this.materials.stoneDark, this.isFemale ? 0x4c5068 : 0x3d4958, `hero-trousers-${this.isFemale}`);
    const boots = this.materials.tint(this.materials.barkDark, 0x392a25, "hero-boots");

    const torsoPart = createOutlinedMesh({ geometry: new THREE.CapsuleGeometry(0.39, 0.62, 4, 8), material: shirt });
    torsoPart.group.position.set(0, 1.68, 0);
    torsoPart.group.scale.set(1, 1, 0.78);
    this.model.add(torsoPart.group);
    this.torso = torsoPart.group;

    const chestPanel = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 5), shirtLight);
    chestPanel.scale.set(0.92, 0.32, 0.24);
    chestPanel.position.set(0, 1.78, -0.31);
    chestPanel.castShadow = true;
    this.model.add(chestPanel);

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.055, 5, 12), this.materials.barkDark);
    belt.rotation.x = Math.PI / 2;
    belt.scale.z = 0.76;
    belt.position.set(0, 1.25, 0);
    this.model.add(belt);
    const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), this.materials.crystal);
    buckle.scale.set(1.2, 0.85, 0.45);
    buckle.position.set(0, 1.25, -0.39);
    this.model.add(buckle);

    const headPart = createOutlinedMesh({ geometry: new THREE.SphereGeometry(0.5, 10, 7), material: skinLight, outlineScale: 1.025 });
    headPart.group.scale.set(0.95, 1.02, 0.86);
    headPart.group.position.set(0, 2.55, -0.015);
    this.model.add(headPart.group);
    this.head = headPart.group;

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.515, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
    hairCap.scale.set(0.98, 0.8, 0.9);
    hairCap.position.set(0, 2.76, 0.04);
    hairCap.rotation.x = -0.05;
    hairCap.castShadow = true;
    this.model.add(hairCap);

    const fringeLayout = this.isFemale
      ? [[-0.28, 2.72, -0.43, 0.13, 0.35, 0.12], [0.02, 2.77, -0.45, 0.16, 0.3, -0.08], [0.3, 2.7, -0.42, 0.11, 0.38, 0.14]]
      : [[-0.26, 2.73, -0.43, 0.12, 0.3, 0.1], [0, 2.8, -0.45, 0.15, 0.28, -0.03], [0.28, 2.71, -0.42, 0.11, 0.34, 0.13]];
    fringeLayout.forEach(([x, y, z, radius, height, tilt]) => {
      const fringe = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), hair);
      fringe.position.set(x, y, z);
      fringe.rotation.z = tilt;
      fringe.rotation.x = -0.15;
      fringe.castShadow = true;
      this.model.add(fringe);
    });

    if (this.isFemale) {
      [-1, 1].forEach((side) => {
        const sideHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 3, 6), hair);
        sideHair.position.set(side * 0.46, 2.46, 0.05);
        sideHair.rotation.z = side * 0.08;
        sideHair.castShadow = true;
        this.model.add(sideHair);
      });
      this.ponytailPivot = new THREE.Group();
      this.ponytailPivot.position.set(0.3, 2.6, 0.35);
      const ponytail = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 4, 7), hair);
      ponytail.position.set(0.08, -0.25, 0.05);
      ponytail.rotation.z = -0.2;
      ponytail.castShadow = true;
      this.ponytailPivot.add(ponytail);
      this.model.add(this.ponytailPivot);
    }

    addFaceDisc(this.model, { color: 0x17231f, x: -0.18, y: 2.58, z: -0.438, radiusX: 0.055, radiusY: 0.075 });
    addFaceDisc(this.model, { color: 0x17231f, x: 0.18, y: 2.58, z: -0.438, radiusX: 0.055, radiusY: 0.075 });
    addFaceDisc(this.model, { color: 0xf7fff0, x: -0.165, y: 2.61, z: -0.444, radiusX: 0.018, radiusY: 0.025 });
    addFaceDisc(this.model, { color: 0xf7fff0, x: 0.195, y: 2.61, z: -0.444, radiusX: 0.018, radiusY: 0.025 });
    const mouth = addFaceDisc(this.model, { color: 0x9b5749, x: 0, y: 2.39, z: -0.447, radiusX: 0.065, radiusY: 0.022 });
    mouth.scale.y *= 0.7;

    const armGeometry = new THREE.CapsuleGeometry(0.115, 0.58, 4, 7);
    this.leftArm = createPivotedPart({
      parent: this.model,
      geometry: armGeometry,
      material: shirt,
      pivot: new THREE.Vector3(-0.48, 1.94, 0),
      localPosition: new THREE.Vector3(-0.5, 1.57, 0),
      outlineScale: 1.045
    }).pivot;
    this.rightArm = createPivotedPart({
      parent: this.model,
      geometry: armGeometry,
      material: shirt,
      pivot: new THREE.Vector3(0.48, 1.94, 0),
      localPosition: new THREE.Vector3(0.5, 1.57, 0),
      outlineScale: 1.045
    }).pivot;
    [-1, 1].forEach((side) => {
      const hand = createOutlinedMesh({ geometry: new THREE.SphereGeometry(0.115, 7, 5), material: skin, outlineScale: 1.035 });
      hand.group.scale.set(0.85, 1.05, 0.8);
      hand.group.position.set(side * 0.5, 1.12, 0);
      this.model.add(hand.group);
    });

    const legGeometry = new THREE.CapsuleGeometry(0.14, 0.54, 4, 7);
    this.leftLeg = createPivotedPart({
      parent: this.model,
      geometry: legGeometry,
      material: trousers,
      pivot: new THREE.Vector3(-0.2, 1.13, 0),
      localPosition: new THREE.Vector3(-0.2, 0.76, 0),
      outlineScale: 1.04
    }).pivot;
    this.rightLeg = createPivotedPart({
      parent: this.model,
      geometry: legGeometry,
      material: trousers,
      pivot: new THREE.Vector3(0.2, 1.13, 0),
      localPosition: new THREE.Vector3(0.2, 0.76, 0),
      outlineScale: 1.04
    }).pivot;
    [-1, 1].forEach((side) => {
      const boot = createOutlinedMesh({ geometry: new THREE.SphereGeometry(0.19, 8, 5), material: boots, outlineScale: 1.04 });
      boot.group.scale.set(0.95, 0.58, 1.35);
      boot.group.position.set(side * 0.2, 0.23, -0.08);
      this.model.add(boot.group);
    });

    const pack = createOutlinedMesh({ geometry: new THREE.CapsuleGeometry(0.2, 0.38, 4, 7), material: this.materials.bark, outlineScale: 1.035 });
    pack.group.scale.set(0.9, 1, 0.58);
    pack.group.position.set(0, 1.65, 0.32);
    this.model.add(pack.group);

    this.shadow = createGroundShadow({ parent: this.root, width: 1.65, depth: 0.78, opacity: 0.37 });
    this.model.scale.setScalar(1.02 * ART_DIRECTION.scale.character);
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
    const legAmplitude = running ? 0.72 : walking ? 0.44 : 0.022;
    const armAmplitude = running ? 0.64 : walking ? 0.4 : 0.02;
    const phase = elapsed * frequency;
    const swing = Math.sin(phase);
    this.leftLeg.rotation.x = swing * legAmplitude;
    this.rightLeg.rotation.x = -swing * legAmplitude;
    this.leftArm.rotation.x = -swing * armAmplitude;
    this.rightArm.rotation.x = swing * armAmplitude;
    this.leftArm.rotation.z = -0.08;
    this.rightArm.rotation.z = 0.08;
    this.model.position.y = state === "idle"
      ? Math.round(Math.sin(elapsed * 1.8) * 2) / 110
      : Math.round(Math.abs(Math.sin(phase * 0.5)) * (running ? 8 : 5)) / 75;
    this.model.rotation.z = state === "idle" ? Math.sin(elapsed * 1.3) * 0.005 : -velocity.x * 0.01;
    this.torso.rotation.z = state === "idle" ? Math.sin(elapsed * 1.2) * 0.006 : -swing * (running ? 0.025 : 0.012);
    if (this.ponytailPivot) this.ponytailPivot.rotation.x = -swing * (running ? 0.18 : walking ? 0.09 : 0.025);
    this.shadow.scale.set(running ? 0.9 + Math.abs(swing) * 0.06 : 1, running ? 0.94 : 1, 1);
    this.shadow.material.opacity = running ? 0.31 : 0.37;
  }

  dispose() {
    this.root.traverse((object) => {
      object.geometry?.dispose?.();
      if (object.material && !Array.isArray(object.material) && object.material.userData?.temporary) object.material.dispose?.();
    });
    this.root.removeFromParent();
  }
}
