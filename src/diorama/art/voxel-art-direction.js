export const ART_DIRECTION = Object.freeze({
  palette: Object.freeze({
    skyTop: 0x397260,
    skyBottom: 0x173e37,
    fog: 0x396c59,
    sun: 0xffd58a,
    sunHighlight: 0xfff1bf,
    fill: 0x79b9b0,
    shadow: 0x173f3b,
    deepShadow: 0x0c2826,
    grass: [0x2f6038, 0x407b42, 0x58a04b, 0x79bd5d, 0xa4d578],
    grassWarm: [0x3c6537, 0x5c8844, 0x7dab52, 0xa8cf70],
    earth: [0x3b2a25, 0x62422f, 0x8c6040, 0xb98455],
    path: [0x6c4c31, 0x997047, 0xc3945b, 0xe0bb78],
    wetSoil: [0x2e3932, 0x465047, 0x646655, 0x81775d],
    stone: [0x344843, 0x52655c, 0x73857a, 0xa0ad98],
    mossStone: [0x324a3b, 0x506c4c, 0x72905b, 0x9bb270],
    bark: [0x392824, 0x61402f, 0x8a5b3c, 0xb77949],
    leaf: [0x1e4935, 0x2d663d, 0x438249, 0x64a853, 0x91cc6a],
    leafMagic: [0x1a4948, 0x2b6d60, 0x47a286, 0x80d5aa],
    water: [0x164f61, 0x24798b, 0x3ba8ad, 0x75d6c8, 0xc5f5df],
    gold: [0x80602b, 0xb88939, 0xe4b95a, 0xffe39b],
    crystal: [0x176673, 0x289b9f, 0x5bd6c7, 0xc4ffe5],
    outline: 0x102b29
  }),
  rendering: Object.freeze({
    virtualHeights: [270, 360, 450],
    smallMaxHeight: 760,
    mediumMaxHeight: 1220,
    cameraSnapFraction: 0.5,
    pixelDensity: 1
  }),
  lighting: Object.freeze({
    hemisphereIntensity: 0.78,
    sunIntensity: 1.62,
    fillIntensity: 0.27,
    bounceIntensity: 0.1,
    fogNear: 67,
    fogFar: 137,
    shadowMapSize: 1024
  }),
  scale: Object.freeze({ tree: 1, character: 1, naturion: 1, prop: 1 }),
  outline: Object.freeze({ enabled: true, characterScale: 1.025, importantPropScale: 1.012, opacity: 0.82 }),
  atmosphere: Object.freeze({ pollenCount: 28, foregroundLeaves: 7, lightShafts: 4, mistLayers: 4 })
});

export const VISUAL_BIBLE = Object.freeze({
  principles: Object.freeze([
    "mundo voxel construído em blocos com silhuetas autorais",
    "texturas pixel art desenhadas sem ruído aleatório",
    "luz quente superior esquerda e sombras frias",
    "composição por áreas e pontos focais",
    "profundidade em camadas sem interferir na jogabilidade",
    "pixels nítidos e de escala consistente"
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
  return { width: Math.max(480, Math.round((targetHeight * aspect) / 2) * 2), height: targetHeight };
};
