from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: esperado 1 marcador, encontrado {count}")
    return text.replace(old, new, 1)

index_path = Path("index.html")
index = index_path.read_text(encoding="utf-8")

index = replace_once(index, "  </style>\n</head>", "  </style>\n  <link rel=\"stylesheet\" href=\"styles/diorama.css\">\n</head>", "link do diorama")

old_destination = '''        <button
          class="world-destination world-first-destination locked"
          id="worldFirstDestination"
          type="button"
          aria-label="Clareira dos Ecos — conteúdo ainda não disponível"
          disabled
        >'''
new_destination = '''        <button
          class="world-destination world-first-destination unlocked"
          id="worldFirstDestination"
          type="button"
          data-world-destination="clareira-dos-ecos"
          aria-label="Viajar para a Clareira dos Ecos"
        >'''
index = replace_once(index, old_destination, new_destination, "destino da Clareira")

diorama_html = '''    <section
      class="diorama-screen"
      id="dioramaScreen"
      aria-label="Clareira dos Ecos em diorama 3D"
      tabindex="-1"
      hidden
    >
      <div class="diorama-viewport" id="dioramaViewport" tabindex="0"></div>

      <header class="diorama-hud">
        <small>Clareira dos Ecos · Primeira fase de teste</small>
        <strong>Explore o bosque em formato de diorama</strong>
        <em id="dioramaObjective">Explore o bosque e alcance o portão de raízes.</em>
      </header>

      <nav class="diorama-status" aria-label="Ferramentas da exploração">
        <span id="dioramaMovementState">Parado</span>
        <button class="diorama-tool" id="dioramaTeamButton" type="button">Equipe</button>
        <button class="diorama-tool" id="dioramaBackMap" type="button">Mapa-múndi</button>
      </nav>

      <aside class="diorama-controls-help" aria-label="Controles">
        <span>WASD / Setas · Mover</span>
        <span>Shift · Correr</span>
        <span>E · Interagir</span>
        <span>Esc · Voltar</span>
      </aside>

      <div class="diorama-interaction" id="dioramaInteraction" hidden></div>

      <section class="diorama-team-panel" id="dioramaTeamPanel" aria-label="Equipe atual" hidden>
        <article>
          <header>
            <span>
              <small>Relógio Cristalíneo</small>
              <strong>Equipe atual</strong>
            </span>
            <button id="dioramaTeamClose" type="button" aria-label="Fechar equipe">×</button>
          </header>
          <div class="diorama-team-grid" id="dioramaTeamGrid"></div>
        </article>
      </section>
    </section>

'''
index = replace_once(index, '    <section\n      class="echo-clearing"', diorama_html + '    <section\n      class="echo-clearing"', "tela do diorama")

bridge_helpers = '''      let dioramaBattleContext = null;

      const finishDioramaLegacyBattle = (result = {}) => {
        const context = dioramaBattleContext;
        if (!context) return false;
        dioramaBattleContext = null;
        echoActive = false;
        cancelAnimationFrame(echoFrame);
        resetEchoMovement();
        echoBattle.hidden = true;
        echoBattleChoice.hidden = true;
        echoAbsorption.hidden = true;
        echoEvolution.hidden = true;
        echoWildFighter.classList.remove("hit", "strike");
        echoPlayerFighter.classList.remove("hit", "strike", "switching");
        echoBattleMemberUid = null;
        echoEncounter = null;
        echoClearing.hidden = true;
        echoClearing.classList.remove("diorama-battle-only");
        const dioramaScreen = document.getElementById("dioramaScreen");
        if (dioramaScreen) dioramaScreen.hidden = false;
        const detail = { encounterId: context.encounterId, ...result };
        context.resolve(detail);
        window.dispatchEvent(new CustomEvent("naturion:diorama-battle-finished", { detail }));
        return true;
      };

      const startDioramaLegacyBattle = (payload) => {
        if (dioramaBattleContext) return Promise.resolve({ outcome: "busy" });
        const form = NATURION_FORMS[payload?.formId];
        if (!form) return Promise.resolve({ outcome: "invalid" });
        const chain = getEvolutionChain(form.id) || [form.id];
        const encounter = {
          instanceId: payload.encounterId || `diorama-${form.id}-${Date.now()}`,
          chain,
          form,
          level: Math.max(1, Number(payload.level) || form.minLevel || 1),
          x: echoWorldWidth * .5,
          y: echoWorldHeight * .7,
          spent: false,
          element: null
        };
        return new Promise((resolve) => {
          dioramaBattleContext = {
            resolve,
            encounterId: encounter.instanceId,
            stageId: payload.stageId || "bosque-clareira-diorama",
            result: { outcome: "victory", captured: false }
          };
          const dioramaScreen = document.getElementById("dioramaScreen");
          if (dioramaScreen) dioramaScreen.hidden = true;
          openForestMap.hidden = true;
          echoClearing.hidden = false;
          echoClearing.classList.add("diorama-battle-only");
          echoBattle.hidden = true;
          echoBattleChoice.hidden = true;
          echoAbsorption.hidden = true;
          echoEvolution.hidden = true;
          echoBattleScene.src = payload.scene || "assets/map/bosque-luminal.webp";
          echoActive = true;
          startEchoBattle(encounter);
        });
      };

'''
index = replace_once(index, "      const resolveEchoPartyDefeat = async () => {", bridge_helpers + "      const resolveEchoPartyDefeat = async () => {", "ponte de batalha")

