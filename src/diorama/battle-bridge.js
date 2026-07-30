export class BattleBridge {
  constructor({ stageId, sceneImage }) {
    this.stageId = stageId;
    this.sceneImage = sceneImage;
    this.busy = false;
  }

  async start(entity) {
    if (this.busy) return { outcome: "busy" };
    const legacy = window.NaturionDioramaBridge;
    if (!legacy?.startBattle) {
      window.dispatchEvent(new CustomEvent("naturion:diorama-battle-unavailable", { detail: { entity } }));
      return { outcome: "unavailable" };
    }
    this.busy = true;
    try {
      return await legacy.startBattle({
        stageId: this.stageId,
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
