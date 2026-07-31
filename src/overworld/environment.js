import { THREE } from "./engine.js";
import { createPixelMaterial, createSpriteMaterial } from "./textures.js";

const spriteObject = ({ parent, texture, x = 0, y = 0, z = 0, width, height, centerY = 0.03, name, renderOrder = 3, castShadow = false }) => {
  const material = createSpriteMaterial(texture, { depthWrite: true, alphaTest: 0.08, fog: true });
  const sprite = new THREE.Sprite(material);
  sprite.name = name || "OverworldArtSprite";
  sprite.center.set(0.5, centerY);
  sprite.position.set(x, y, z);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = renderOrder;
  sprite.userData.artMaterial = material;
  sprite.castShadow = castShadow;
  parent.add(sprite);
  return sprite;
};

export const createEnvironmentMaterials = (textures) => ({
  textures,
  grass: createPixelMaterial(textures.grass),
  path: createPixelMaterial(textures.path),
  stone: createPixelMaterial(textures.stone),
  shore: createPixelMaterial(textures.shore),
  water: textures.waterFrames.map((texture) => createPixelMaterial(texture, { side: THREE.DoubleSide }))
});

export const createTileInstances = ({ parent, name, cells, material, size = 2, y = -0.12, height = 0.24 }) => {
  if (!cells.length) return null;
  const geometry = new THREE.BoxGeometry(size, height, size);
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  mesh.name = name;
  mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  cells.forEach(([x, z], index) => {
    matrix.makeTranslation(x, y, z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
};

export const createTree = ({ parent, materials, x, z, scale = 1, variant = 0 }) => {
  const sprite = spriteObject({
    parent,
    texture: materials.textures.tree[variant % 4],
    x, z,
    width: 7.15 * scale,
    height: 9.55 * scale,
    name: `OverworldTree-${variant}`,
    renderOrder: 3
  });
  sprite.userData.occluder = true;
  return sprite;
};

export const createHouse = ({ parent, materials, x, z, accent = "red" }) => {
  const sprite = spriteObject({
    parent,
    texture: materials.textures.houses[accent] || materials.textures.houses.red,
    x, z,
    width: 12.9,
    height: 10.45,
    name: `BosqueLuminalHouse-${accent}`,
    renderOrder: 3
  });
  sprite.userData.occluder = true;
  return sprite;
};

export const createFenceSegment = ({ parent, materials, x, z, length = 4, rotationY = 0 }) => {
  const horizontal = Math.abs(Math.cos(rotationY)) > 0.7;
  return spriteObject({
    parent,
    texture: materials.textures.fence,
    x, z,
    width: horizontal ? length + 1.1 : 2.35,
    height: horizontal ? 2.35 : Math.max(2.35, length * .66),
    name: "BosqueLuminalFence",
    renderOrder: 2
  });
};

export const createSign = ({ parent, materials, x, z }) => spriteObject({
  parent, texture: materials.textures.sign, x, z, width: 2.65, height: 2.65, name: "BosqueLuminalSign", renderOrder: 3
});

export const createTallGrassPatch = ({ parent, materials, x, z, columns = 4, rows = 3, spacing = 1.25 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const px = (column - (columns - 1) / 2) * spacing;
      const pz = (row - (rows - 1) / 2) * spacing;
      spriteObject({ parent: group, texture: materials.textures.tallGrass, x: px, z: pz, width: 1.7, height: 1.7, renderOrder: 2 });
    }
  }
  return group;
};

export const createFlowerCluster = ({ parent, materials, x, z, count = 3 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const offsets = [[0, 0], [.55, .2], [-.42, .32], [.2, -.48], [-.55, -.3]];
  offsets.slice(0, count).forEach(([px, pz]) => spriteObject({
    parent: group, texture: materials.textures.flowers, x: px, z: pz, width: 1.25, height: 1.25, renderOrder: 2
  }));
  return group;
};

export const createRock = ({ parent, materials, x, z, scale = 1 }) => spriteObject({
  parent, texture: materials.textures.rock, x, z, width: 2.1 * scale, height: 2.1 * scale, name: "BosqueLuminalRock", renderOrder: 2
});

export const createRootGate = ({ parent, materials, x, z }) => {
  const sprite = spriteObject({
    parent, texture: materials.textures.gate, x, z, width: 12.8, height: 11.2, name: "BosqueLuminalRootGate", renderOrder: 3
  });
  sprite.userData.occluder = true;
  return sprite;
};

export const createPuzzleMarker = ({ parent, materials, x, z }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const sprite = spriteObject({
    parent: group, texture: materials.textures.altar, width: 5.7, height: 5.7, name: "BosqueLuminalPuzzleMarker", renderOrder: 3
  });
  const crystal = new THREE.Object3D();
  crystal.position.y = 2.1;
  group.add(crystal);
  return { group, sprite, crystal };
};

export const createWaterSurface = ({ parent, engine, materials, cells }) => {
  const geometry = new THREE.BoxGeometry(2, .12, 2);
  const meshes = materials.water.map((material, frame) => {
    const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
    mesh.name = `WaterFrame-${frame}`;
    mesh.visible = frame === 0;
    const matrix = new THREE.Matrix4();
    cells.forEach(([x, z], index) => {
      matrix.makeTranslation(x, -.06, z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  });
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 3) % meshes.length;
    meshes.forEach((mesh, index) => { mesh.visible = index === frame; });
  });
  return meshes;
};

export const disposeEnvironmentMaterials = (materials) => {
  Object.values(materials).forEach((material) => {
    if (Array.isArray(material)) material.forEach((entry) => entry?.dispose?.());
    else if (material?.isMaterial) material.dispose();
  });
};
