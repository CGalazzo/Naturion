from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def sub_once(pattern: str, replacement: str, label: str, flags: int = 0) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 trecho, encontrado {count}")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 trecho, encontrado {count}")
    text = text.replace(old, new, 1)


# Restaura os detalhes do cristal, sem pedestal, e ancora a parte visível no chão.
crystal_css = r'''

    /* Cristais detalhados, sem pedestal e realmente apoiados no chão. */
    .encounter-crystal .crystal-base {
      display: none !important;
    }

    .encounter-crystal .crystal-gem {
      position: absolute;
      z-index: 2;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center bottom;
      clip-path: inset(0 0 22% 0);
      transform: translateY(22%);
      transform-origin: 50% 100%;
      filter:
        grayscale(.14)
        contrast(1.18)
        saturate(1.22)
        brightness(.92)
        drop-shadow(0 4px 2px rgba(0, 0, 0, .48));
      image-rendering: pixelated;
      pointer-events: none;
    }

    .encounter-crystal .crystal-visual::before {
      opacity: .4;
    }

    .encounter-crystal .crystal-visual::after {
      opacity: .44;
      clip-path: inset(0 0 22% 0);
      background: linear-gradient(
        155deg,
        var(--encounter-bright) 0 12%,
        var(--encounter-color) 42%,
        var(--encounter-dark) 86%
      );
      mix-blend-mode: color;
      filter: saturate(1.24) contrast(1.08);
      transform: translateY(22%);
      transform-origin: 50% 100%;
      animation: none;
    }

    @keyframes encounter-crystal-detail-alert {
      0%, 100% {
        filter:
          grayscale(.14)
          contrast(1.18)
          saturate(1.22)
          brightness(.92)
          drop-shadow(0 4px 2px rgba(0, 0, 0, .48));
      }
      50% {
        filter:
          grayscale(.08)
          contrast(1.24)
          saturate(1.32)
          brightness(1.12)
          drop-shadow(0 0 8px var(--encounter-color))
          drop-shadow(0 4px 2px rgba(0, 0, 0, .48));
      }
    }

    .plumirel-world.alert .crystal-gem {
      animation: encounter-crystal-detail-alert .48s steps(2, end) infinite;
    }

    .encounter-crystal.is-spent .crystal-visual {
      filter: none;
    }

    .encounter-crystal.is-spent .crystal-visual::before {
      opacity: 0;
    }

    .encounter-crystal.is-spent .crystal-gem {
      opacity: .42;
      filter: grayscale(1) contrast(.9) brightness(.48) drop-shadow(0 3px 2px rgba(0, 0, 0, .42));
      animation: none;
    }

    .encounter-crystal.is-spent .crystal-visual::after {
      opacity: .12;
      filter: grayscale(1) brightness(.4);
      animation: none;
    }

    .echo-wild {
      transform: translate(-50%, calc(-100% + 4px));
    }

    .plumirel-world,
    .tutorial-world .plumirel-world {
      transform: translate(-50%, 4px);
    }

    .plumirel-world.alert {
      transform: translate(-50%, 4px) scale(1.07);
    }

    .echo-wild::after,
    .plumirel-world::after {
      right: 27%;
      bottom: -1px;
      left: 27%;
      width: auto;
      height: 7px;
      opacity: .52;
      background: rgba(0, 0, 0, .46);
      filter: blur(2px);
    }

    /* NPCs são acionados exclusivamente por clique direto. */
    .echo-interact,
    .echo-npc-interact {
      display: none !important;
    }

    .echo-npc {
      cursor: pointer;
      pointer-events: auto;
    }

    .echo-npc:hover img {
      filter:
        brightness(1.08)
        drop-shadow(0 4px 2px rgba(0, 0, 0, .52));
    }
'''
sub_once(
    r'\n\s*/\* Cristais de encontro: sem pedestal separado e integrados ao chão\. \*/.*?\.echo-npc-interact\[hidden\] \{\s*display: none;\s*\}\n',
    crystal_css,
    "substituir acabamento visual dos cristais e NPCs",
    re.S,
)

