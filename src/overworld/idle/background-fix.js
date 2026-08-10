const style = document.createElement("style");
style.id = "idlePhaseOneBackgroundFix";
style.textContent = `
  .idle-app::before {
    background-image: url("assets/overworld/clareira-dos-ecos/ground-v2.webp?v=idle-phase1") !important;
  }
  .idle-puzzle::before {
    background-image: url("assets/puzzle/circulo-dos-ecos-santuario.webp?v=1") !important;
  }
`;
document.head.append(style);
