import { THREE } from "../engine.js";
import { createVoxelBlock } from "./voxel-world-kit.js";

const add = (parent, material, x, y, z, width, height = width, depth = width, castShadow = false) => createVoxelBlock({
  parent, x, y: y - height * 0.5, z, width, height, depth, material, castShadow
});

const createDistantTree = ({ parent, materials, x, y, z, scale, tone = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const trunk = tone % 2 ? materials.barkDark : materials.bark;
  add(group, trunk, 0, 1.4 * scale, 0, 0.45 * scale, 2.8 * scale, 0.45 * scale);
  const leaf = tone === 2 ? materials.leafAncient : tone === 1 ? materials.leaf : materials.leafLight;
  [[0, 3.2, 0, 1.3], [-0.9, 3.1, 0.1, 1.05], [0.9, 3.2, -0.1, 1.05], [0, 4.15, 0, 1.05]].forEach(([px, py, pz, size]) => add(group, leaf, px * scale, py * scale, pz * scale, size * scale));
  return group;
};

export const createVoxelBackground = ({ scene, materials }) => {
  const root = new THREE.Group();
  root.name = "VoxelBackgroundLayers";
  scene.add(root);

  const hillMaterial = materials.tint(materials.stoneDark, 0x274a43, "background-hill");
  const hillMaterial2 = materials.tint(materials.mossStone, 0x315b49, "background-hill-2");
  [
    [-54, -8, -65, 18, 11, 24], [-29, 1, -72, 24, 14, 20], [2, -2, -76, 28, 12, 18],
    [32, 1, -70, 22, 15, 20], [58, -7, -60, 19, 10, 22], [-60, -6, 38, 20, 12, 24],
    [-28, 0, 49, 25, 14, 20], [7, -2, 55, 28, 11, 22], [39, 1, 47, 22, 15, 19], [63, -5, 35, 18, 10, 20]
  ].forEach(([x, y, z, w, h, d], index) => add(root, index % 2 ? hillMaterial2 : hillMaterial, x, y, z, w, h, d));

  const treePositions = [
    [-58, 0, -42, 1.8, 2], [-48, 0, -51, 1.45, 1], [-39, 0, -44, 1.65, 0], [-26, 0, -55, 1.7, 2],
    [-11, 0, -51, 1.55, 1], [4, 0, -58, 1.85, 2], [18, 0, -51, 1.5, 0], [31, 0, -55, 1.75, 1],
    [46, 0, -46, 1.6, 2], [58, 0, -40, 1.8, 1], [-57, 0, 37, 1.7, 1], [-44, 0, 44, 1.45, 2],
    [-31, 0, 50, 1.65, 0], [-16, 0, 47, 1.55, 1], [0, 0, 55, 1.8, 2], [17, 0, 49, 1.6, 0],
    [31, 0, 52, 1.75, 1], [45, 0, 44, 1.5, 2], [58, 0, 36, 1.8, 1]
  ];
  treePositions.forEach(([x, y, z, scale, tone]) => createDistantTree({ parent: root, materials, x, y, z, scale, tone }));

  const ruinMaterial = materials.tint(materials.stone, 0x4c6259, "background-ruin");
  [[-42, 1, -33], [51, 1, 29], [37, 1, -38]].forEach(([x, y, z], ruinIndex) => {
    const ruin = new THREE.Group();
    ruin.position.set(x, y, z);
    root.add(ruin);
    add(ruin, ruinMaterial, -1.2, 1.2, 0, 1.1, 2.4, 1.1);
    add(ruin, ruinMaterial, 1.2, 0.8, 0, 1.1, 1.6, 1.1);
    add(ruin, ruinMaterial, 0, 2.45, 0, 3.6, 0.75, 1.1);
    if (ruinIndex === 1) add(ruin, materials.crystal, 0, 3.15, 0.2, 0.28, 0.55, 0.28);
  });
  return root;
};

export const createVoxelAtmosphere = ({ scene, engine, materials }) => {
  const root = new THREE.Group();
  root.name = "VoxelAtmosphere";
  scene.add(root);

  const mistMaterial = new THREE.MeshBasicMaterial({ color: 0x6f9a82, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
  [
    [-25, 1.4, -2, 25, 5, 0.1], [18, 2, 8, 22, 4.5, 0.1], [-4, 1.2, 28, 28, 5, 0.1], [8, 2.2, -25, 24, 4, 0.1]
  ].forEach(([x, y, z, w, h, d], index) => {
    const mist = add(root, mistMaterial.clone(), x, y, z, w, h, d, false);
    mist.rotation.y = index % 2 ? Math.PI / 2 : 0;
    mist.userData.phase = index * 1.7;
  });

  const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0xffefb6, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide });
  [[-20, 11, -5, 5, 24], [2, 12, 7, 4, 26], [23, 12, 12, 5, 25], [29, 12, 22, 4, 24]].forEach(([x, y, z, w, h], index) => {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shaftMaterial.clone());
    shaft.position.set(x, y, z);
    shaft.rotation.set(-0.3, Math.PI / 4, index % 2 ? 0.08 : -0.08);
    root.add(shaft);
  });

  const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xe2f5a9, transparent: true, opacity: 0.72, depthWrite: false });
  const particleGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const positions = [
    [-28, 3, -18], [-23, 4.2, -11], [-17, 3.5, -2], [-9, 4.8, 4], [-2, 3.8, 2], [7, 5.2, 6],
    [14, 4.2, 8], [20, 5.5, 10], [27, 5, 17], [31, 6.2, 22], [-24, 4.5, 14], [-18, 5.8, 18],
    [18, 3.5, -1], [11, 3.2, -14], [3, 4.6, -17], [-4, 3.4, -14], [25, 4, 2], [29, 3.7, 8]
  ];
  const particles = positions.map(([x, y, z], index) => {
    const mesh = new THREE.Mesh(particleGeometry, particleMaterial.clone());
    mesh.position.set(x, y, z);
    mesh.userData.baseY = y;
    mesh.userData.phase = index * 0.73;
    root.add(mesh);
    return mesh;
  });

  const leafMaterials = [materials.leafAncient, materials.leaf, materials.leafLight];
  const leaves = [
    [-12, 7, -4, 0], [5, 6, 2, 1], [17, 8, 9, 2], [24, 7, 18, 0], [-22, 6, 13, 1], [10, 7, -12, 2]
  ].map(([x, y, z, type], index) => {
    const leaf = add(root, leafMaterials[type], x, y, z, 0.28, 0.05, 0.16);
    leaf.userData.base = new THREE.Vector3(x, y, z);
    leaf.userData.phase = index * 1.2;
    return leaf;
  });

  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 6);
    root.children.filter((child) => child.userData.phase !== undefined && !child.userData.base).forEach((mist, index) => {
      mist.position.x += Math.sin(frame * 0.02 + mist.userData.phase) * 0.002;
      mist.material.opacity = 0.055 + ((frame + index) % 4) * 0.006;
    });
    particles.forEach((particle, index) => {
      particle.position.y = particle.userData.baseY + ((frame + index) % 5) * 0.035;
      particle.visible = (frame + index) % 6 !== 0;
    });
    leaves.forEach((leaf, index) => {
      const phase = frame * 0.045 + leaf.userData.phase;
      leaf.position.x = leaf.userData.base.x + Math.sin(phase) * 0.65;
      leaf.position.y = leaf.userData.base.y - ((frame + index * 8) % 80) * 0.035;
      leaf.position.z = leaf.userData.base.z + Math.cos(phase * 0.7) * 0.45;
      leaf.rotation.y = frame * 0.08 + index;
      if (leaf.position.y < 1.2) leaf.position.y = leaf.userData.base.y;
    });
  });
  return root;
};
