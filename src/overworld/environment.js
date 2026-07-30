import { THREE } from "./engine.js";
import { createPixelMaterial } from "./textures.js";

const box = ({ parent, material, x = 0, y = 0, z = 0, width = 1, height = 1, depth = 1, castShadow = false, receiveShadow = true, rotationY = 0 }) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y + height * 0.5, z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
};

const plane = ({ parent, material, x = 0, y = 0, z = 0, width = 1, height = 1, rotationY = 0, renderOrder = 1 }) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.renderOrder = renderOrder;
  parent.add(mesh);
  return mesh;
};

const createRoofGeometry = (width, height, depth) => {
  const halfW = width / 2;
  const halfD = depth / 2;
  const vertices = new Float32Array([
    -halfW, 0, -halfD, halfW, 0, -halfD, 0, height, -halfD,
    -halfW, 0, halfD, 0, height, halfD, halfW, 0, halfD,
    -halfW, 0, -halfD, 0, height, -halfD, 0, height, halfD,
    -halfW, 0, -halfD, 0, height, halfD, -halfW, 0, halfD,
    halfW, 0, -halfD, halfW, 0, halfD, 0, height, halfD,
    halfW, 0, -halfD, 0, height, halfD, 0, height, -halfD
  ]);
  const uvs = new Float32Array([
    0, 0, 1, 0, .5, 1, 0, 0, .5, 1, 1, 0,
    0, 0, .5, 1, .5, 1, 0, 0, .5, 1, 1, 0,
    0, 0, 1, 0, .5, 1, 0, 0, .5, 1, 1, 0
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
};

export const createEnvironmentMaterials = (textures) => ({
  grass: createPixelMaterial(textures.grass),
  path: createPixelMaterial(textures.path),
  stone: createPixelMaterial(textures.stone),
  shore: createPixelMaterial(textures.shore),
  wall: createPixelMaterial(textures.wall),
  roof: createPixelMaterial(textures.roof, { side: THREE.DoubleSide }),
  wood: createPixelMaterial(textures.wood),
  bark: createPixelMaterial(textures.bark),
  leaf: createPixelMaterial(textures.leaf, { transparent: true, alphaTest: 0.18, side: THREE.DoubleSide }),
  tallGrass: createPixelMaterial(textures.tallGrass, { transparent: true, alphaTest: 0.18, side: THREE.DoubleSide }),
  flower: createPixelMaterial(textures.flower, { transparent: true, alphaTest: 0.18, side: THREE.DoubleSide }),
  sign: createPixelMaterial(textures.sign),
  water: textures.waterFrames.map((texture) => createPixelMaterial(texture, { transparent: false, side: THREE.DoubleSide })),
  darkWood: new THREE.MeshLambertMaterial({ color: 0x4b3527, flatShading: true }),
  window: new THREE.MeshLambertMaterial({ color: 0x7bd0d2, emissive: 0x173d42, emissiveIntensity: 0.45, flatShading: true }),
  door: new THREE.MeshLambertMaterial({ color: 0x6a432c, flatShading: true }),
  chimney: new THREE.MeshLambertMaterial({ color: 0x6b6f68, flatShading: true }),
  crystal: new THREE.MeshLambertMaterial({ color: 0x63d9cb, emissive: 0x1d7f79, emissiveIntensity: 0.62, flatShading: true }),
  rune: new THREE.MeshBasicMaterial({ color: 0xa8ffe0 })
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
  const group = new THREE.Group();
  group.name = `OverworldTree-${variant}`;
  group.position.set(x, 0, z);
  group.rotation.y = variant * 0.37;
  parent.add(group);

  const trunkHeight = (variant % 3 === 0 ? 3.5 : variant % 3 === 1 ? 4.2 : 3.9) * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.54 * scale, trunkHeight, 6), materials.bark);
  trunk.position.y = trunkHeight * 0.5;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const crownLayouts = [
    [[0, 3.8, 0, 4.4, 3.3], [-1.1, 4.4, .2, 2.8, 2.4], [1.05, 4.5, -.25, 2.9, 2.5]],
    [[0, 4.4, 0, 4.8, 3.5], [-1.45, 4.8, .3, 3.1, 2.7], [1.25, 5.1, -.35, 3.2, 2.8], [.1, 5.8, 0, 2.8, 2.4]],
    [[0, 4.1, 0, 4.2, 3], [-1.2, 5.0, .2, 3.2, 2.4], [1.25, 4.7, -.4, 3, 2.5], [0, 5.7, .15, 2.7, 2.2]],
    [[0, 4.5, 0, 5, 3.5], [-1.6, 4.8, .3, 3.1, 2.8], [1.5, 5.0, -.4, 3.2, 2.8], [0, 6.0, 0, 3, 2.4]]
  ];
  const layout = crownLayouts[variant % crownLayouts.length];
  layout.forEach(([px, py, pz, width, height], index) => {
    const leafA = plane({ parent: group, material: materials.leaf, x: px * scale, y: py * scale, z: pz * scale, width: width * scale, height: height * scale, rotationY: index * 0.31, renderOrder: 2 });
    const leafB = plane({ parent: group, material: materials.leaf, x: px * scale, y: py * scale, z: pz * scale, width: width * scale, height: height * scale, rotationY: Math.PI / 2 + index * 0.31, renderOrder: 2 });
    leafA.castShadow = index === 0;
    leafB.castShadow = index === 0;
  });
  return group;
};

export const createHouse = ({ parent, materials, x, z, accent = "red" }) => {
  const group = new THREE.Group();
  group.name = `BosqueLuminalHouse-${accent}`;
  group.position.set(x, 0, z);
  parent.add(group);
  box({ parent: group, material: materials.wall, width: 7.2, height: 4.4, depth: 5.6, y: 0, castShadow: true });
  const roofMaterial = accent === "blue" ? materials.roof.clone() : materials.roof;
  if (accent === "blue") roofMaterial.color.set(0x6682a5);
  const roof = new THREE.Mesh(createRoofGeometry(8.2, 2.4, 6.6), roofMaterial);
  roof.position.y = 4.35;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  box({ parent: group, material: materials.door, x: 0, y: 0, z: 2.84, width: 1.5, height: 2.5, depth: 0.16, castShadow: true });
  [-2.2, 2.2].forEach((windowX) => box({ parent: group, material: materials.window, x: windowX, y: 1.35, z: 2.86, width: 1.15, height: 1.25, depth: 0.14 }));
  box({ parent: group, material: materials.chimney, x: 2.35, y: 4.2, z: -1.2, width: .75, height: 2.4, depth: .75, castShadow: true });
  box({ parent: group, material: materials.darkWood, x: 0, y: .05, z: 3.4, width: 2.8, height: .18, depth: 1.1 });
  return group;
};

export const createFenceSegment = ({ parent, materials, x, z, length = 4, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);
  [-length / 2, length / 2].forEach((px) => box({ parent: group, material: materials.darkWood, x: px, width: .3, height: 1.65, depth: .3, castShadow: true }));
  [0.55, 1.18].forEach((height) => box({ parent: group, material: materials.wood, y: height, width: length + .4, height: .22, depth: .24, castShadow: true }));
  return group;
};

export const createSign = ({ parent, materials, x, z, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);
  box({ parent: group, material: materials.darkWood, width: .24, height: 1.9, depth: .24, castShadow: true });
  box({ parent: group, material: materials.sign, y: 1.12, width: 1.9, height: 1.05, depth: .18, castShadow: true });
  return group;
};

export const createTallGrassPatch = ({ parent, materials, x, z, columns = 4, rows = 3, spacing = 1.25 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const px = (column - (columns - 1) / 2) * spacing;
      const pz = (row - (rows - 1) / 2) * spacing;
      plane({ parent: group, material: materials.tallGrass, x: px, y: 1, z: pz, width: 1.35, height: 2, rotationY: (row + column) % 2 ? Math.PI / 4 : -Math.PI / 4, renderOrder: 2 });
      plane({ parent: group, material: materials.tallGrass, x: px, y: 1, z: pz, width: 1.35, height: 2, rotationY: Math.PI / 2 + ((row + column) % 2 ? Math.PI / 4 : -Math.PI / 4), renderOrder: 2 });
    }
  }
  return group;
};