# Remove definitivamente a caixa global "E Interagir" do HTML.
sub_once(
    r'\n\s*<div class="echo-interact" id="echoInteract" hidden>\s*<kbd id="echoInteractKey">E</kbd>\s*<span id="echoInteractText">Interagir</span>\s*</div>\n',
    "\n",
    "remover caixa global de interação",
    re.S,
)

# O cristal do tutorial volta a exibir a arte detalhada, sem a base.
replace_once(
    '<span class="crystal-visual" aria-hidden="true"></span>',
    '<span class="crystal-visual" aria-hidden="true">\n            <img class="crystal-gem" src="assets/puzzle/crystal-blue-voxel.webp" alt="">\n          </span>',
    "restaurar detalhes do cristal do tutorial",
)

# Posiciona os cristais apenas em plataformas largas o suficiente e longe das bordas.
choose_wild = r'''      const chooseEchoWild = (index, occupied = []) => {
        const area = getEchoArea();
        const level = echoRandom(area.levels[0], area.levels[1]);
        const chain = ECHO_WILD_CHAINS[echoRandom(0, ECHO_WILD_CHAINS.length - 1)];
        const form = getHighestForm(chain, level, area.maxStage, false);
        const size = getWildSize();
        const elevatedPlatforms = area.platforms.slice(1);
        const availablePlatforms = elevatedPlatforms.length ? elevatedPlatforms : area.platforms;
        const fittingPlatforms = availablePlatforms.filter((platform) => (
          (platform[1] - platform[0]) * echoWorldWidth >= size * 1.18
        ));
        const platformPool = fittingPlatforms.length ? fittingPlatforms : [area.platforms[0]];
        const reserved = [area.npc, area.puzzle, area.passages?.previous, area.passages?.next].filter(Boolean);

        for (let attempt = 0; attempt < 100; attempt += 1) {
          const platform = platformPool[echoRandom(0, platformPool.length - 1)];
          const platformWidth = Math.max(.012, platform[1] - platform[0]);
          const crystalHalfWidth = size * .56 / echoWorldWidth;
          const inset = Math.min(platformWidth * .44, Math.max(.01, crystalHalfWidth));
          const minRatio = platform[0] + inset;
          const maxRatio = platform[1] - inset;
          if (maxRatio <= minRatio) continue;

          const xRatio = minRatio + Math.random() * (maxRatio - minRatio);
          const x = xRatio * echoWorldWidth;
          const y = platform[2] * echoWorldHeight;
          const overlapsCrystal = occupied.some((other) => (
            Math.abs(other.x - x) < Math.max(112, (other.size + size) * .74)
            && Math.abs(other.y - y) < Math.max(90, (other.size + size) * .78)
          ));
          const overlapsReserved = reserved.some((target) => (
            Math.abs(target.x * echoWorldWidth - x) < 116
            && Math.abs(target.y * echoWorldHeight - y) < 92
          ));
          if (overlapsCrystal || overlapsReserved) continue;

          return {
            instanceId: `${area.id}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
            chain,
            form,
            level,
            behavior: "idle",
            x,
            y,
            minX: x,
            maxX: x,
            direction: 1,
            speed: 0,
            size,
            spent: false,
            crystalStyle: getEncounterCrystalStyle(form.type),
            crystalDelay: -(index % 4) * .42,
            element: null
          };
        }

        return null;
      };
'''
sub_once(
    r'      const chooseEchoWild = \(index, occupied = \[\]\) => \{.*?\n      \};\n(?=      const renderEchoWild)',
    choose_wild,
    "corrigir posicionamento dos cristais",
    re.S,
)

# Renderiza a imagem facetada do cristal em cada encontro.
replace_once(
    '        const visual = document.createElement("span");\n        element.className = "echo-wild encounter-crystal";',
    '        const visual = document.createElement("span");\n        const gem = document.createElement("img");\n        element.className = "echo-wild encounter-crystal";',
    "criar imagem detalhada do cristal",
)
replace_once(
    '        visual.className = "crystal-visual";\n        visual.setAttribute("aria-hidden", "true");\n        element.append(visual);',
    '        visual.className = "crystal-visual";\n        visual.setAttribute("aria-hidden", "true");\n        gem.className = "crystal-gem";\n        gem.src = "assets/puzzle/crystal-blue-voxel.webp";\n        gem.alt = "";\n        gem.draggable = false;\n        visual.append(gem);\n        element.append(visual);',
    "inserir arte detalhada nos cristais",
)

