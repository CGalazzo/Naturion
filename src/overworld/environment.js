import { THREE } from "./engine.js";
import { createPixelMaterial } from "./textures.js";

const box = ({
  parent,
  material,
  x = 0,
  y = 0,
  z = 0,
  width = 1,
  height = 1,
  depth = 1,
  castShadow = false,
  receiveShadow = true,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  name = ""
}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.position.set(x, y + height * 0.5, z);
  mesh.rotation.set(rotationX, rotationY, rotationZ);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
};

const cylinder = ({
  parent,
  material,
  x = 0,
  y = 0,
  z = 0,
  radiusTop = 0.4,
  radiusBottom = 0.5,
  height = 1,
  segments = 6,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  castShadow = true,
  receiveShadow = true,
  name = ""
}) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false), material);
  mesh.name = name;
  mesh.position.set(x, y + height * 0.5, z);
  mesh.rotation.set(rotationX, rotationY, rotationZ);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
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

const createFoliageCluster = ({ parent, material, x, y, z, radius = 1.5, squash = 0.85, rotationY = 0 }) => {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(1, squash, 1);
  mesh.rotation.set(0.08, rotationY, -0.04);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

const addRoot = ({ parent, material, x, z, rotationY, length = 1.4, scale = 1 }) => {
  const root = cylinder({
    parent,
    material,
    x,
    y: 0.08,
    z,
    radiusTop: 0.08 * scale,
    radiusBottom: 0.25 * scale,
    height: length,
    segments: 5,
    rotationX: Math.PI / 2,
    rotationY,
    castShadow: true
  });
  root.position.y = 0.16;
  return root;
};

export const createEnvironmentMaterials = (textures) => ({
  grass: createPixelMaterial(textures.grass),
  path: createPixelMaterial(textures.path),
  stone: createPixelMaterial(textures.stone),
  stoneDark: createPixelMaterial(textures.stone, { color: 0x66726d }),
  mossStone: createPixelMaterial(textures.stone, { color: 0x78906f }),
  shore: createPixelMaterial(textures.shore),
  wall: createPixelMaterial(textures.wall),
  wallWarm: createPixelMaterial(textures.wall, { color: 0xffe7b8 }),
  roof: createPixelMaterial(textures.roof, { side: THREE.DoubleSide }),
  roofBlue: createPixelMaterial(textures.roof, { color: 0x718ca9, side: THREE.DoubleSide }),
  wood: createPixelMaterial(textures.wood),
  darkWood: createPixelMaterial(textures.wood, { color: 0x68442f }),
  bark: createPixelMaterial(textures.bark),
  barkDark: createPixelMaterial(textures.bark, { color: 0x76533f }),
  leafA: createPixelMaterial(textures.grass, { color: 0x4f9850 }),
  leafB: createPixelMaterial(textures.grass, { color: 0x3f8248 }),
  leafC: createPixelMaterial(textures.grass, { color: 0x6bab58 }),
  leafLuminal: createPixelMaterial(textures.grass, { color: 0x58a978, emissive: 0x123c32, emissiveIntensity: 0.22 }),
  tallGrass: createPixelMaterial(textures.tallGrass, { transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }),
  flower: createPixelMaterial(textures.flower, { transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }),
  sign: createPixelMaterial(textures.sign),
  water: textures.waterFrames.map((texture) => createPixelMaterial(texture, { side: THREE.DoubleSide })),
  window: new THREE.MeshLambertMaterial({ color: 0x86d9d7, emissive: 0x17444a, emissiveIntensity: 0.48, flatShading: true }),
  windowFrame: new THREE.MeshLambertMaterial({ color: 0x5b3d2b, flatShading: true }),
  door: new THREE.MeshLambertMaterial({ color: 0x70462e, flatShading: true }),
  chimney: new THREE.MeshLambertMaterial({ color: 0x6c716c, flatShading: true }),
  metal: new THREE.MeshLambertMaterial({ color: 0xb0a77f, flatShading: true }),
  crystal: new THREE.MeshLambertMaterial({ color: 0x66ded0, emissive: 0x1a8179, emissiveIntensity: 0.72, flatShading: true }),
  crystalBright: new THREE.MeshBasicMaterial({ color: 0xb9fff0 }),
  rune: new THREE.MeshBasicMaterial({ color: 0xa8ffe0 }),
  flowerYellow: new THREE.MeshLambertMaterial({ color: 0xf0c959, flatShading: true }),
  flowerBlue: new THREE.MeshLambertMaterial({ color: 0x79a9e6, flatShading: true }),
  stem: new THREE.MeshLambertMaterial({ color: 0x3f7f43, flatShading: true })
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
  group.rotation.y = [0.08, 0.42, -0.24, 0.18][variant % 4];
  parent.add(group);

  const configs = [
    { height: 3.6, trunk: 0.48, material: materials.leafA },
    { height: 4.25, trunk: 0.58, material: materials.leafB },
    { height: 4.6, trunk: 0.72, material: materials.leafC },
    { height: 4.35, trunk: 0.62, material: materials.leafLuminal }
  ];
  const config = configs[variant % configs.length];

  cylinder({
    parent: group,
    material: variant === 2 ? materials.barkDark : materials.bark,
    radiusTop: config.trunk * 0.68 * scale,
    radiusBottom: config.trunk * scale,
    height: config.height * scale,
    segments: 6,
    castShadow: true,
    name: "tree-trunk"
  });

  const branchSpecs = variant === 0
    ? [[-.55, 2.8, .1, .95, -.7], [.5, 3.05, -.2, .9, .72]]
    : variant === 1
      ? [[-.7, 3.05, .2, 1.2, -.82], [.7, 3.3, -.15, 1.05, .86], [.1, 3.65, .5, .8, .15]]
      : variant === 2
        ? [[-.85, 3.1, .15, 1.35, -.95], [.85, 3.4, -.2, 1.25, .92], [-.25, 3.85, .55, 1.0, -.3]]
        : [[-.65, 3.15, .15, 1.15, -.78], [.7, 3.4, -.2, 1.1, .82], [0, 3.8, .55, .9, 0]];

  branchSpecs.forEach(([bx, by, bz, length, angle]) => {
    cylinder({
      parent: group,
      material: materials.bark,
      x: bx * scale,
      y: by * scale,
      z: bz * scale,
      radiusTop: .1 * scale,
      radiusBottom: .2 * scale,
      height: length * scale,
      segments: 5,
      rotationZ: angle,
      castShadow: true
    });
  });

  const crownLayouts = [
    [[0, 4.15, 0, 1.65], [-1.05, 4.35, .1, 1.15], [1.0, 4.45, -.18, 1.2], [.15, 5.15, .05, 1.05]],
    [[0, 4.75, 0, 1.8], [-1.25, 4.8, .18, 1.25], [1.15, 5.0, -.2, 1.35], [-.25, 5.85, .1, 1.12], [.75, 5.65, .3, .95]],
    [[0, 5.0, 0, 2.0], [-1.35, 5.0, .25, 1.35], [1.3, 5.2, -.25, 1.4], [-.55, 6.1, .1, 1.15], [.75, 6.0, .2, 1.1]],
    [[0, 4.95, 0, 1.82], [-1.2, 5.0, .2, 1.2], [1.2, 5.1, -.2, 1.25], [0, 6.0, .05, 1.15], [.65, 5.7, .45, .95]]
  ];

  crownLayouts[variant % 4].forEach(([cx, cy, cz, radius], index) => {
    const material = index % 3 === 0 ? config.material : index % 3 === 1 ? materials.leafB : materials.leafC;
    createFoliageCluster({
      parent: group,
      material,
      x: cx * scale,
      y: cy * scale,
      z: cz * scale,
      radius: radius * scale,
      squash: .82 + (index % 2) * .08,
      rotationY: index * .53
    });
  });

  const rootCount = variant === 2 ? 5 : 3;
  for (let index = 0; index < rootCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rootCount + variant * .2;
    addRoot({
      parent: group,
      material: materials.barkDark,
      x: Math.cos(angle) * .25 * scale,
      z: Math.sin(angle) * .25 * scale,
      rotationY: -angle,
      length: (variant === 2 ? 1.8 : 1.25) * scale,
      scale
    });
  }

  if (variant === 2) {
    [[-.48, .85, .45], [.42, 1.15, .5], [-.55, 1.55, .34]].forEach(([mx, my, size], index) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(size * .55, size, size * .25, 6), index % 2 ? materials.flowerYellow : materials.wallWarm);
      cap.position.set(mx * scale, my * scale, .48 * scale);
      cap.rotation.z = Math.PI / 2;
      cap.castShadow = true;
      group.add(cap);
    });
  }

  if (variant === 3) {
    [[-.75, 3.9, .4], [.72, 4.25, -.3], [0, 5.75, .25]].forEach(([cx, cy, cz], index) => {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.24 * scale, 0), materials.crystal);
      crystal.position.set(cx * scale, cy * scale, cz * scale);
      crystal.scale.y = 1.45;
      crystal.rotation.y = index * .8;
      crystal.castShadow = true;
      group.add(crystal);
    });
  }

  return group;
};

