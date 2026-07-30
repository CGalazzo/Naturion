from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 trecho, encontrado {count}")
    text = text.replace(old, new, 1)


def sub_once(pattern: str, replacement: str, label: str, flags: int = 0) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 trecho, encontrado {count}")


# 1) Colisão mínima nos pés: remove extensão invisível nas bordas das plataformas.
replace_once(
    ".filter((platform) => x >= platform.from - 18 && x <= platform.to + 18)",
    ".filter((platform) => x >= platform.from - 2 && x <= platform.to + 2)",
    "reduzir margem horizontal da colisão",
)
text = text.replace(
    "echoPlayerX = Math.max(34, Math.min(echoWorldWidth - 34, echoPlayerX));",
    "echoPlayerX = Math.max(8, Math.min(echoWorldWidth - 8, echoPlayerX));",
)
text = text.replace(
    "const nextX = Math.max(34, Math.min(echoWorldWidth - 34, echoPlayerX + echoVelocityX * dt));",
    "const nextX = Math.max(8, Math.min(echoWorldWidth - 8, echoPlayerX + echoVelocityX * dt));",
)

# Divide pisos contínuos invisíveis em segmentos pequenos. As plataformas visíveis
# já cadastradas continuam funcionando e passam a aceitar até o menor ponto de apoio.
areas_start = text.index("      const ECHO_AREAS = [")
areas_end = text.index("      const ECHO_WILD_CHAINS", areas_start)
areas = text[areas_start:areas_end]


def split_full_floor(match: re.Match) -> str:
    indent, y = match.group(1), match.group(2)
    return "\n".join([
        f"{indent}[0, .18, {y}],",
        f"{indent}[.22, .42, {y}],",
        f"{indent}[.46, .58, {y}],",
        f"{indent}[.62, .72, {y}],",
        f"{indent}[.76, .88, {y}],",
        f"{indent}[.92, 1, {y}],",
    ])

areas, floor_count = re.subn(
    r"^(\s*)\[0, 1, (\.\d+)\],$",
    split_full_floor,
    areas,
    flags=re.M,
)
if floor_count < 5:
    raise SystemExit(f"dividir pisos contínuos: esperado pelo menos 5, encontrado {floor_count}")
text = text[:areas_start] + areas + text[areas_end:]

# 2) NPC: aviso pequeno somente quando o jogador estiver muito perto e conversa por E.
npc_block = r'''        if (area.npc) {
          const npc = document.createElement("span");
          npc.className = "echo-npc";
          npc.dataset.echoNpc = area.npc.id;
          npc.style.left = `${area.npc.x * echoWorldWidth}px`;
          npc.style.top = `${area.npc.y * echoWorldHeight}px`;
          const image = document.createElement("img");
          image.src = area.npc.image;
          image.alt = "";
          const label = document.createElement("small");
          label.className = "echo-npc-name";
          label.textContent = area.npc.name;
          const interaction = document.createElement("small");
          interaction.className = "echo-npc-interact";
          interaction.textContent = "E · Conversar";
          interaction.hidden = true;
          npc.append(image, label, interaction);
          echoNpcLayer.append(npc);
        }

'''
sub_once(
    r"        if \(area\.npc\) \{.*?\n        \}\n\n(?=        if \(area\.puzzle)",
    npc_block,
    "restaurar aviso local do NPC",
    re.S,
)

interaction_block = r'''      const updateEchoInteraction = () => {
        const area = getEchoArea();
        echoNearInteraction = null;
        const near = (target, horizontal = 92, vertical = 74) => (
          target
          && Math.abs(echoPlayerX - target.x * echoWorldWidth) < horizontal
          && Math.abs(echoPlayerY - target.y * echoWorldHeight) < vertical
        );

        if (near(area.npc, 58, 66)) {
          echoNearInteraction = { type: "npc", value: area.npc };
        } else if (near(area.puzzle, 112, 86) && !isEchoPuzzleSolved()) {
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

        const npcInteraction = echoNpcLayer.querySelector(".echo-npc-interact");
        if (npcInteraction) npcInteraction.hidden = echoNearInteraction?.type !== "npc";
      };
'''
sub_once(
    r"      const updateEchoInteraction = \(\) => \{.*?\n      \};\n(?=      const closeEchoPassageConfirmation)",
    interaction_block,
    "restaurar proximidade curta do NPC",
    re.S,
)

