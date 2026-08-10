(function installNaturionTypeSystem(root) {
  "use strict";

  const TYPE_ROWS = [
    ["Água", ["Fogo", "Terra", "Pedra"], ["Planta", "Elétrico", "Veneno"]],
    ["Fogo", ["Planta", "Gelo", "Inseto"], ["Água", "Pedra", "Terra"]],
    ["Planta", ["Água", "Elétrico", "Terra"], ["Fogo", "Gelo", "Pedra", "Inseto"]],
    ["Elétrico", ["Voador", "Água", "Inseto"], ["Pedra", "Terra"]],
    ["Inseto", ["Terra", "Normal", "Planta"], ["Fogo", "Elétrico", "Gelo", "Lutador"]],
    ["Gelo", ["Planta", "Inseto", "Dragão"], ["Fogo", "Sombrio"]],
    ["Sombrio", ["Sangue", "Dragão"], ["Luz", "Normal"]],
    ["Luz", ["Sombrio", "Lutador"], ["Sangue", "Veneno", "Normal"]],
    ["Sangue", ["Luz", "Normal"], ["Sombrio"]],
    ["Terra", ["Elétrico", "Fogo"], ["Água", "Planta", "Inseto", "Veneno"]],
    ["Pedra", ["Voador", "Elétrico", "Dragão", "Veneno"], ["Água"]],
    ["Veneno", ["Luz", "Terra", "Água", "Lutador"], ["Lutador", "Pedra"]],
    ["Voador", ["Lutador", "Normal"], ["Elétrico", "Pedra", "Dragão"]],
    ["Lutador", ["Normal", "Inseto"], ["Voador", "Dragão", "Veneno", "Luz"]],
    ["Dragão", ["Voador", "Lutador"], ["Gelo", "Sombrio", "Pedra"]],
    ["Normal", ["Sombrio", "Luz"], ["Lutador", "Voador", "Sangue"]]
  ];

  const typeKey = (value) => String(value || "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const canonicalTypes = Object.freeze(Object.fromEntries(
    TYPE_ROWS.map(([type]) => [typeKey(type), type])
  ));

  const TYPE_CHART = Object.freeze(Object.fromEntries(
    TYPE_ROWS.map(([type, strongAgainst, weakAgainst]) => [
      type,
      Object.freeze({
        strongAgainst: Object.freeze([...strongAgainst]),
        weakAgainst: Object.freeze([...weakAgainst])
      })
    ])
  ));

  const canonicalType = (value) => canonicalTypes[typeKey(value)] || String(value || "").trim();

  const splitTypes = (value) => {
    const types = String(value || "")
      .split("/")
      .map(canonicalType)
      .filter(Boolean);
    return [...new Set(types)];
  };

  // Um golpe sempre possui um único tipo. Caso um formulário de Naturion com
  // dupla tipagem seja usado como origem, somente o primeiro tipo é adotado.
  const getPrimaryType = (value) => splitTypes(value)[0] || "Normal";

  const getSingleTypeMultiplier = (attackType, defenderType) => {
    const attack = canonicalType(attackType);
    const defender = canonicalType(defenderType);
    const row = TYPE_CHART[attack];
    if (!row || !defender) return 1;
    if (row.strongAgainst.includes(defender)) return 1.5;
    if (row.weakAgainst.includes(defender)) return .75;
    return 1;
  };

  const getTypeMultiplier = (attackType, defenderTypes) => {
    const singleAttackType = getPrimaryType(attackType);
    const targets = splitTypes(defenderTypes);
    if (!targets.length) return 1;
    return Number(targets.reduce(
      (total, defenderType) => total * getSingleTypeMultiplier(singleAttackType, defenderType),
      1
    ).toFixed(4));
  };

  const approximately = (value, expected) => Math.abs(value - expected) < .00001;

  const getEffectivenessMessage = (multiplier) => {
    if (approximately(multiplier, 2.25)) return "Extremamente efetivo!";
    if (approximately(multiplier, 1.5)) return "Super efetivo!";
    if (approximately(multiplier, .75)) return "Pouco efetivo...";
    if (approximately(multiplier, .5625)) return "Muito pouco efetivo...";
    // 1× e 1,125× foram definidos como resultados sem mensagem.
    return "";
  };

  const resolveTypedDamage = (baseDamage, attackType, defenderTypes) => {
    const safeBaseDamage = Math.max(0, Number(baseDamage) || 0);
    const resolvedAttackType = getPrimaryType(attackType);
    const multiplier = getTypeMultiplier(resolvedAttackType, defenderTypes);
    return Object.freeze({
      attackType: resolvedAttackType,
      defenderTypes: Object.freeze(splitTypes(defenderTypes)),
      baseDamage: safeBaseDamage,
      multiplier,
      damage: safeBaseDamage > 0 ? Math.max(1, Math.round(safeBaseDamage * multiplier)) : 0,
      message: getEffectivenessMessage(multiplier)
    });
  };

  const api = Object.freeze({
    TYPE_CHART,
    canonicalType,
    splitTypes,
    getPrimaryType,
    getSingleTypeMultiplier,
    getTypeMultiplier,
    getEffectivenessMessage,
    resolveTypedDamage
  });

  Object.defineProperty(root, "NaturionTypeSystem", {
    value: api,
    configurable: true,
    enumerable: false,
    writable: false
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
