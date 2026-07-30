from pathlib import Path
import re


PATH = Path("index.html")
text = PATH.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, found {count}")
    text = text.replace(old, new, 1)


def regex_once(pattern: str, replacement: str, label: str) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 regex match, found {count}")


regex_once(
    r"    \.plumirel-world \{\n.*?    \.plumirel-world-name \{\n      display: none;\n    \}",
    """    .plumirel-world {
      --encounter-color: #8deaff;
      --encounter-bright: #f4ffff;
      --encounter-dark: #1f6b91;
      --encounter-detail: #ffe582;
      --crystal-delay: -.7s;
      position: absolute;
      z-index: 4;
      top: 18%;
      left: 72%;
      display: grid;
      isolation: isolate;
      width: clamp(72px, 7.4vw, 94px);
      height: clamp(112px, 11.8vw, 148px);
      place-items: end center;
      pointer-events: none;
      transform: translateX(-50%);
      transform-origin: 50% 100%;
      transition: filter .28s ease, transform .28s ease;
    }

    .plumirel-world::after {
      position: absolute;
      z-index: -1;
      right: 18%;
      bottom: -2px;
      left: 18%;
      height: 12px;
      border-radius: 50%;
      content: "";
      background: rgba(0, 0, 0, .42);
      filter: blur(4px);
    }

    .plumirel-world .crystal-visual {
      width: 100%;
      height: 100%;
    }

    .tutorial-world .plumirel-world {
      top: auto;
      bottom: 58%;
      left: 1900px;
      transform: translateX(-50%);
    }

    .plumirel-world.alert {
      filter: brightness(1.22);
      transform: translateX(-50%) scale(1.07);
    }

    .plumirel-world.alert .crystal-gem {
      animation: encounter-crystal-alert .48s steps(2, end) infinite;
    }

    .plumirel-world.alert .crystal-visual::before {
      opacity: .9;
    }

    .plumirel-world-name {
      display: none;
    }""",
    "tutorial crystal CSS",
)

replace_once(
    """    .puzzle-crystal.is-wrong .crystal-gem {
      filter: saturate(1.4) brightness(.9) hue-rotate(145deg);
      animation: none;
    }

    .puzzle-companion {""",
    """    .puzzle-crystal.is-wrong .crystal-gem {
      filter: saturate(1.4) brightness(.9) hue-rotate(145deg);
      animation: none;
    }

    .encounter-crystal {
      --encounter-color: #62dcff;
      --encounter-bright: #efffff;
      --encounter-dark: #245f82;
      --encounter-detail: #ffe27a;
      --crystal-delay: 0s;
    }

    .encounter-crystal .crystal-visual {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      isolation: isolate;
      filter:
        drop-shadow(0 4px 2px rgba(0, 0, 0, .5))
        drop-shadow(0 0 7px color-mix(in srgb, var(--encounter-color) 58%, transparent));
      pointer-events: none;
    }

    .encounter-crystal .crystal-base {
      opacity: .98;
      mix-blend-mode: normal;
      filter: grayscale(1) contrast(1.55) brightness(.48);
    }

    .encounter-crystal .crystal-gem {
      opacity: 1;
      mix-blend-mode: screen;
      filter: grayscale(1) contrast(1.68) brightness(1.4);
      animation: encounter-crystal-glow 2.8s ease-in-out var(--crystal-delay) infinite;
    }

    .encounter-crystal .crystal-visual::before {
      inset: 6% 8% 18%;
      opacity: .56;
      background: radial-gradient(ellipse, var(--encounter-bright) 0 8%, var(--encounter-color) 34%, transparent 72%);
      filter: blur(10px);
    }

    .encounter-crystal .crystal-visual::after {
      position: absolute;
      z-index: 3;
      inset: 0;
      clip-path: inset(0 0 20% 0);
      content: "";
      opacity: .84;
      background:
        linear-gradient(145deg, transparent 0 29%, var(--encounter-detail) 32% 37%, transparent 40%),
        linear-gradient(155deg, var(--encounter-bright), var(--encounter-color) 48%, var(--encounter-dark) 82%);
      -webkit-mask: url("assets/puzzle/crystal-blue-voxel.webp") center bottom / contain no-repeat;
      mask: url("assets/puzzle/crystal-blue-voxel.webp") center bottom / contain no-repeat;
      mix-blend-mode: screen;
      pointer-events: none;
    }

    @keyframes encounter-crystal-glow {
      0%, 100% {
        filter: grayscale(1) contrast(1.62) brightness(1.32);
      }
      50% {
        filter: grayscale(1) contrast(1.74) brightness(1.53);
      }
    }

    @keyframes encounter-crystal-alert {
      0%, 100% {
        filter: grayscale(1) contrast(1.72) brightness(1.42);
      }
      50% {
        filter: grayscale(1) contrast(1.9) brightness(1.78);
      }
    }

    .puzzle-companion {""",
    "shared encounter crystal CSS",
)

