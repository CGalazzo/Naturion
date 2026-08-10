const style = document.createElement("style");
style.id = "idlePhaseOneBackgroundFix";
style.textContent = `
  .idle-app::before {
    background-image: url("assets/overworld/clareira-dos-ecos/ground-v2.webp?v=idle-phase1") !important;
  }
  .idle-puzzle::before {
    background-image: url("assets/puzzle/circle-of-echoes-arena.webp?v=echo-puzzle-arena1") !important;
  }
`;
document.head.append(style);