export const createHouse = ({ parent, materials, x, z, accent = "red" }) => {
  const group = new THREE.Group();
  group.name = `BosqueLuminalHouse-${accent}`;
  group.position.set(x, 0, z);
  parent.add(group);

  const roofMaterial = accent === "blue" ? materials.roofBlue : materials.roof;
  const wallMaterial = accent === "blue" ? materials.wallWarm : materials.wall;

  box({ parent: group, material: materials.stoneDark, width: 7.5, height: .55, depth: 5.9, y: 0, castShadow: true });
  box({ parent: group, material: wallMaterial, width: 7.2, height: 4.35, depth: 5.6, y: .48, castShadow: true });

  [-3.25, 3.25].forEach((beamX) => box({ parent: group, material: materials.darkWood, x: beamX, y: .55, z: 2.87, width: .32, height: 4.1, depth: .25, castShadow: true }));
  box({ parent: group, material: materials.darkWood, x: 0, y: 3.85, z: 2.88, width: 6.8, height: .28, depth: .25, castShadow: true });

  const roof = new THREE.Mesh(createRoofGeometry(8.35, 2.45, 6.7), roofMaterial);
  roof.position.y = 4.75;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  box({ parent: group, material: materials.door, x: 0, y: .55, z: 2.88, width: 1.55, height: 2.55, depth: .18, castShadow: true });
  box({ parent: group, material: materials.metal, x: .48, y: 1.65, z: 3.0, width: .12, height: .12, depth: .08 });

  [-2.2, 2.2].forEach((windowX) => {
    box({ parent: group, material: materials.windowFrame, x: windowX, y: 1.75, z: 2.9, width: 1.45, height: 1.55, depth: .2, castShadow: true });
    box({ parent: group, material: materials.window, x: windowX, y: 1.9, z: 3.02, width: 1.05, height: 1.12, depth: .08 });
    box({ parent: group, material: materials.windowFrame, x: windowX, y: 2.35, z: 3.08, width: 1.05, height: .1, depth: .05 });
    box({ parent: group, material: materials.windowFrame, x: windowX, y: 1.9, z: 3.08, width: .1, height: 1.12, depth: .05 });
  });

  box({ parent: group, material: materials.chimney, x: 2.35, y: 4.6, z: -1.25, width: .8, height: 2.35, depth: .8, castShadow: true });
  box({ parent: group, material: materials.darkWood, x: 0, y: .12, z: 3.48, width: 2.9, height: .22, depth: 1.15, castShadow: true });

  [-2.2, 2.2].forEach((flowerX, index) => {
    box({ parent: group, material: materials.darkWood, x: flowerX, y: 1.3, z: 3.15, width: 1.45, height: .28, depth: .42, castShadow: true });
    for (let offset = -1; offset <= 1; offset += 1) {
      cylinder({ parent: group, material: materials.stem, x: flowerX + offset * .32, y: 1.55, z: 3.2, radiusTop: .035, radiusBottom: .045, height: .45, segments: 4, castShadow: false });
      const bloom = new THREE.Mesh(new THREE.OctahedronGeometry(.13, 0), index ? materials.flowerBlue : materials.flowerYellow);
      bloom.position.set(flowerX + offset * .32, 2.04, 3.2);
      group.add(bloom);
    }
  });

  return group;
};