regex_once(
    r"    \.echo-wild \{\n.*?    \.echo-wild\.flying img \{\n      animation: echo-fly 1\.25s ease-in-out infinite;\n    \}",
    """    .echo-wild {
      position: absolute;
      isolation: isolate;
      width: var(--wild-size, 84px);
      height: calc(var(--wild-size, 84px) * 1.46);
      padding: 0;
      border: 0;
      background: transparent;
      transform: translate(-50%, -100%);
      transform-origin: 50% 100%;
      pointer-events: none;
      will-change: left, top;
    }

    .echo-wild .crystal-visual {
      width: 100%;
      height: 100%;
    }

    .echo-wild::after {
      right: 18%;
      bottom: -2px;
      left: 18%;
      width: auto;
      height: 10px;
      filter: blur(3px);
    }""",
    "echo wild crystal CSS",
)

replace_once(
    """        <div class="plumirel-world" id="plumirelWorld">
          <img
            src="assets/map/plumirel.webp"
            alt=""
            width="748"
            height="713"
          >
          <span class="plumirel-world-name">Plumirel · Nv. 3</span>
        </div>""",
    """        <div class="plumirel-world encounter-crystal" id="plumirelWorld" aria-label="Cristal Voador instável">
          <span class="crystal-visual" aria-hidden="true">
            <img class="crystal-base" src="assets/puzzle/crystal-blue-voxel.webp" alt="">
            <img class="crystal-gem" src="assets/puzzle/crystal-blue-voxel.webp" alt="">
          </span>
          <span class="plumirel-world-name">Cristal Voador instável</span>
        </div>""",
    "tutorial Plumirel markup",
)

replace_once(
    """            text: `Bem-vindos ao Bosque Luminal, ${playerLabel}. Os cristais daqui iluminam a floresta há muitas gerações.`,""",
    """            text: `Bem-vindos ao Bosque Luminal, ${playerLabel}. Estes cristais são os locais onde os Naturions se mantêm protegidos e em equilíbrio.`,""",
    "first tutorial crystal explanation",
)
replace_once(
    """            text: "O relógio detectou uma pequena essência voadora na clareira. Aproxime-se com calma: parece ser um Plumirel.",""",
    """            text: "Alguns cristais ficam instáveis e fazem o Naturion reagir de forma agressiva. O relógio detectou um cristal Voador instável à frente; há um Plumirel dentro dele.",""",
    "tutorial unstable crystal explanation",
)
replace_once(
    """        plumirelWorld.style.bottom = `${tutorialPlumirelY - 5}px`;""",
    """        plumirelWorld.style.bottom = `${tutorialPlumirelY - footInset}px`;""",
    "tutorial crystal grounding",
)
replace_once(
    '<div class="encounter-banner" id="encounterBanner" hidden>Um Plumirel selvagem apareceu!</div>',
    '<div class="encounter-banner" id="encounterBanner" hidden>O cristal instável reagiu!</div>',
    "tutorial encounter banner",
)
replace_once(
    'movementHint.textContent = "Muito bem! A câmera acompanha você. Continue em direção ao Plumirel.";',
    'movementHint.textContent = "Muito bem! A câmera acompanha você. Continue em direção ao cristal instável.";',
    "first movement hint",
)
replace_once(
    'movementHint.textContent = "Continue pela trilha. O Plumirel está logo adiante.";',
    'movementHint.textContent = "Continue pela trilha. O cristal instável está logo adiante.";',
    "second movement hint",
)
replace_once(
    'forestObjective.textContent = "Aproxime-se do Plumirel";',
    'forestObjective.textContent = "Aproxime-se do cristal instável";',
    "tutorial objective",
)
replace_once(
    'forestObjective.textContent = "Encontro selvagem!";',
    'forestObjective.textContent = "Cristal instável!";',
    "tutorial encounter objective",
)
replace_once(
    'movementHint.textContent = "O Plumirel percebeu vocês. Prepare-se para a batalha!";',
    'movementHint.textContent = "O cristal se abriu e revelou um Plumirel instável. Prepare-se para a batalha!";',
    "tutorial encounter hint",
)

