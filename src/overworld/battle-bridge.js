export class OverworldBattleBridge {
  constructor({ mapId, sceneImage }) {
    this.mapId = mapId;
    this.sceneImage = sceneImage;
    this.busy = false;
  }

  async start(entity) {
    if (this.busy) return { outcome: "busy" };
    const bridge = window.NaturionOverworldBridge;
    if (!bridge?.startBattle) {
      window.dispatchEvent(new CustomEvent("naturion:overworld-battle-unavailable", { detail: { entity } }));
      return { outcome: "unavailable" };
    }
    this.busy = true;
    try {
      return await bridge.startBattle({
        stageId: this.mapId,
        encounterId: entity.id,
        formId: entity.form.id,
        level: entity.level,
        scene: this.sceneImage
      });
    } finally {
      this.busy = false;
    }
  }
}
