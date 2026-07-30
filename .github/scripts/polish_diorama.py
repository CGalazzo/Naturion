from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: esperado 1 marcador, encontrado {count}")
    return text.replace(old, new, 1)

# Evita que a confirmação da exploração lateral antiga permaneça aberta após a viagem.
index_path = Path("index.html")
index = index_path.read_text(encoding="utf-8")
index = replace_once(
    index,
    '''        requestStageEntry: async () => {
          if (!firstWorldDestinationReached) await travelToFirstWorldDestination();
          return true;
        },''',
    '''        requestStageEntry: async () => {
          if (!firstWorldDestinationReached) await travelToFirstWorldDestination();
          echoEntryConfirm.hidden = true;
          openMapExploring = false;
          return true;
        },''',
    "limpeza da confirmação antiga"
)
index_path.write_text(index, encoding="utf-8")

# Movimento relativo à tela/câmera e orientação lateral coerente.
player_path = Path("src/diorama/player-controller.js")
player = player_path.read_text(encoding="utf-8")
player = replace_once(
    player,
    '''    const speed = movement.running ? this.runSpeed : this.walkSpeed;
    this.desiredVelocity.set(movement.x * speed, 0, movement.z * speed);''',
    '''    const speed = movement.running ? this.runSpeed : this.walkSpeed;
    /* Converte os eixos da tela para os eixos do mundo isométrico. */
    const worldX = (movement.x + movement.z) * Math.SQRT1_2;
    const worldZ = (movement.z - movement.x) * Math.SQRT1_2;
    this.desiredVelocity.set(worldX * speed, 0, worldZ * speed);''',
    "movimento relativo à câmera"
)
player = replace_once(
    player,
    '''    if (Math.abs(this.velocity.x) > 0.15) this.facing = this.velocity.x >= 0 ? 1 : -1;
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * this.facing;

    const stride = this.state === "running" ? 12.5 : 8.2;''',
    '''    if (Math.abs(movement.x) > 0.05) this.facing = movement.x >= 0 ? 1 : -1;
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * this.facing;

    const stride = this.state === "running" ? 12.5 : 8.2;''',
    "direção visual"
)
player = replace_once(
    player,
    '''    this.sprite.material.rotation = this.state === "idle" ? Math.sin(elapsed * 1.8) * 0.008 : Math.sin(phase) * (this.state === "running" ? 0.045 : 0.028);''',
    '''    const directionalLean = movement.x * (this.state === "running" ? 0.024 : 0.014);
    this.sprite.material.rotation = this.state === "idle"
      ? Math.sin(elapsed * 1.8) * 0.008
      : Math.sin(phase) * (this.state === "running" ? 0.045 : 0.028) + directionalLean;''',
    "inclinação direcional"
)
player_path.write_text(player, encoding="utf-8")

# Portão realmente bloqueia o único conector para a parte final.
stage_path = Path("src/diorama/stages/bosque-clareira.js")
stage = stage_path.read_text(encoding="utf-8")
stage = replace_once(
    stage,
    '    blockedGate: { x: 16, y: 2.8, z: 9 },',
    '    blockedGate: { x: 11.5, y: 2.4, z: 8.8 },',
    "foco do portão"
)
stage = replace_once(
    stage,
    '''  const gate = new THREE.Group();
  const gateY = stage.getHeightAt(16, 9);''',
    '''  const gate = new THREE.Group();
  const gateX = 11.5;
  const gateZ = 8.8;
  const gateY = stage.getHeightAt(gateX, gateZ);''',
    "coordenadas do portão"
)
stage = replace_once(
    stage,
    '''  gate.position.set(16, gateY, 9);
  gate.rotation.y = -0.16;
  root.add(gate);
  stage.obstacles.push({ type: "rect", minX: 13.2, maxX: 18.8, minZ: 8.1, maxZ: 10.2 });''',
    '''  gate.position.set(gateX, gateY, gateZ);
  root.add(gate);
  stage.obstacles.push({ type: "rect", minX: 8.35, maxX: 14.65, minZ: 7.75, maxZ: 9.95 });''',
    "bloqueio funcional do portão"
)
stage_path.write_text(stage, encoding="utf-8")

# Pequenos refinamentos do ciclo da tela desktop.
main_path = Path("src/diorama/main.js")
main = main_path.read_text(encoding="utf-8")
main = replace_once(
    main,
    '''      window.setTimeout(() => engine.returnToPlayer(), 1800);''',
    '''      window.setTimeout(() => {
        engine.returnToPlayer();
        objective.textContent = bosqueClareiraStage.objective;
      }, 1800);''',
    "restauração do objetivo"
)
main = replace_once(
    main,
    '''  active = false;
  input.reset();
  engine.stop();
  screen.hidden = true;''',
    '''  active = false;
  input.reset();
  teamPanel.hidden = true;
  setPrompt(null);
  engine.stop();
  screen.hidden = true;''',
    "limpeza ao voltar ao mapa"
)
main = replace_once(
    main,
    '''  bridge()?.prepareStageEntry?.();
  worldMap.hidden = true;
  screen.hidden = false;''',
    '''  bridge()?.prepareStageEntry?.();
  worldMap.hidden = true;
  teamPanel.hidden = true;
  screen.hidden = false;''',
    "limpeza ao entrar"
)
main = replace_once(
    main,
    '''teamPanel?.addEventListener("click", (event) => {
  if (event.target === teamPanel) {
    teamPanel.hidden = true;
    viewport.focus();
  }
});
window.addEventListener("naturion:open-diorama", enterDiorama);''',
    '''teamPanel?.addEventListener("click", (event) => {
  if (event.target === teamPanel) {
    teamPanel.hidden = true;
    viewport.focus();
  }
});
window.addEventListener("keydown", (event) => {
  if (!active || teamPanel.hidden || event.code !== "Escape") return;
  event.preventDefault();
  teamPanel.hidden = true;
  viewport.focus();
});
window.addEventListener("naturion:open-diorama", enterDiorama);''',
    "escape do painel de equipe"
)
main_path.write_text(main, encoding="utf-8")

# Usa o build minificado da mesma versão fixada.
engine_path = Path("src/diorama/engine.js")
engine = engine_path.read_text(encoding="utf-8")
engine = replace_once(
    engine,
    'import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";',
    'import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";',
    "import minificado do Three.js"
)
engine_path.write_text(engine, encoding="utf-8")
