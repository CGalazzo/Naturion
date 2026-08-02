// Primeira área: somente formas iniciais, distribuídas sem lotar a paisagem.
// As rotas terrestres respeitam os níveis, árvores, paredes e água; voadores
// patrulham acima da vegetação com movimento próprio de asas.
export const clareiraDosEcosNaturions = Object.freeze([
  Object.freeze({
    id: "escaruli-clareira-oeste",
    formId: "escaruli",
    level: 3,
    behavior: "wander",
    position: Object.freeze({ x: -32.7, z: 14.1 }),
    radius: 2.7,
    speed: .72,
    scale: 2.05
  }),
  Object.freeze({
    id: "lumpirim-lago-oeste",
    formId: "lumpirim",
    level: 4,
    behavior: "patrol",
    flying: true,
    altitude: 2.45,
    position: Object.freeze({ x: -25.2, z: -10.1 }),
    path: Object.freeze([
      Object.freeze({ x: -25.2, z: -10.1 }),
      Object.freeze({ x: -21.8, z: -12.8 }),
      Object.freeze({ x: -18.7, z: -9.8 }),
      Object.freeze({ x: -22.6, z: -6.8 })
    ]),
    speed: 1.05,
    scale: 1.9
  }),
  Object.freeze({
    id: "failino-clareira-leste",
    formId: "failino",
    level: 5,
    behavior: "wander",
    position: Object.freeze({ x: 31.9, z: -7.7 }),
    radius: 2.5,
    speed: .92,
    scale: 2.15
  }),
  Object.freeze({
    id: "hambrio-trilha-sul",
    formId: "hambrio",
    level: 5,
    behavior: "wander",
    position: Object.freeze({ x: 2.1, z: 20.8 }),
    radius: 2.35,
    speed: .78,
    scale: 2.1
  }),
  Object.freeze({
    id: "canumi-trilha-norte",
    formId: "canumi",
    level: 4,
    behavior: "wander",
    position: Object.freeze({ x: -1.2, z: -28.7 }),
    radius: 2.4,
    speed: .86,
    scale: 2.12
  }),
  Object.freeze({
    id: "zumbel-ruinas-centrais",
    formId: "zumbel",
    level: 5,
    behavior: "patrol",
    flying: true,
    altitude: 2.65,
    position: Object.freeze({ x: 18.2, z: -16.1 }),
    path: Object.freeze([
      Object.freeze({ x: 18.2, z: -16.1 }),
      Object.freeze({ x: 23.2, z: -14.2 }),
      Object.freeze({ x: 26.1, z: -10.6 }),
      Object.freeze({ x: 20.6, z: -11.8 })
    ]),
    speed: 1.12,
    scale: 1.92
  })
]);
