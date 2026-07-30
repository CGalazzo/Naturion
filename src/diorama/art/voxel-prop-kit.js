import { THREE } from "../engine.js";
import { createVoxelBlock } from "./voxel-world-kit.js";

const add = (parent, material, x, y, z, width, height = width, depth = width, castShadow = false, rotationY = 0) => createVoxelBlock({
  parent, x, y: y - height * 0.5, z, width, height, depth, material, castShadow, rotationY
});

export const createRockCluster = ({ parent, stage, materials, x, z, scale = 1, rotation = 0, moss = true, obstacle = true, variant = 0 }) => {
  const group = new THREE.Group();
  group.name = `RockCluster-${variant}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const recipes = [
    [[0, 0.48, 0, 1.2, 0.96, 1], [-0.66, 0.28, 0.34, 0.62, 0.56, 0.58], [0.6, 0.24, -0.28, 0.5, 0.48, 0.5], [0.08, 0.9, -0.06, 0.62, 0.34, 0.56]],
    [[0, 0.38, 0, 1.35, 0.76, 0.8], [-0.45, 0.76, 0.08, 0.72, 0.68, 0.62], [0.62, 0.28, 0.2, 0.54, 0.46, 0.62], [-0.7, 0.2, -0.45, 0.44, 0.4, 0.42]],
    [[0, 0.55, 0, 0.9, 1.1, 0.9], [0.58, 0.34, -0.3, 0.7, 0.68, 0.58], [-0.5, 0.28, 0.38, 0.62, 0.56, 0.72], [0.1, 1.18, 0.05, 0.48, 0.3, 0.45]]
  ];
  const recipe = recipes[variant % recipes.length];
  recipe.forEach(([px, py, pz, w, h, d], index) => {
    const material = moss && (index === 0 || index === recipe.length - 1) ? materials.mossStoneBlock : index % 2 ? materials.deepStoneBlock : materials.stoneBlock;
    add(group, material, px * scale, py * scale, pz * scale, w * scale, h * scale, d * scale, index === 0, index * 0.12);
  });
  if (moss) add(group, materials.grassTop, -0.08 * scale, 1.02 * scale, -0.03 * scale, 0.74 * scale, 0.11 * scale, 0.5 * scale);
  if (obstacle) stage.obstacles.push({ type: "circle", x, z, radius: 0.72 * scale });
  return group;
};

export const createSmallStoneGroup = ({ parent, stage, materials, x, z, scale = 1, variant = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const recipes = [
    [[0, 0.12, 0, 0.32, 0.24, 0.28], [0.36, 0.09, 0.12, 0.22, 0.18, 0.2], [-0.28, 0.08, -0.14, 0.18, 0.16, 0.22]],
    [[0, 0.15, 0, 0.26, 0.3, 0.24], [-0.25, 0.08, 0.2, 0.2, 0.16, 0.18], [0.3, 0.07, -0.1, 0.16, 0.14, 0.2]],
    [[0, 0.1, 0, 0.42, 0.2, 0.3], [0.25, 0.13, 0.18, 0.24, 0.26, 0.2]]
  ];
  recipes[variant % recipes.length].forEach(([px, py, pz, w, h, d], index) => add(group, index % 2 ? materials.mossStoneBlock : materials.stoneBlock, px * scale, py * scale, pz * scale, w * scale, h * scale, d * scale));
  return group;
};

export const createCrystalCluster = ({ parent, stage, engine, materials, x, z, scale = 1, color = null }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  parent.add(group);
  const material = color ? materials.tint(materials.crystal, color, `crystal-${color}`) : materials.clone(materials.crystal);
  const pieces = [[0, 0.52, 0, 0.3, 1.05], [-0.34, 0.3, 0.12, 0.2, 0.62], [0.32, 0.24, -0.16, 0.18, 0.5], [0.1, 0.22, 0.32, 0.16, 0.44]];
  const meshes = pieces.map(([px, py, pz, width, height], index) => add(group, materials.clone(material), px * scale, py * scale, pz * scale, width * scale, height * scale, width * scale, index === 0));
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 5) % 4;
    meshes.forEach((mesh, index) => { mesh.material.emissiveIntensity = 0.42 + ((frame + index) % 4) * 0.07; });
  });
  return group;
};

export const createTotem = ({ parent, stage, materials, x, z, variant = "entry", rotation = 0, scale = 1 }) => {
  const group = new THREE.Group();
  group.name = `Totem-${variant}`;
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const dark = variant === "ancient" ? materials.barkDark : materials.bark;
  add(group, dark, 0, 1.15 * scale, 0, 0.46 * scale, 2.3 * scale, 0.46 * scale, true);
  add(group, materials.wood, 0.28 * scale, 1.5 * scale, -0.02 * scale, 1.05 * scale, 0.62 * scale, 0.18 * scale, true, -0.08);
  add(group, materials.rune, 0.28 * scale, 1.5 * scale, -0.13 * scale, 0.28 * scale, 0.28 * scale, 0.05 * scale);
  if (variant === "luminal") add(group, materials.crystal, -0.1 * scale, 2.55 * scale, 0, 0.22 * scale, 0.45 * scale, 0.22 * scale);
  return group;
};

export const createNaturalFence = ({ parent, stage, materials, x, z, length = 4, rotation = 0, broken = false }) => {
  const group = new THREE.Group();
  group.position.set(x, stage.getHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const posts = broken ? [-length * 0.5, 0.2, length * 0.5] : [-length * 0.5, 0, length * 0.5];
  posts.forEach((px, index) => add(group, materials.barkDark, px, 0.75 - (broken && index === 1 ? 0.25 : 0), 0, 0.28, broken && index === 1 ? 1 : 1.5, 0.28, true));
  add(group, materials.wood, 0, 0.95, 0, length, 0.2, 0.24, true, broken ? 0.04 : 0);
  add(group, materials.wood, broken ? -0.35 : 0, 0.48, 0, broken ? length * 0.72 : length, 0.18, 0.22, false, broken ? -0.08 : 0);
  return group;
};