index = replace_once(index, '''        echoEncounter = null;
        resetEchoMovement();
        await enterEchoArea(echoAreaIndex, "left");''', '''        echoEncounter = null;
        resetEchoMovement();
        if (finishDioramaLegacyBattle({ outcome: "defeat" })) return;
        await enterEchoArea(echoAreaIndex, "left");''', "retorno após derrota")

index = replace_once(index, '''          await forestPause(620);
          echoBattle.hidden = true;
          echoBattleChoice.hidden = true;''', '''          await forestPause(620);
          if (dioramaBattleContext) {
            finishDioramaLegacyBattle({ outcome: "fled" });
            return;
          }
          echoBattle.hidden = true;
          echoBattleChoice.hidden = true;''', "fuga para o diorama")

index = replace_once(index, '''        if (!echoEvolutionQueue.length) {
          echoEvolution.classList.remove("active", "complete");
          echoEvolutionParticles.replaceChildren();
          startEchoLoop();
          echoClearing.focus();
          return;
        }''', '''        if (!echoEvolutionQueue.length) {
          echoEvolution.classList.remove("active", "complete");
          echoEvolutionParticles.replaceChildren();
          if (dioramaBattleContext) {
            finishDioramaLegacyBattle(dioramaBattleContext.result || { outcome: "victory" });
            return;
          }
          startEchoLoop();
          echoClearing.focus();
          return;
        }''', "retorno após evolução")

index = replace_once(index, '''        echoBattleMemberUid = null;
        echoEncounter = null;
        updateEchoHud();
        showNextEchoEvolution();''', '''        echoBattleMemberUid = null;
        echoEncounter = null;
        if (!dioramaBattleContext) updateEchoHud();
        showNextEchoEvolution();''', "finalização de encontro")

index = replace_once(index, '''      const releaseEchoWild = () => {
        if (!echoEncounter) return;
        echoBattleChoice.hidden = true;''', '''      const releaseEchoWild = () => {
        if (!echoEncounter) return;
        if (dioramaBattleContext) dioramaBattleContext.result = { outcome: "victory", captured: false };
        echoBattleChoice.hidden = true;''', "resultado ao liberar")

index = replace_once(index, '          capturedIn: getEchoArea().id,', '          capturedIn: dioramaBattleContext?.stageId || getEchoArea().id,', "local de captura")

index = replace_once(index, '''            echoAbsorption.dataset.lastResult = "success";
            const capture = addCapturedNaturion(wild);''', '''            echoAbsorption.dataset.lastResult = "success";
            if (dioramaBattleContext) dioramaBattleContext.result = { outcome: "victory", captured: true };
            const capture = addCapturedNaturion(wild);''', "resultado de absorção bem-sucedida")