for old, new in (
    ("count: 6,", "count: 4,"),
    ("count: 7,", "count: 4,"),
    ("count: 8,", "count: 5,"),
    ("count: 9,", "count: 5,"),
    ("count: 10,", "count: 6,"),
):
    replace_once(old, new, f"reduce crystal density {old}")

replace_once(
    '          objective: "Atravesse as raízes antigas e observe o comportamento dos Naturions.",',
    '          objective: "Atravesse as raízes antigas e localize os cristais instáveis.",',
    "echo objective wording",
)
replace_once(
    """              "Esta é a Clareira dos Ecos. Os Naturions daqui reagem ao som das ruínas e cada espécie se comporta de uma maneira.",
              "Alguns se aproximam, outros fogem e alguns apenas observam. Ao encostar em um deles, a batalha começa.",
              "Explore com calma. Você pode voltar às áreas anteriores quando quiser; os Naturions selvagens surgirão novamente em novos lugares."""",
    """              "Esta é a Clareira dos Ecos. Os Naturions daqui permanecem protegidos dentro de cristais ligados à energia das ruínas.",
              "A cor de cada cristal revela o elemento do Naturion. Quando um cristal fica instável, encostar nele inicia a batalha para restaurar seu equilíbrio.",
              "Explore com calma. Você pode voltar às áreas anteriores quando quiser; novos cristais instáveis surgirão em lugares diferentes."""",
    "Iris echo crystal dialogue",
)
replace_once(
    """              "A Clareira muda sempre que alguém atravessa uma passagem. Por isso os encontros nunca aparecem exatamente no mesmo lugar.",
              "Naturions que correm em sua direção costumam ser territoriais. Os que recuam só querem manter distância.""",
    """              "A Clareira muda sempre que alguém atravessa uma passagem. Por isso os cristais instáveis nunca aparecem exatamente no mesmo lugar.",
              "A cor de cada cristal indica o elemento do Naturion que se mantém nele. Aproxime-se apenas quando estiver pronto para batalhar.""",
    "Cael echo crystal dialogue",
)

