const bridge = window.NaturionOverworldBridge;

if (bridge?.getPlayer && bridge?.saveEchoMapState) {
  const originalSave = bridge.saveEchoMapState.bind(bridge);
  let returnToWorldScheduled = false;

  bridge.saveEchoMapState = (payload = {}) => {
    const result = originalSave({
      ...payload,
      idleExpedition: payload.idleExpedition
        ? { version: 1, ...payload.idleExpedition }
        : payload.idleExpedition
    });

    // Ao concluir o Puzzle 1, a tela do desafio fecha primeiro e, em seguida,
    // o jogador retorna automaticamente ao mapa-múndi com o save já gravado.
    if (
      !returnToWorldScheduled
      && payload.puzzles?.echoesSolved
      && payload.idleExpedition?.completed
    ) {
      returnToWorldScheduled = true;
      window.setTimeout(() => {
        document.querySelector("#echoOverworldScreen [data-action='map']")?.click();
        returnToWorldScheduled = false;
      }, 2300);
    }

    return result;
  };

  const snapshot = bridge.getPlayer() || {};
  const progress = snapshot.echoOverworldProgress || {};
  const hasJourney = Boolean(snapshot.name || snapshot.starter || snapshot.journeyStarted);

  // Migra somente um save de jornada real. Isso evita criar um jogador vazio
  // enquanto a pessoa ainda está na tela inicial ou começando uma nova jornada.
  if (hasJourney && Number(progress.idleExpedition?.version) !== 1) {
    originalSave({
      idleExpedition: {
        version: 1,
        progress: 0,
        running: false,
        speed: 1,
        completedEncounterIds: [],
        battlesWon: 0,
        captures: 0,
        defeats: 0,
        puzzleUnlocked: false,
        completed: false,
        migratedAt: new Date().toISOString()
      },
      puzzles: {
        ...(progress.puzzles || {}),
        echoesSolved: false
      }
    });
  }
}

// Mantém sempre uma opção segura durante os instantes em que os controles
// reais da batalha automática estão bloqueados pelas animações.
if (!document.getElementById("idleAutoBattleGuard")) {
  const guard = document.createElement("button");
  guard.id = "idleAutoBattleGuard";
  guard.type = "button";
  guard.dataset.echoBattle = "basic";
  guard.tabIndex = -1;
  guard.setAttribute("aria-hidden", "true");
  Object.assign(guard.style, {
    position: "fixed",
    left: "-2px",
    top: "-2px",
    width: "1px",
    height: "1px",
    padding: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none"
  });
  document.body.append(guard);
}
