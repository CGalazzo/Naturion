import { THREE } from "../engine.js";
import { ART_DIRECTION } from "./art-direction.js";

const createSquareTexture = (color = "rgba(255,240,170,.9)") => {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.fillStyle = "rgba(0,0,0,0)";
  context.fillRect(0, 0, 16, 16);
  context.fillStyle = color;
  context.fillRect(5, 5, 6, 6);
  context.fillStyle = "rgba(255,255,220,.7)";
  context.fillRect(6, 5, 2, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
};

export const createAtmosphericEffects = ({ scene, engine, materials }) => {
  const root = new THREE.Group();
  root.name = "BosqueAtmosphere";
  scene.add(root);

  const pollenTexture = createSquareTexture();
  const pollenPositions = [];
  const pollenMeta = [];
  for (let index = 0; index < ART_DIRECTION.atmosphere.pollenCount; index += 1) {
    const angle = index * 2.399;
    const radius = 8 + (index % 11) * 3.2;
    pollenPositions.push(Math.cos(angle) * radius, 1.3 + (index % 9) * 0.75, Math.sin(angle) * radius);
    pollenMeta.push({ phase: index * 0.57, radius });
  }
  const pollenGeometry = new THREE.BufferGeometry();
  pollenGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pollenPositions, 3));
  const pollenMaterial = new THREE.PointsMaterial({
    map: pollenTexture,
    color: ART_DIRECTION.palette.sunHighlight,
    transparent: true,
    opacity: 0.72,
    alphaTest: 0.05,
    depthWrite: false,
    size: 0.24,
    sizeAttenuation: true,
    fog: false
  });
  const pollen = new THREE.Points(pollenGeometry, pollenMaterial);
  pollen.renderOrder = 8;
  root.add(pollen);

  const shafts = [];
  const shaftPositions = [[-18, 10, -12, -0.22], [-5, 12, 4, 0.08], [13, 11, 9, -0.16], [25, 13, 18, 0.12], [-27, 9, 18, -0.08]];
  shaftPositions.forEach(([x, y, z, rotation], index) => {
    const shaft = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5 + index % 2, 18),
      new THREE.MeshBasicMaterial({ color: ART_DIRECTION.palette.sunHighlight, transparent: true, opacity: 0.035 + index * 0.004, depthWrite: false, side: THREE.DoubleSide })
    );
    shaft.position.set(x, y, z);
    shaft.rotation.set(-0.18, Math.PI * 0.25, rotation);
    root.add(shaft);
    shafts.push(shaft);
  });

  const mistLayers = [];
  for (let index = 0; index < ART_DIRECTION.atmosphere.mistLayers; index += 1) {
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(24 + index * 5, 8 + index),
      new THREE.MeshBasicMaterial({ color: ART_DIRECTION.palette.fog, transparent: true, opacity: 0.035 + index * 0.008, depthWrite: false, side: THREE.DoubleSide })
    );
    mist.position.set(-22 + index * 15, 2.5 + index * 0.4, -28 + index * 17);
    mist.userData.originX = mist.position.x;
    mist.rotation.set(-Math.PI / 2, 0, index * 0.12);
    root.add(mist);
    mistLayers.push(mist);
  }

  const foregroundLeaves = [];
  for (let index = 0; index < ART_DIRECTION.atmosphere.foregroundLeaves; index += 1) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.22 + (index % 3) * 0.05, 6), materials.clone(index % 2 ? materials.leafLight : materials.leafAncient, { side: THREE.DoubleSide, transparent: true, opacity: 0.82, depthWrite: false }));
    leaf.scale.set(1.6, 0.65, 1);
    leaf.userData.origin = new THREE.Vector3(-30 + index * 8, 4 + (index % 3) * 1.4, -20 + (index % 5) * 11);
    leaf.userData.phase = index * 0.83;
    leaf.position.copy(leaf.userData.origin);
    leaf.renderOrder = 10;
    root.add(leaf);
    foregroundLeaves.push(leaf);
  }

  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 8) / 8;
    const positions = pollen.geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const meta = pollenMeta[index];
      const baseX = pollenPositions[index * 3];
      const baseY = pollenPositions[index * 3 + 1];
      const baseZ = pollenPositions[index * 3 + 2];
      positions.setXYZ(
        index,
        baseX + Math.sin(frame * 0.42 + meta.phase) * 0.42,
        baseY + Math.sin(frame * 0.7 + meta.phase) * 0.22,
        baseZ + Math.cos(frame * 0.36 + meta.phase) * 0.35
      );
    }
    positions.needsUpdate = true;
    shafts.forEach((shaft, index) => {
      shaft.material.opacity = 0.03 + ((Math.floor(frame * 2 + index) % 3) * 0.006);
    });
    mistLayers.forEach((mist, index) => {
      mist.position.x = mist.userData.originX + Math.sin(frame * 0.22 + index) * 0.18;
    });
    foregroundLeaves.forEach((leaf, index) => {
      const phase = frame * (0.35 + index * 0.018) + leaf.userData.phase;
      leaf.position.set(
        leaf.userData.origin.x + Math.sin(phase) * 2.2,
        leaf.userData.origin.y + Math.cos(phase * 0.8) * 0.8,
        leaf.userData.origin.z + Math.sin(phase * 0.55) * 1.4
      );
      leaf.rotation.set(phase * 0.24, phase * 0.31, phase * 0.17);
    });
  });

  return root;
};
