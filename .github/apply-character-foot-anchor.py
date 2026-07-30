from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 trecho, encontrado {count}")
    text = text.replace(old, new, 1)


# O ponto físico continua sendo o chão. Apenas o conteúdo visível do sprite
# desce o suficiente para compensar os pixels transparentes abaixo dos pés.
replace_once(
    '''    .explorer-party {
      position: absolute;''',
    '''    .explorer-party {
      --explorer-hero-foot-offset: 0px;
      position: absolute;''',
    "adicionar variável de apoio ao personagem do tutorial",
)

replace_once(
    '''    .tutorial-world .explorer-hero-rig {
      position: absolute;
      z-index: 2;
      bottom: 0;
      left: 50%;
      width: 72%;
      height: 100%;
      filter: drop-shadow(4px 6px 6px rgba(0, 0, 0, .5));
      transform: translateX(-50%);
      transform-origin: 50% 92%;
    }''',
    '''    .tutorial-world .explorer-hero-rig {
      position: absolute;
      z-index: 2;
      bottom: 0;
      left: 50%;
      width: 72%;
      height: 100%;
      filter: drop-shadow(4px 6px 6px rgba(0, 0, 0, .5));
      transform: translate(-50%, var(--explorer-hero-foot-offset));
      transform-origin: 50% 92%;
    }''',
    "ancorar rig do tutorial nos pés",
)

replace_once(
    '''    .tutorial-world .explorer-party.facing-right .explorer-hero-rig {
      transform: translateX(-50%) scaleX(-1);
    }

    .tutorial-world .explorer-party[data-character="female"] .explorer-hero-rig {
      transform: translateX(-50%) scaleX(-1);
    }

    .tutorial-world .explorer-party[data-character="female"].facing-right .explorer-hero-rig {
      transform: translateX(-50%);
    }''',
    '''    .tutorial-world .explorer-party.facing-right .explorer-hero-rig {
      transform: translate(-50%, var(--explorer-hero-foot-offset)) scaleX(-1);
    }

    .tutorial-world .explorer-party[data-character="female"] .explorer-hero-rig {
      transform: translate(-50%, var(--explorer-hero-foot-offset)) scaleX(-1);
    }

    .tutorial-world .explorer-party[data-character="female"].facing-right .explorer-hero-rig {
      transform: translate(-50%, var(--explorer-hero-foot-offset));
    }''',
    "preservar apoio ao mudar direção no tutorial",
)

replace_once(
    '''    .echo-player {
      --echo-hero-direction: 1;''',
    '''    .echo-player {
      --echo-hero-direction: 1;
      --echo-player-foot-offset: 0px;''',
    "adicionar variável de apoio ao personagem da clareira",
)

replace_once(
    '''    .echo-player-rig {
      position: absolute;
      inset: 0;
      filter: drop-shadow(0 4px 2px rgba(0, 0, 0, .55));
      transform: scaleX(var(--echo-hero-direction));
      transform-origin: center bottom;
    }''',
    '''    .echo-player-rig {
      position: absolute;
      inset: 0;
      filter: drop-shadow(0 4px 2px rgba(0, 0, 0, .55));
      transform:
        translateY(var(--echo-player-foot-offset))
        scaleX(var(--echo-hero-direction));
      transform-origin: center bottom;
    }''',
    "ancorar rig da clareira nos pés",
)