index = replace_once(index, '''            echoAbsorption.dataset.lastResult = "failed";
            echoAbsorbMessage.textContent = "A sintonia se desfez. A essência está retornando...";''', '''            echoAbsorption.dataset.lastResult = "failed";
            if (dioramaBattleContext) dioramaBattleContext.result = { outcome: "victory", captured: false };
            echoAbsorbMessage.textContent = "A sintonia se desfez. A essência está retornando...";''', "resultado de absorção falha")

public_bridge = '''      window.NaturionDioramaBridge = {
        getPlayer: () => JSON.parse(JSON.stringify(currentPlayer || {})),
        requestStageEntry: async () => {
          if (!firstWorldDestinationReached) await travelToFirstWorldDestination();
          return true;
        },
        prepareStageEntry: () => {
          ensureEchoPlayerData();
          currentPlayer = {
            ...currentPlayer,
            lastCheckpoint: "clareira-dos-ecos-diorama",
            storyFlags: {
              ...(currentPlayer.storyFlags || {}),
              firstWorldDestinationReached: true,
              echoDioramaUnlocked: true
            },
            activeMission: {
              ...(currentPlayer.activeMission || {}),
              location: "Clareira dos Ecos",
              objective: "Explore o bosque e alcance o portão de raízes.",
              progress: "diorama-em-exploracao"
            }
          };
          saveCurrentPlayer();
        },
        saveState: (state) => {
          currentPlayer = {
            ...currentPlayer,
            dioramaProgress: {
              ...(currentPlayer.dioramaProgress || {}),
              ...state,
              savedAt: new Date().toISOString()
            },
            lastCheckpoint: "clareira-dos-ecos-diorama"
          };
          saveCurrentPlayer();
          return currentPlayer.dioramaProgress;
        },
        returnToWorldMap: () => {
          openForestMap.hidden = false;
          worldMapObjective.textContent = "Destino alcançado: Clareira dos Ecos";
          worldMapGuideText.textContent = "A Clareira dos Ecos agora possui uma primeira fase em diorama 3D.";
          forestObjective.textContent = "Explore a Clareira dos Ecos";
          currentPlayer.lastCheckpoint = "mundo-naturion-clareira-dos-ecos";
          saveCurrentPlayer();
        },
        startBattle: startDioramaLegacyBattle
      };

'''
index = replace_once(index, "      window.__naturionEcho = {", public_bridge + "      window.__naturionEcho = {", "API pública do diorama")
index = replace_once(index, "  </script>\n</body>", "  </script>\n  <script type=\"module\" src=\"src/diorama/main.js\"></script>\n</body>", "módulo principal")
index_path.write_text(index, encoding="utf-8")

stage_path = Path("src/diorama/stages/bosque-clareira.js")
stage = stage_path.read_text(encoding="utf-8")
for old, new in [
    ("addBox(root, 17, 1.08, 12, 15, 1.05, 10, stage.palette.grassLight);", "addBox(root, 17, 0.08, 12, 15, 1.05, 10, stage.palette.grassLight);"),
    ("addBox(root, 27, 1.78, 20, 13, 1.75, 12, stage.palette.grassLight);", "addBox(root, 27, 0.08, 20, 13, 1.75, 12, stage.palette.grassLight);"),
    ("addBox(root, -24, 0.48, 16, 13, 0.45, 11, 0x5b9f4a);", "addBox(root, -24, 0.08, 16, 13, 0.45, 11, 0x5b9f4a);"),
    ("addBox(root, 19, 0.42, 1, 13, 0.4, 11, 0x5caa52);", "addBox(root, 19, 0.08, 1, 13, 0.4, 11, 0x5caa52);"),
]:
    if old not in stage:
        raise RuntimeError(f"ajuste de elevação não encontrado: {old}")
    stage = stage.replace(old, new, 1)
stage_path.write_text(stage, encoding="utf-8")