export const createFlowerCluster = ({ parent, materials, x, z, count = 3 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const offsets = [[0, 0], [.55, .2], [-.42, .32], [.2, -.48], [-.55, -.3]];
  offsets.slice(0, count).forEach(([px, pz], index) => {
    plane({ parent: group, material: materials.flower, x: px, y: .62, z: pz, width: .75, height: 1.22, rotationY: index * .65, renderOrder: 2 });
  });
  return group;
};

export const createRock = ({ parent, materials, x, z, scale = 1 }) => {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(.72 * scale, 0), materials.stone);
  mesh.position.set(x, .42 * scale, z);
  mesh.scale.set(1.15, .72, .9);
  mesh.rotation.set(.1, x * .13 + z * .07, -.08);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

export const createRootGate = ({ parent, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "BosqueLuminalRootGate";
  group.position.set(x, 0, z);
  parent.add(group);
  [-3.1, 3.1].forEach((px) => {
    box({ parent: group, material: materials.stone, x: px, width: 1.45, height: 5.5, depth: 1.65, castShadow: true });
    box({ parent: group, material: materials.stone, x: px * .78, y: 4.6, width: 2, height: 1.4, depth: 1.65, castShadow: true, rotationY: px > 0 ? -.25 : .25 });
  });
  box({ parent: group, material: materials.darkWood, y: 1.2, width: 5.4, height: .62, depth: .72, rotationY: .35, castShadow: true });
  box({ parent: group, material: materials.darkWood, y: 2.4, width: 5.8, height: .7, depth: .72, rotationY: -.28, castShadow: true });
  [-2.2, 0, 2.2].forEach((px, index) => {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 0), materials.crystal);
    crystal.position.set(px, 3.2 + index % 2 * .55, .7);
    crystal.scale.y = 1.5;
    group.add(crystal);
  });
  return group;
};

export const createPuzzleMarker = ({ parent, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "BosqueLuminalPuzzleMarker";
  group.position.set(x, 0, z);
  parent.add(group);
  box({ parent: group, material: materials.stone, width: 3.4, height: .55, depth: 3.4, castShadow: true });
  box({ parent: group, material: materials.stone, y: .55, width: 2.2, height: .48, depth: 2.2, castShadow: true });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.62, 0), materials.crystal);
  crystal.position.y = 2.1;
  crystal.scale.y = 1.55;
  crystal.castShadow = true;
  group.add(crystal);
  return { group, crystal };
};

export const createWaterSurface = ({ parent, engine, materials, cells, size = 2 }) => {
  const geometry = new THREE.BoxGeometry(size, .16, size);
  const meshes = materials.water.map((material, frame) => {
    const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
    mesh.name = `WaterFrame-${frame}`;
    mesh.visible = frame === 0;
    mesh.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    cells.forEach(([x, z], index) => {
      matrix.makeTranslation(x, -.02, z);
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
  Object.values(materials).flat().forEach((material) => material?.dispose?.());
};