alignment_code = r'''

      const explorationCharacterFootCache = new Map();

      const getExplorationCharacterBottomPadding = (image) => {
        const naturalWidth = image.naturalWidth || 0;
        const naturalHeight = image.naturalHeight || 0;
        if (!naturalWidth || !naturalHeight) return 0;

        const source = image.currentSrc || image.src;
        if (explorationCharacterFootCache.has(source)) {
          return explorationCharacterFootCache.get(source);
        }

        let bottomPaddingRatio = 0;
        try {
          const sampleScale = Math.min(1, 512 / Math.max(naturalWidth, naturalHeight));
          const sampleWidth = Math.max(1, Math.round(naturalWidth * sampleScale));
          const sampleHeight = Math.max(1, Math.round(naturalHeight * sampleScale));
          const canvas = document.createElement("canvas");
          canvas.width = sampleWidth;
          canvas.height = sampleHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.imageSmoothingEnabled = false;
          context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
          const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
          const minimumOpaquePixels = Math.max(2, Math.round(sampleWidth * .004));
          let lowestVisibleY = -1;

          for (let y = sampleHeight - 1; y >= 0; y -= 1) {
            let opaquePixels = 0;
            for (let x = 0; x < sampleWidth; x += 1) {
              if (pixels[(y * sampleWidth + x) * 4 + 3] < 40) continue;
              opaquePixels += 1;
              if (opaquePixels >= minimumOpaquePixels) {
                lowestVisibleY = y;
                break;
              }
            }
            if (lowestVisibleY >= 0) break;
          }

          if (lowestVisibleY >= 0) {
            bottomPaddingRatio = Math.max(
              0,
              (sampleHeight - 1 - lowestVisibleY) / sampleHeight
            );
          }
        } catch {
          /* Mesma origem normalmente permite a leitura; sem ela, mantém o encaixe padrão. */
        }

        explorationCharacterFootCache.set(source, bottomPaddingRatio);
        return bottomPaddingRatio;
      };

      const alignExplorationSpriteFeet = (image, target, propertyName) => {
        if (!image || !target) return;
        const applyAlignment = () => {
          const naturalWidth = image.naturalWidth || 0;
          const naturalHeight = image.naturalHeight || 0;
          const boxWidth = image.clientWidth || 0;
          const boxHeight = image.clientHeight || 0;
          if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) return;

          const bottomPaddingRatio = getExplorationCharacterBottomPadding(image);
          const renderedScale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
          const transparentBottom = naturalHeight * bottomPaddingRatio * renderedScale;
          const groundOverlap = 1;
          target.style.setProperty(
            propertyName,
            `${Math.max(0, transparentBottom + groundOverlap).toFixed(2)}px`
          );
        };

        if (image.complete && image.naturalWidth) {
          requestAnimationFrame(applyAlignment);
        } else {
          image.addEventListener("load", () => requestAnimationFrame(applyAlignment), { once: true });
        }
      };

      const alignExplorationCharacterFeet = () => {
        alignExplorationSpriteFeet(
          explorerHero,
          explorerParty,
          "--explorer-hero-foot-offset"
        );
        alignExplorationSpriteFeet(
          echoPlayerImage,
          echoPlayer,
          "--echo-player-foot-offset"
        );
      };

      [explorerHero, echoPlayerImage].forEach((image) => {
        image.addEventListener("load", alignExplorationCharacterFeet);
      });

      let explorationCharacterResizeObserver = null;
      if ("ResizeObserver" in window) {
        explorationCharacterResizeObserver = new ResizeObserver(alignExplorationCharacterFeet);
        explorationCharacterResizeObserver.observe(explorerParty);
        explorationCharacterResizeObserver.observe(echoPlayer);
      }
      window.addEventListener("resize", alignExplorationCharacterFeet);
      requestAnimationFrame(alignExplorationCharacterFeet);
'''

replace_once(
    '''      const getEchoArea = () => ECHO_AREAS[echoAreaIndex];

      const getEchoGroundAt =''',
    '''      const getEchoArea = () => ECHO_AREAS[echoAreaIndex];''' + alignment_code + '''

      const getEchoGroundAt =''',
    "adicionar medição automática dos pés",
)

replace_once(
    '''        explorerParty.classList.remove("is-moving", "is-jumping", "facing-right", "just-landed");
        positionExplorerParty();
      };''',
    '''        explorerParty.classList.remove("is-moving", "is-jumping", "facing-right", "just-landed");
        positionExplorerParty();
        requestAnimationFrame(alignExplorationCharacterFeet);
      };''',
    "recalcular pés ao preparar tutorial",
)

replace_once(
    '''        echoBattleScene.src = area.scene;
        syncEchoMetrics();
        echoPlayerX = entrySide === "right" ? echoWorldWidth - 125 : 125;''',
    '''        echoBattleScene.src = area.scene;
        syncEchoMetrics();
        requestAnimationFrame(alignExplorationCharacterFeet);
        echoPlayerX = entrySide === "right" ? echoWorldWidth - 125 : 125;''',
    "recalcular pés ao entrar em qualquer mapa",
)

required = [
    "--explorer-hero-foot-offset",
    "--echo-player-foot-offset",
    "const alignExplorationCharacterFeet",
    "getExplorationCharacterBottomPadding",
    "requestAnimationFrame(alignExplorationCharacterFeet);",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"validação ausente: {marker}")

path.write_text(text, encoding="utf-8")
print("Âncora automática dos pés aplicada ao tutorial e aos cinco mapas da Clareira.")
