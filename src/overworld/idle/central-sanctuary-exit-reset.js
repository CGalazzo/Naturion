const sanctuaryScreen = document.querySelector("#centralSanctuaryScreen");

if (sanctuaryScreen) {
  const bridge = () => window.NaturionEchoBridge || {};
  let wasVisible = !sanctuaryScreen.hidden;
  let exitedToWorldMap = false;

  const resetCurrentLevelProgress = () => {
    const api = bridge();
    const player = api.getPlayer?.();
    const saved = player?.centralSanctuaryProgress;
    if (!saved || typeof api.saveCentralSanctuaryState !== "function") return;

    api.saveCentralSanctuaryState({
      ...saved,
      progress: 0,
      running: false,
      completedEncounterIds: [],
      updatedAt: Date.now(),
    });
  };

  const resetAfterWorldMapExit = () => {
    exitedToWorldMap = true;
    queueMicrotask(resetCurrentLevelProgress);
  };

  const observer = new MutationObserver(() => {
    const visible = !sanctuaryScreen.hidden;
    if (wasVisible && !visible) resetAfterWorldMapExit();
    if (visible) exitedToWorldMap = false;
    wasVisible = visible;
  });

  observer.observe(sanctuaryScreen, {
    attributes: true,
    attributeFilter: ["hidden"],
  });

  window.addEventListener("beforeunload", () => {
    if (exitedToWorldMap && sanctuaryScreen.hidden) resetCurrentLevelProgress();
  });
}
