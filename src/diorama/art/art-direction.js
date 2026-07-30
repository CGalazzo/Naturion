export const ART_DIRECTION = Object.freeze({
  palette: Object.freeze({
    skyTop: 0x244f43,
    skyBottom: 0x102f2a,
    fog: 0x315f50,
    sun: 0xffd98a,
    sunHighlight: 0xfff2ba,
    fill: 0x75b9ad,
    shadow: 0x173b35,
    deepShadow: 0x0d2926,
    grass: [0x315f3d, 0x3f7a42, 0x5c9a49, 0x78b45a, 0xa3cf72],
    grassWarm: [0x456c3c, 0x618a45, 0x7fab53, 0xa6c96c],
    earth: [0x432f28, 0x654532, 0x8b6240, 0xb28354],
    path: [0x735437, 0x9b7348, 0xc2985d, 0xddbd78],
    wetSoil: [0x2f3c34, 0x485044, 0x64624e, 0x7a7358],
    stone: [0x344943, 0x50645a, 0x718276, 0x99a58f],
    mossStone: [0x354c3e, 0x4f6950, 0x70885a, 0x91a96a],
    bark: [0x3d2b27, 0x654132, 0x8b5c3e, 0xb37a4c],
    leaf: [0x214939, 0x2e6540, 0x478249, 0x68a653, 0x8dc766],
    leafMagic: [0x1e4d48, 0x2f7362, 0x4da58a, 0x82d3ac],
    water: [0x174f60, 0x24798a, 0x3aa7ab, 0x75d3c5, 0xc2f2d9],
    gold: [0x8b642b, 0xbf8d38, 0xe7bd5b, 0xffe59a],
    crystal: [0x1c6770, 0x2e9e9d, 0x63d6c4, 0xc3ffdf],
    outline: 0x132b28
  }),
  rendering: Object.freeze({
    virtualHeights: [270, 360, 450],
    smallMaxHeight: 760,
    mediumMaxHeight: 1220,
    cameraSnapFraction: 0.5,
    colorLevels: 4,
    pixelDensity: 1,
    maxDetailDensity: 0.68
  }),
  lighting: Object.freeze({
    hemisphereIntensity: 0.94,
    sunIntensity: 1.72,
    fillIntensity: 0.34,
    bounceIntensity: 0.16,
    fogNear: 64,
    fogFar: 132,
    shadowMapSize: 1024
  }),
  scale: Object.freeze({
    tree: 1,
    character: 1,
    naturion: 1,
    prop: 1
  }),
  outline: Object.freeze({
    enabled: true,
    characterScale: 1.035,
    importantPropScale: 1.018,
    opacity: 0.88
  }),
  atmosphere: Object.freeze({
    pollenCount: 38,
    foregroundLeaves: 8,
    lightShafts: 5,
    mistLayers: 4
  })
});

export const VISUAL_BIBLE = Object.freeze({
  references: Object.freeze([
    "assets/start/naturion-voxel-valley.webp",
    "assets/start/naturion-logo.png",
    "assets/selection/forest-gate.webp",
    "assets/selection/hero-male.webp",
    "assets/selection/hero-female.webp",
    "assets/story/research-outpost.webp",
    "assets/map/bosque-luminal.webp"
  ]),
  principles: Object.freeze([
    "silhuetas orgânicas e arredondadas",
    "luz principal quente e sombras verde-azuladas",
    "paletas pequenas por material",
    "detalhes agrupados em clusters legíveis",
    "profundidade em primeiro plano, área jogável, segundo plano e atmosfera",
    "pixelização estável sem filtros de suavização"
  ])
});

export const chooseVirtualResolution = (width, height) => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const aspect = safeWidth / safeHeight;
  const targetHeight = safeHeight <= ART_DIRECTION.rendering.smallMaxHeight
    ? ART_DIRECTION.rendering.virtualHeights[0]
    : safeHeight <= ART_DIRECTION.rendering.mediumMaxHeight
      ? ART_DIRECTION.rendering.virtualHeights[1]
      : ART_DIRECTION.rendering.virtualHeights[2];
  const targetWidth = Math.max(480, Math.round((targetHeight * aspect) / 2) * 2);
  return { width: targetWidth, height: targetHeight };
};