export const createFenceSegment = ({ parent, materials, x, z, length = 4, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);

  [-length / 2, 0, length / 2].forEach((px, index) => {
    cylinder({
      parent: group,
      material: index === 1 ? materials.bark : materials.darkWood,
      x: px,
      radiusTop: .12,
      radiusBottom: .18,
      height: 1.7 + (index % 2) * .12,
      segments: 5,
      castShadow: true
    });
  });
  [0.58, 1.18].forEach((height, index) => box({
    parent: group,
    material: index ? materials.wood : materials.darkWood,
    y: height,
    width: length + .45,
    height: .22,
    depth: .24,
    rotationZ: index ? .025 : -.018,
    castShadow: true
  }));
  return group;
};

export const createSign = ({ parent, materials, x, z, rotationY = 0 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);
  cylinder({ parent: group, material: materials.darkWood, radiusTop: .1, radiusBottom: .15, height: 1.95, segments: 5, castShadow: true });
  box({ parent: group, material: materials.sign, y: 1.05, width: 2.0, height: 1.1, depth: .2, rotationZ: -.025, castShadow: true });
  box({ parent: group, material: materials.metal, x: -.55, y: 1.46, z: .12, width: .1, height: .1, depth: .06 });
  box({ parent: group, material: materials.metal, x: .55, y: 1.46, z: .12, width: .1, height: .1, depth: .06 });
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
      const phase = (row * 3 + column * 5) % 4;
      for (let blade = 0; blade < 3; blade += 1) {
        const angle = phase * .35 + blade * 2.05;
        box({
          parent: group,
          material: blade === 1 ? materials.leafC : materials.leafA,
          x: px + Math.cos(angle) * .18,
          y: 0,
          z: pz + Math.sin(angle) * .18,
          width: .11,
          height: 1.15 + blade * .18,
          depth: .08,
          rotationX: Math.sin(angle) * .13,
          rotationZ: Math.cos(angle) * .13,
          castShadow: false
        });
      }
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
    cylinder({ parent: group, material: materials.stem, x: px, z: pz, radiusTop: .025, radiusBottom: .035, height: .62 + index * .04, segments: 4, castShadow: false });
    const bloom = new THREE.Mesh(new THREE.OctahedronGeometry(.14 + (index % 2) * .03, 0), index % 2 ? materials.flowerBlue : materials.flowerYellow);
    bloom.position.set(px, .72 + index * .04, pz);
    bloom.rotation.y = index * .7;
    group.add(bloom);
  });
  return group;
};