main_path = Path("src/diorama/main.js")
main = main_path.read_text(encoding="utf-8")
main = replace_once(main, 'const destinationButton = document.getElementById("worldFirstDestination");', '''const destinationButton = document.getElementById("worldFirstDestination");
const teamPanel = document.getElementById("dioramaTeamPanel");
const teamGrid = document.getElementById("dioramaTeamGrid");
const teamClose = document.getElementById("dioramaTeamClose");''', "referências do painel de equipe")
main = replace_once(main, '''const openTeam = () => {
  const legacy = bridge();
  if (legacy?.openTeam) legacy.openTeam();
  else showToast("A equipe continua disponível pelo sistema atual do jogo.");
};''', '''const openTeam = () => {
  const playerData = getPlayerSnapshot();
  const team = playerData.team || [];
  teamGrid.replaceChildren();
  if (!team.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nenhum Naturion está registrado na equipe.";
    teamGrid.append(empty);
  } else {
    team.forEach((member) => {
      const card = document.createElement("article");
      const image = document.createElement("img");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      const info = document.createElement("small");
      image.src = member.image || window.__naturionEcho?.forms?.[member.formId]?.image || "";
      image.alt = member.name || "Naturion";
      name.textContent = member.name || member.formId || "Naturion";
      info.textContent = `${member.type || "Elemento desconhecido"} · Nv. ${member.level || 1}`;
      copy.append(name, info);
      card.append(image, copy);
      teamGrid.append(card);
    });
  }
  input?.reset();
  teamPanel.hidden = false;
  teamClose.focus();
};''', "painel de equipe")
main = replace_once(main, "    isActive: () => active && !screen.hidden,", "    isActive: () => active && !screen.hidden && teamPanel.hidden,", "bloqueio de input com equipe aberta")
main = replace_once(main, '''  if (active || !screen) return;
  bridge()?.prepareStageEntry?.();
  worldMap.hidden = true;''', '''  if (active || !screen) return;
  await bridge()?.requestStageEntry?.();
  bridge()?.prepareStageEntry?.();
  worldMap.hidden = true;''', "entrada preservando viagem no mapa")
main = replace_once(main, '''teamButton?.addEventListener("click", openTeam);
window.addEventListener("naturion:open-diorama", enterDiorama);''', '''teamButton?.addEventListener("click", openTeam);
teamClose?.addEventListener("click", () => {
  teamPanel.hidden = true;
  viewport.focus();
});
teamPanel?.addEventListener("click", (event) => {
  if (event.target === teamPanel) {
    teamPanel.hidden = true;
    viewport.focus();
  }
});
window.addEventListener("naturion:open-diorama", enterDiorama);''', "eventos do painel de equipe")
main_path.write_text(main, encoding="utf-8")

css_path = Path("styles/diorama.css")
css = css_path.read_text(encoding="utf-8")
css += '''

.diorama-team-panel[hidden] { display: none !important; }
.diorama-team-panel {
  position: absolute;
  z-index: 18;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 30px;
  background: rgba(3, 19, 13, .78);
  backdrop-filter: blur(3px);
}
.diorama-team-panel > article {
  width: min(680px, 90vw);
  max-height: 78vh;
  overflow: auto;
  padding: 18px;
  border: 3px solid #e8c752;
  border-radius: 4px;
  background: #092b1f;
  box-shadow: inset 0 0 0 3px rgba(124, 220, 171, .12), 0 8px 0 #3b2707, 0 22px 48px rgba(0, 0, 0, .58);
}
.diorama-team-panel header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.diorama-team-panel header span { display: grid; gap: 4px; }
.diorama-team-panel header small { color: #7ed9b2; font-size: .54rem; text-transform: uppercase; }
.diorama-team-panel header strong { color: #fff2a5; font-size: 1rem; }
.diorama-team-panel header button { width: 38px; height: 38px; border: 2px solid #e8c752; color: #fff2a5; background: #173f2e; cursor: pointer; }
.diorama-team-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.diorama-team-grid > article { display: grid; grid-template-columns: 72px 1fr; gap: 10px; align-items: center; min-height: 92px; padding: 10px; border: 2px solid #6d8c68; background: #123a29; }
.diorama-team-grid img { width: 68px; height: 68px; object-fit: contain; image-rendering: pixelated; }
.diorama-team-grid span { display: grid; gap: 6px; }
.diorama-team-grid strong { color: #fff1a2; font-size: .68rem; }
.diorama-team-grid small { color: #b9dfc7; font-size: .5rem; line-height: 1.4; }
.diorama-team-grid > p { grid-column: 1 / -1; color: #d6efde; text-align: center; }
'''
css_path.write_text(css, encoding="utf-8")