interact_block = r'''      const interactEchoWorld = () => {
        if (!echoActive || !echoNearInteraction || !echoDialogue.hidden || !echoPuzzle.hidden) return;
        if (echoNearInteraction.type === "npc") {
          showEchoDialogue(echoNearInteraction.value);
        } else if (echoNearInteraction.type === "puzzle") {
          openEchoPuzzle(echoNearInteraction.value);
        }
      };
'''
sub_once(
    r"      const interactEchoWorld = \(\) => \{.*?\n      \};\n(?=\n      const triggerEchoJumpOrPassage)",
    interact_block,
    "restaurar conversa pela tecla E",
    re.S,
)

# 3) Batalhas: cria uma área exclusiva para círculo e sprite, separada do HUD.
replace_once(
    '''          <article class="echo-fighter player" id="echoPlayerFighter">
            <img id="echoBattlePlayerImage" src="assets/story/axolume.webp" alt="">
            <div class="echo-battle-status">''',
    '''          <article class="echo-fighter player" id="echoPlayerFighter">
            <div class="echo-fighter-stage">
              <img id="echoBattlePlayerImage" src="assets/story/axolume.webp" alt="">
            </div>
            <div class="echo-battle-status">''',
    "criar palco do Naturion aliado",
)
replace_once(
    '''          <article class="echo-fighter wild" id="echoWildFighter">
            <img id="echoBattleWildImage" src="assets/echo-creatures/escaruli.webp" alt="">
            <div class="echo-battle-status">''',
    '''          <article class="echo-fighter wild" id="echoWildFighter">
            <div class="echo-fighter-stage">
              <img id="echoBattleWildImage" src="assets/echo-creatures/escaruli.webp" alt="">
            </div>
            <div class="echo-battle-status">''',
    "criar palco do Naturion inimigo",
)