export const createRock = ({ parent, materials, x, z, scale = 1 }) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(.72 * scale, 0), materials.stone);
  mesh.position.set(0, .42 * scale, 0);
  mesh.scale.set(1.15, .72, .9);
  mesh.rotation.set(.1, x * .13 + z * .07, -.08);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if ((Math.abs(Math.round(x + z)) % 2) === 0) {
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(.28 * scale, 0), materials.mossStone);
    moss.position.set(-.18 * scale, .78 * scale, .05 * scale);
    moss.scale.set(1.1, .28, .8);
    group.add(moss);
  }
  return group;
};

export const createRootGate = ({ parent, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "BosqueLuminalRootGate";
  group.position.set(x, 0, z);
  parent.add(group);

  const pillarBlocks = [
    [-3.15, 0, 1.5, 1.2], [-3.05, 1.15, 1.6, 1.35], [-2.85, 2.45, 1.55, 1.3],
    [3.15, 0, 1.5, 1.2], [3.05, 1.15, 1.6, 1.35], [2.85, 2.45, 1.55, 1.3]
  ];
  pillarBlocks.forEach(([px, py, width, height], index) => box({
    parent: group,
    material: index % 3 === 1 ? materials.mossStone : materials.stone,
    x: px,
    y: py,
    width,
    height,
    depth: 1.7,
    rotationY: index < 3 ? .05 : -.05,
    castShadow: true
  }));

  [-2.0, -.7, .7, 2.0].forEach((px, index) => box({
    parent: group,
    material: index % 2 ? materials.mossStone : materials.stone,
    x: px,
    y: 4.1 + Math.abs(px) * .12,
    width: 1.55,
    height: 1.15,
    depth: 1.7,
    rotationZ: px * -.04,
    castShadow: true
  }));

  const rootSpecs = [
    [-2.6, .45, .55, 5.6, -.32], [-1.35, .5, .7, 5.2, .24], [0, .45, .5, 5.8, -.12], [1.35, .5, .68, 5.25, -.24], [2.55, .45, .55, 5.55, .34]
  ];
  rootSpecs.forEach(([rx, ry, rz, height, bend], index) => {
    const root = cylinder({
      parent: group,
      material: index % 2 ? materials.barkDark : materials.bark,
      x: rx,
      y: ry,
      z: rz,
      radiusTop: .18,
      radiusBottom: .34,
      height,
      segments: 6,
      rotationZ: bend,
      castShadow: true
    });
    root.rotation.y = index * .28;
  });

  [-2.25, 0, 2.25].forEach((px, index) => {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), materials.crystal);
    crystal.position.set(px, 3.35 + (index % 2) * .55, .95);
    crystal.scale.y = 1.55;
    crystal.rotation.y = index * .65;
    crystal.castShadow = true;
    group.add(crystal);
  });

  return group;
};