regex_once(
    r"      const getWildSize = \(form\) => \{\n.*?      const spawnEchoWilds = \(\) => \{",
    """      const getWildSize = () => echoRandom(78, 88);

      const getEncounterCrystalStyle = (type) => {
        const [primaryType, secondaryType] = String(type || "").split("/");
        const primary = ESSENCE_TYPE_STYLES[primaryType] || {
          color: "#62dcff",
          glow: "#2d93c7",
          palette: ["#62dcff", "#efffff", "#245f82"]
        };
        const secondary = ESSENCE_TYPE_STYLES[secondaryType];
        return {
          color: primary.color,
          bright: primary.palette?.[1] || "#efffff",
          dark: primary.palette?.[2] || "#245f82",
          detail: secondary?.color || primary.glow
        };
      };

      const chooseEchoWild = (index) => {
        const area = getEchoArea();
        const level = echoRandom(area.levels[0], area.levels[1]);
        const chain = ECHO_WILD_CHAINS[echoRandom(0, ECHO_WILD_CHAINS.length - 1)];
        const form = getHighestForm(chain, level, area.maxStage, false);
        const elevatedPlatforms = area.platforms.slice(1);
        const availablePlatforms = elevatedPlatforms.length ? elevatedPlatforms : area.platforms;
        const platform = availablePlatforms[(index * 3 + echoAreaIndex) % availablePlatforms.length];
        const platformWidth = Math.max(.012, platform[1] - platform[0]);
        const inset = Math.min(.025, platformWidth * .2);
        const minRatio = platform[0] + inset;
        const maxRatio = platform[1] - inset;
        const centerRatio = (minRatio + maxRatio) / 2;
        const jitter = (Math.random() - .5) * Math.min(.012, platformWidth * .16);
        const xRatio = Math.max(minRatio, Math.min(maxRatio, centerRatio + jitter));
        return {
          instanceId: `${area.id}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
          chain,
          form,
          level,
          behavior: "idle",
          x: xRatio * echoWorldWidth,
          y: platform[2] * echoWorldHeight,
          minX: xRatio * echoWorldWidth,
          maxX: xRatio * echoWorldWidth,
          direction: 1,
          speed: 0,
          size: getWildSize(),
          crystalStyle: getEncounterCrystalStyle(form.type),
          crystalDelay: -(index % 4) * .42,
          element: null
        };
      };

      const renderEchoWild = (wild) => {
        const element = document.createElement("span");
        const visual = document.createElement("span");
        const base = document.createElement("img");
        const gem = document.createElement("img");
        element.className = "echo-wild encounter-crystal";
        element.dataset.wildId = wild.instanceId;
        element.dataset.element = wild.form.type;
        element.setAttribute("aria-label", `Cristal ${wild.form.type} instável`);
        element.style.setProperty("--wild-size", `${wild.size}px`);
        element.style.setProperty("--encounter-color", wild.crystalStyle.color);
        element.style.setProperty("--encounter-bright", wild.crystalStyle.bright);
        element.style.setProperty("--encounter-dark", wild.crystalStyle.dark);
        element.style.setProperty("--encounter-detail", wild.crystalStyle.detail);
        element.style.setProperty("--crystal-delay", `${wild.crystalDelay}s`);
        visual.className = "crystal-visual";
        visual.setAttribute("aria-hidden", "true");
        base.className = "crystal-base";
        gem.className = "crystal-gem";
        base.src = "assets/puzzle/crystal-blue-voxel.webp";
        gem.src = "assets/puzzle/crystal-blue-voxel.webp";
        base.alt = "";
        gem.alt = "";
        base.draggable = false;
        gem.draggable = false;
        visual.append(base, gem);
        element.append(visual);
        echoWildLayer.append(element);
        wild.element = element;
      };

      const spawnEchoWilds = () => {""",
    "stationary encounter crystal spawning",
)

regex_once(
    r"      const updateEchoWilds = \(dt, now\) => \{\n.*?      const updateEchoInteraction = \(\) => \{",
    """      const updateEchoWilds = () => {
        echoWilds.forEach((wild) => {
          if (!wild.element) return;
          wild.element.style.left = `${wild.x}px`;
          wild.element.style.top = `${wild.y}px`;

          if (
            echoActive
            && echoDialogue.hidden
            && echoPuzzle.hidden
            && echoBattle.hidden
            && echoEvolution.hidden
            && echoAbsorption.hidden
            && echoTeam.hidden
            && echoPassageConfirm.hidden
            && Math.abs(echoPlayerX - wild.x) < Math.max(44, wild.size * .44)
            && Math.abs(echoPlayerY - wild.y) < Math.max(74, wild.size * .56)
          ) {
            startEchoBattle(wild);
          }
        });
      };

      const updateEchoInteraction = () => {""",
    "stationary crystal encounter updates",
)

PATH.write_text(text, encoding="utf-8")

checks = {
    "tutorial crystal": 'class="plumirel-world encounter-crystal"' in text,
    "echo crystals": 'element.className = "echo-wild encounter-crystal";' in text,
    "same puzzle crystal art": text.count('assets/puzzle/crystal-blue-voxel.webp') >= 7,
    "no roaming map image": 'image.src = wild.form.image;' not in text,
    "stationary crystals": 'behavior: "idle"' in text and 'speed: 0' in text,
    "reduced density": all(value in text for value in ('count: 4,', 'count: 5,', 'count: 6,')),
    "tutorial explanation": 'Estes cristais são os locais onde os Naturions se mantêm protegidos' in text,
    "grounded tutorial base": 'tutorialPlumirelY - footInset' in text,
    "battle sprite preserved": 'echoBattleWildImage.src = wild.form.image;' in text,
    "absorption sprite preserved": 'echoAbsorbCreature.src = wild.form.image;' in text,
}
failed = [name for name, passed in checks.items() if not passed]
if failed:
    raise SystemExit("Validation failed: " + ", ".join(failed))
