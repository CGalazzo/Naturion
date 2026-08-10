const screen = document.getElementById("centralSanctuaryScreen");

if (screen) {
  let phase = "idle";
  let encounterNode = null;

  const cleanupEncounter = () => {
    encounterNode?.remove();
    encounterNode = null;
  };

  const prepareGuardianDialog = (guardian) => {
    const team = guardian.querySelector(".central-guardian-team");
    const mapButton = guardian.querySelector("[data-action=guardian-map]");
    const title = guardian.querySelector("h2");
    const copy = guardian.querySelector("p");
    const label = guardian.querySelector("small");
    const accept = guardian.querySelector("[data-action=guardian]");

    if (team) team.style.display = "none";
    if (mapButton) mapButton.style.display = "none";
    if (label) label.textContent = "Guardião do Santuário Central";
    if (title) title.textContent = "Prove que é digno";
    if (copy) copy.textContent = "Sou o Guardião do Santuário Central. O Grande Cristal não se abre a qualquer viajante. Para alcançar o desafio final, derrote-me e prove que sua equipe é digna.";
    if (accept) accept.textContent = "Aceitar o desafio";
  };

  const approachGuardian = async (guardian) => {
    if (phase !== "idle") return;
    phase = "approaching";
    guardian.hidden = true;

    const scene = screen.querySelector(".idle-scene");
    if (!scene) {
      prepareGuardianDialog(guardian);
      phase = "dialog";
      guardian.hidden = false;
      return;
    }

    cleanupEncounter();
    encounterNode = document.createElement("div");
    encounterNode.setAttribute("aria-label", "Guardião do Santuário Central se aproximando");
    encounterNode.style.cssText = "position:absolute;z-index:9;right:-190px;bottom:15%;width:160px;height:180px;display:grid;place-items:end center;pointer-events:none;transition:right 1.15s cubic-bezier(.28,.7,.28,1);";

    const sprite = document.createElement("div");
    sprite.className = "central-guardian-sprite";
    sprite.style.cssText = "width:150px;height:150px;transform-origin:50% 100%;";
    encounterNode.append(sprite);
    scene.append(encounterNode);

    const bob = sprite.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-4px)" },
        { transform: "translateY(0)" }
      ],
      { duration: 320, iterations: Infinity, easing: "steps(2, end)" }
    );

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    encounterNode.style.right = "29%";
    await new Promise((resolve) => window.setTimeout(resolve, 1250));
    bob.cancel();
    cleanupEncounter();

    prepareGuardianDialog(guardian);
    phase = "dialog";
    guardian.hidden = false;
    guardian.querySelector("[data-action=guardian]")?.focus();
  };

  const observer = new MutationObserver(() => {
    const guardian = screen.querySelector(".central-guardian");
    if (!guardian) return;

    if (!guardian.hidden && phase === "idle") {
      void approachGuardian(guardian);
      return;
    }

    if (guardian.hidden && phase === "dialog") {
      phase = "idle";
      cleanupEncounter();
    }
  });

  observer.observe(screen, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"]
  });
}