export const createPuzzleMarker = ({ parent, materials, x, z }) => {
  const group = new THREE.Group();
  group.name = "BosqueLuminalPuzzleMarker";
  group.position.set(x, 0, z);
  parent.add(group);

  box({ parent: group, material: materials.stoneDark, width: 3.5, height: .45, depth: 3.5, y: 0, castShadow: true });
  box({ parent: group, material: materials.stone, width: 2.7, height: .55, depth: 2.7, y: .42, castShadow: true, rotationY: .08 });
  box({ parent: group, material: materials.mossStone, width: 1.9, height: .65, depth: 1.9, y: .95, castShadow: true, rotationY: -.1 });

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const rune = box({
      parent: group,
      material: materials.rune,
      x: Math.cos(angle) * 1.15,
      y: 1.58,
      z: Math.sin(angle) * 1.15,
      width: .16,
      height: .05,
      depth: .42,
      rotationY: -angle,
      receiveShadow: false
    });
    rune.renderOrder = 4;
  }

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.62, 0), materials.crystal);
  crystal.position.set(0, 2.1, 0);
  crystal.scale.y = 1.55;
  crystal.castShadow = true;
  group.add(crystal);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.25, 0), materials.crystalBright);
  core.position.set(0, 2.1, 0);
  core.scale.y = 1.65;
  group.add(core);

  return { group, crystal, core };
};

export const createWaterSurface = ({ parent, engine, materials, cells }) => {
  const geometry = new THREE.PlaneGeometry(1.92, 1.92);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geometry, materials.water[0], cells.length);
  mesh.name = "BosqueLuminalWater";
  mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  cells.forEach(([x, z], index) => {
    matrix.makeTranslation(x, -.035, z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  let previousFrame = -1;
  engine.addUpdater((delta, elapsed) => {
    const frame = Math.floor(elapsed * 2.5) % materials.water.length;
    if (frame === previousFrame) return;
    previousFrame = frame;
    mesh.material = materials.water[frame];
  });
  return mesh;
};

export const disposeEnvironmentMaterials = (materials) => {
  const disposed = new Set();
  const disposeMaterial = (material) => {
    if (!material || disposed.has(material)) return;
    disposed.add(material);
    material.dispose?.();
  };
  Object.values(materials).forEach((value) => {
    if (Array.isArray(value)) value.forEach(disposeMaterial);
    else disposeMaterial(value);
  });
};