# NPC visível continua com nome, mas conversa somente ao clicar diretamente nele.
npc_block = r'''        if (area.npc) {
          const npc = document.createElement("span");
          npc.className = "echo-npc";
          npc.dataset.echoNpc = area.npc.id;
          npc.setAttribute("role", "button");
          npc.setAttribute("aria-label", `Conversar com ${area.npc.name}`);
          npc.style.left = `${area.npc.x * echoWorldWidth}px`;
          npc.style.top = `${area.npc.y * echoWorldHeight}px`;
          const image = document.createElement("img");
          image.src = area.npc.image;
          image.alt = "";
          const label = document.createElement("small");
          label.className = "echo-npc-name";
          label.textContent = area.npc.name;
          npc.append(image, label);
          npc.addEventListener("click", (event) => {
            event.stopPropagation();
            if (
              !echoActive
              || !echoDialogue.hidden
              || !echoPuzzle.hidden
              || !echoBattle.hidden
              || !echoEvolution.hidden
              || !echoAbsorption.hidden
              || !echoTeam.hidden
              || !echoPassageConfirm.hidden
            ) return;
            showEchoDialogue(area.npc);
          });
          echoNpcLayer.append(npc);
        }

'''
sub_once(
    r'        if \(area\.npc\) \{.*?\n        \}\n\n(?=        if \(area\.puzzle)',
    npc_block,
    "trocar interação do NPC por clique",
    re.S,
)

# Proximidade não cria mais interação com NPC nem qualquer caixa visual.
interaction_block = r'''      const updateEchoInteraction = () => {
        const area = getEchoArea();
        echoNearInteraction = null;
        const near = (target, horizontal = 92, vertical = 74) => (
          target
          && Math.abs(echoPlayerX - target.x * echoWorldWidth) < horizontal
          && Math.abs(echoPlayerY - target.y * echoWorldHeight) < vertical
        );

        if (near(area.puzzle, 112, 86) && !isEchoPuzzleSolved()) {
          echoNearInteraction = { type: "puzzle", value: area.puzzle };
        } else if (near(area.passages?.previous, 108, 92)) {
          echoNearInteraction = {
            type: "passage",
            direction: "previous",
            value: area.passages.previous
          };
        } else if (near(area.passages?.next, 108, 92)) {
          echoNearInteraction = {
            type: "passage",
            direction: "next",
            value: area.passages.next
          };
        }
      };
'''
sub_once(
    r'      const updateEchoInteraction = \(\) => \{.*?\n      \};\n(?=      const closeEchoPassageConfirmation)',
    interaction_block,
    "remover interação de proximidade com NPC",
    re.S,
)

# A tecla E/Enter permanece apenas para desafios; nunca conversa com NPC.
interact_block = r'''      const interactEchoWorld = () => {
        if (!echoActive || !echoNearInteraction || !echoDialogue.hidden || !echoPuzzle.hidden) return;
        if (echoNearInteraction.type === "puzzle") {
          openEchoPuzzle(echoNearInteraction.value);
        }
      };
'''
sub_once(
    r'      const interactEchoWorld = \(\) => \{.*?\n      \};\n(?=\n      const triggerEchoJumpOrPassage)',
    interact_block,
    "limitar tecla de interação aos desafios",
    re.S,
)

path.write_text(text, encoding="utf-8")

# Validações específicas da alteração aprovada.
checks = {
    'caixa global removida': '<div class="echo-interact"' not in text,
    'aviso local removido': 'E · Conversar' not in text and 'echo-npc-interact' not in text,
    'NPC clicável': 'npc.addEventListener("click"' in text,
    'NPC fora da proximidade': 'echoNearInteraction = { type: "npc"' not in text,
    'cristal detalhado': text.count('class="crystal-gem"') >= 4,
    'cristal sem base no encontro': '.encounter-crystal .crystal-base' in text,
    'cristal apoiado': 'calc(-100% + 4px)' in text,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Falhas de validação: ' + ', '.join(failed))