battle_css = r'''

    /* Correção confirmada: interação curta, colisão mínima e enquadramento universal. */
    .echo-npc {
      cursor: default;
      pointer-events: none;
    }

    .echo-npc-interact {
      position: absolute;
      z-index: 7;
      top: calc(100% + 25px);
      left: 50%;
      display: block !important;
      width: max-content;
      padding: 4px 7px;
      border: 1px solid rgba(255, 241, 163, .88);
      border-radius: 3px;
      color: #fff6b8;
      background: rgba(7, 27, 17, .94);
      box-shadow: 0 2px 0 rgba(0, 0, 0, .55);
      font-size: .48rem;
      font-weight: 900;
      letter-spacing: .04em;
      text-shadow: 1px 1px 0 #000;
      transform: translateX(-50%);
      pointer-events: none;
    }

    .echo-npc-interact[hidden] {
      display: none !important;
    }

    .echo-fighter {
      min-height: 0;
      grid-template-rows: clamp(220px, 38vh, 310px) auto;
      align-content: center;
      gap: 8px;
      padding-bottom: 0;
    }

    .echo-fighter::after {
      display: none;
    }

    .echo-fighter-stage {
      position: relative;
      isolation: isolate;
      width: min(370px, 94%);
      height: clamp(220px, 38vh, 310px);
      align-self: end;
      overflow: visible;
    }

    .echo-fighter-stage::after {
      position: absolute;
      z-index: 0;
      right: 4%;
      bottom: 8px;
      left: 4%;
      height: 62px;
      border: 2px solid rgba(225, 197, 81, .72);
      border-radius: 50%;
      content: "";
      background: radial-gradient(ellipse, rgba(78, 128, 67, .72), rgba(13, 37, 24, .08) 72%);
      box-shadow: inset 0 0 24px rgba(102, 217, 141, .25);
    }

    .echo-fighter-stage img {
      position: absolute;
      z-index: 2;
      top: var(--fighter-fit-top, 8%);
      left: var(--fighter-fit-left, 10%);
      width: var(--fighter-fit-width, 80%) !important;
      height: var(--fighter-fit-height, 80%) !important;
      max-width: none;
      max-height: none;
      object-fit: contain;
      object-position: center bottom;
      filter: drop-shadow(0 7px 4px rgba(0, 0, 0, .55));
      transform: scaleX(var(--fighter-direction));
      transform-origin: center bottom;
      image-rendering: pixelated;
    }

    .echo-battle-status {
      margin-top: 0;
    }

    @keyframes echo-circle-strike {
      0%, 100% { transform: translateX(0) scaleX(var(--fighter-direction)); }
      45% { transform: translateX(var(--fighter-strike-x)) scaleX(var(--fighter-direction)); }
    }

    @keyframes echo-circle-hit {
      0%, 100% { transform: translateX(0) scaleX(var(--fighter-direction)); filter: drop-shadow(0 7px 4px rgba(0, 0, 0, .55)); }
      35% { transform: translateX(var(--fighter-hit-x)) scaleX(var(--fighter-direction)); filter: brightness(1.65) drop-shadow(0 0 10px #fff); }
    }

    @keyframes echo-circle-entry {
      0% { opacity: 0; transform: translateY(34px) scale(.72) scaleX(var(--fighter-direction)); }
      100% { opacity: 1; transform: translateY(0) scale(1) scaleX(var(--fighter-direction)); }
    }

    .echo-fighter.strike .echo-fighter-stage img {
      animation: echo-circle-strike .38s steps(4, end);
    }

    .echo-fighter.hit .echo-fighter-stage img {
      animation: echo-circle-hit .34s steps(3, end);
    }

    .echo-fighter.switching .echo-fighter-stage img {
      animation: echo-circle-entry .68s steps(8, end) both;
    }

    @media (max-width: 720px) {
      .echo-fighter {
        grid-template-rows: clamp(180px, 31vh, 245px) auto;
      }

      .echo-fighter-stage {
        width: min(260px, 98%);
        height: clamp(180px, 31vh, 245px);
      }
    }
'''
replace_once("\n  </style>", battle_css + "\n  </style>", "adicionar estilos finais")

