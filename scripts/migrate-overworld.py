from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")
text = text.replace('<link rel="stylesheet" href="styles/diorama.css">', '<link rel="stylesheet" href="styles/overworld.css">')
text = text.replace('<script type="module" src="src/diorama/main.js"></script>', '<script type="module" src="src/overworld/main.js"></script>')

marker = text.index('class="diorama-screen"')
start = text.rfind('    <section', 0, marker)
echo_marker = text.index('class="echo-clearing"', marker)
end = text.rfind('    <section', marker, echo_marker)
if start < 0 or end < 0:
    raise RuntimeError("Não foi possível localizar a tela antiga da Clareira.")

markup = '''    <section
      class="overworld-screen"
      id="overworldScreen"
      aria-label="Exploração superior do Bosque Luminal"
      tabindex="-1"
      hidden
    >
      <div class="overworld-viewport" id="overworldViewport" tabindex="0"></div>
      <header class="overworld-hud">
        <small>Área de exploração</small>
        <strong>Bosque Luminal</strong>
        <em id="overworldObjective">Explore o bosque e descubra como abrir o portão de raízes.</em>
      </header>
      <nav class="overworld-status" aria-label="Ferramentas da exploração">
        <span id="overworldMovementState">Parado</span>
        <button class="overworld-tool" id="overworldTeamButton" type="button">Equipe</button>
        <button class="overworld-tool" id="overworldBackMap" type="button">Mapa-múndi</button>
      </nav>
      <aside class="overworld-controls-help" aria-label="Controles">
        <span>WASD / Setas · Mover</span><span>Shift · Correr</span><span>E · Interagir</span><span>Esc · Voltar</span>
      </aside>
      <div class="overworld-interaction" id="overworldInteraction" hidden></div>
      <section class="overworld-mobile-controls" aria-label="Controles de toque">
        <div class="overworld-joystick" id="overworldJoystick" aria-label="Direcional"><span class="overworld-joystick-knob" id="overworldJoystickKnob"></span></div>
        <div class="overworld-mobile-actions">
          <button id="overworldMobileRun" type="button">Correr</button><button id="overworldMobileInteract" type="button">Interagir</button>
          <button id="overworldMobileTeam" type="button">Equipe</button><button id="overworldMobileMap" type="button">Mapa</button>
        </div>
      </section>
      <section class="overworld-team-panel" id="overworldTeamPanel" aria-label="Equipe atual" hidden>
        <article><header><span><small>Relógio Cristalíneo</small><strong>Equipe atual</strong></span><button id="overworldTeamClose" type="button" aria-label="Fechar equipe">×</button></header><div class="overworld-team-grid" id="overworldTeamGrid"></div></article>
      </section>
      <section class="overworld-dialogue" id="overworldDialogue" role="dialog" aria-modal="true" hidden>
        <article><header><span><small>Bosque Luminal</small><strong id="overworldDialogueName">Exploração</strong></span></header><p id="overworldDialogueText"></p><footer><button id="overworldDialogueClose" type="button">Continuar</button></footer></article>
      </section>
    </section>

'''
text = text[:start] + markup + text[end:]

replacements = {
    "dioramaBattleContext": "overworldBattleContext",
    "finishDioramaLegacyBattle": "finishOverworldLegacyBattle",
    "startDioramaLegacyBattle": "startOverworldLegacyBattle",
    "naturion:diorama-battle-finished": "naturion:overworld-battle-finished",
    "diorama-battle-only": "overworld-battle-only",
    "dioramaScreen": "overworldScreen",
    "NaturionDioramaBridge": "NaturionOverworldBridge",
    "requestStageEntry:": "requestMapEntry:",
    "prepareStageEntry:": "prepareMapEntry:",
    "dioramaProgress": "overworldProgress",
    "echoDioramaUnlocked": "overworldUnlocked",
    "clareira-dos-ecos-diorama": "bosque-luminal-overworld",
    "diorama-em-exploracao": "overworld-em-exploracao",
    'location: "Clareira dos Ecos"': 'location: "Bosque Luminal"',
    'objective: "Explore o bosque e alcance o portão de raízes."': 'objective: "Explore o bosque e descubra como abrir o portão de raízes."',
    'worldMapGuideText.textContent = "A Clareira dos Ecos agora possui uma primeira fase em diorama 3D.";': 'worldMapGuideText.textContent = "A Clareira dos Ecos conduz ao novo mapa de exploração do Bosque Luminal.";',
    'forestObjective.textContent = "Explore a Clareira dos Ecos";': 'forestObjective.textContent = "Explore o Bosque Luminal";',
    'Esta região possui cinco áreas conectadas, Naturions selvagens, pesquisadores e puzzles antigos. Você poderá retornar ao mapa pela entrada.': 'O Bosque Luminal é uma área compacta de exploração com casas, NPCs, Naturions selvagens e um portão bloqueado. Você poderá retornar ao mapa a qualquer momento.'
}
for old, new in replacements.items():
    text = text.replace(old, new)

required = [
    'id="overworldScreen"', 'id="overworldViewport"', 'window.NaturionOverworldBridge',
    'requestMapEntry:', 'prepareMapEntry:', 'src/overworld/main.js', 'styles/overworld.css',
    'startOverworldLegacyBattle', 'finishOverworldLegacyBattle'
]
for item in required:
    if item not in text:
        raise RuntimeError(f"Integração ausente no index: {item}")
for forbidden in ['src/diorama/main.js', 'styles/diorama.css', 'id="dioramaScreen"', 'NaturionDioramaBridge', 'dioramaBattleContext', 'diorama-battle-only']:
    if forbidden in text:
        raise RuntimeError(f"Referência antiga ainda presente: {forbidden}")

path.write_text(text, encoding="utf-8")