# Mede a área realmente visível de cada PNG/WebP e enquadra todos pela mesma regra.
fit_code = r'''

      const echoBattleSpriteBoundsCache = new Map();

      const fitEchoBattleSprite = (image) => {
        const stage = image.closest(".echo-fighter-stage");
        const fighter = image.closest(".echo-fighter");
        if (!stage || !fighter) return;

        const applyFit = () => {
          const naturalWidth = image.naturalWidth || 1;
          const naturalHeight = image.naturalHeight || 1;
          const source = image.currentSrc || image.src;
          let bounds = echoBattleSpriteBoundsCache.get(source);

          if (!bounds) {
            bounds = { minX: 0, minY: 0, maxX: naturalWidth - 1, maxY: naturalHeight - 1 };
            try {
              const ratio = Math.min(1, 512 / Math.max(naturalWidth, naturalHeight));
              const width = Math.max(1, Math.round(naturalWidth * ratio));
              const height = Math.max(1, Math.round(naturalHeight * ratio));
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const context = canvas.getContext("2d", { willReadFrequently: true });
              context.drawImage(image, 0, 0, width, height);
              const pixels = context.getImageData(0, 0, width, height).data;
              let minX = width;
              let minY = height;
              let maxX = -1;
              let maxY = -1;
              for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                  if (pixels[(y * width + x) * 4 + 3] < 18) continue;
                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x);
                  maxY = Math.max(maxY, y);
                }
              }
              if (maxX >= minX && maxY >= minY) {
                bounds = {
                  minX: minX / ratio,
                  minY: minY / ratio,
                  maxX: (maxX + 1) / ratio - 1,
                  maxY: (maxY + 1) / ratio - 1
                };
              }
            } catch {
              /* Usa a imagem completa caso o navegador não permita ler os pixels. */
            }
            echoBattleSpriteBoundsCache.set(source, bounds);
          }

          const stageWidth = stage.clientWidth || 320;
          const stageHeight = stage.clientHeight || 260;
          const visibleWidth = Math.max(1, bounds.maxX - bounds.minX + 1);
          const visibleHeight = Math.max(1, bounds.maxY - bounds.minY + 1);
          const scale = Math.min(
            stageWidth * .78 / visibleWidth,
            stageHeight * .76 / visibleHeight
          );
          const fullWidth = naturalWidth * scale;
          const fullHeight = naturalHeight * scale;
          const direction = fighter.classList.contains("player") ? -1 : 1;
          const visibleCenter = (bounds.minX + bounds.maxX + 1) / 2;
          const directedCenter = direction < 0 ? naturalWidth - visibleCenter : visibleCenter;
          const left = stageWidth / 2 - directedCenter * scale;
          const baseline = stageHeight - 28;
          const top = baseline - (bounds.maxY + 1) * scale;

          image.style.setProperty("--fighter-fit-width", `${fullWidth}px`);
          image.style.setProperty("--fighter-fit-height", `${fullHeight}px`);
          image.style.setProperty("--fighter-fit-left", `${left}px`);
          image.style.setProperty("--fighter-fit-top", `${top}px`);
        };

        if (image.complete && image.naturalWidth) {
          requestAnimationFrame(applyFit);
        } else {
          image.addEventListener("load", () => requestAnimationFrame(applyFit), { once: true });
        }
      };
'''
replace_once(
    '''      const getNaturionGroundOffset = (form) => (
        form?.flying ? "0%" : `${Number(form?.groundOffset) || 0}%`
      );
''',
    '''      const getNaturionGroundOffset = (form) => (
        form?.flying ? "0%" : `${Number(form?.groundOffset) || 0}%`
      );
''' + fit_code,
    "adicionar enquadramento automático dos sprites",
)

text = text.replace(
    "echoBattlePlayerImage.parentElement.style.setProperty(",
    "echoPlayerFighter.style.setProperty(",
)
text = text.replace(
    "echoBattleWildImage.parentElement.style.setProperty(",
    "echoWildFighter.style.setProperty(",
)
replace_once(
    '''        echoPlayerFighter.style.setProperty(
          "--fighter-ground-offset",
          getNaturionGroundOffset(form)
        );
        echoBattlePlayerName.textContent = form.name;''',
    '''        echoPlayerFighter.style.setProperty(
          "--fighter-ground-offset",
          getNaturionGroundOffset(form)
        );
        fitEchoBattleSprite(echoBattlePlayerImage);
        echoBattlePlayerName.textContent = form.name;''',
    "enquadrar aliado ao trocar",
)
replace_once(
    '''        echoWildFighter.style.setProperty(
          "--fighter-ground-offset",
          getNaturionGroundOffset(wild.form)
        );
        echoBattleWildName.textContent = wild.form.name;''',
    '''        echoWildFighter.style.setProperty(
          "--fighter-ground-offset",
          getNaturionGroundOffset(wild.form)
        );
        fitEchoBattleSprite(echoBattleWildImage);
        echoBattleWildName.textContent = wild.form.name;''',
    "enquadrar inimigo ao iniciar batalha",
)

# Validações semânticas antes de salvar.
checks = {
    "aviso curto do NPC": 'interaction.textContent = "E · Conversar"' in text,
    "proximidade muito curta": "near(area.npc, 58, 66)" in text,
    "conversa por E": 'echoNearInteraction.type === "npc"' in text,
    "colisão de dois pixels": "platform.from - 2" in text and "platform.to + 2" in text,
    "palco de batalha aliado": 'class="echo-fighter-stage"' in text,
    "ajuste por pixels visíveis": "fitEchoBattleSprite" in text and "getImageData" in text,
}
failed = [name for name, passed in checks.items() if not passed]
if failed:
    raise SystemExit("Validações falharam: " + ", ".join(failed))

path.write_text(text, encoding="utf-8")
