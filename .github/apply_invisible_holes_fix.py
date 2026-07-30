from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_exact(old: str, new: str, label: str, expected: int = 1) -> None:
    global text
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: esperado {expected} trecho(s), encontrado {count}")
    text = text.replace(old, new)


# Restaura o piso inferior contínuo nos cinco ambientes. Somente as plataformas
# elevadas continuam usando limites pequenos e precisos.
replace_exact(
    """            [0, .18, .844],
            [.22, .42, .844],
            [.46, .58, .844],
            [.62, .72, .844],
            [.76, .88, .844],
            [.92, 1, .844],""",
    "            [0, 1, .844],",
    "restaurar piso da Entrada Luminal",
)
replace_exact(
    """            [0, .18, .846],
            [.22, .42, .846],
            [.46, .58, .846],
            [.62, .72, .846],
            [.76, .88, .846],
            [.92, 1, .846],""",
    "            [0, 1, .846],",
    "restaurar piso do Bosque das Raízes",
)
replace_exact(
    """            [0, .18, .842],
            [.22, .42, .842],
            [.46, .58, .842],
            [.62, .72, .842],
            [.76, .88, .842],
            [.92, 1, .842],""",
    "            [0, 1, .842],",
    "restaurar piso das Ruínas do Rio",
)
replace_exact(
    """            [0, .18, .84],
            [.22, .42, .84],
            [.46, .58, .84],
            [.62, .72, .84],
            [.76, .88, .84],
            [.92, 1, .84],""",
    "            [0, 1, .84],",
    "restaurar pisos da Trilha e do Santuário",
    expected=2,
)

# Guarda o último ponto em que os pés estavam realmente apoiados.
replace_exact(
    "      const stepEchoExploration = (now) => {",
    """      let echoLastSafeX = 150;
      let echoLastSafeY = 0;

      const stepEchoExploration = (now) => {""",
    "criar ponto seguro da exploração",
)

replace_exact(
    """        if (landing) {
          echoPlayerY = landing.y;
          echoVelocityY = 0;
          echoGrounded = true;
          echoPlayer.classList.remove("jumping");
        } else {
          echoPlayerY = Math.min(echoWorldHeight + 120, nextY);
          echoGrounded = false;
        }

        if (echoPlayerY > echoWorldHeight + 80) {
          echoPlayerX = echoAreaIndex ? 120 : 150;
          echoPlayerY = getEchoArea().platforms[0][2] * echoWorldHeight;
          echoVelocityY = 0;
          echoGrounded = true;
          showToast("Seu inicial ajudou você a voltar para a trilha.");
        }""",
    """        if (landing) {
          echoPlayerY = landing.y;
          echoVelocityY = 0;
          echoGrounded = true;
          echoLastSafeX = echoPlayerX;
          echoLastSafeY = echoPlayerY;
          echoPlayer.classList.remove("jumping");
        } else {
          echoPlayerY = Math.min(echoWorldHeight + 120, nextY);
          echoGrounded = false;
        }

        const echoBottomSafetyLine = getEchoArea().platforms[0][2] * echoWorldHeight + 36;
        if (echoPlayerY > echoBottomSafetyLine) {
          echoPlayerX = Math.max(8, Math.min(echoWorldWidth - 8, echoLastSafeX));
          echoPlayerY = echoLastSafeY || getEchoArea().platforms[0][2] * echoWorldHeight;
          echoVelocityX = 0;
          echoVelocityY = 0;
          echoGrounded = true;
          echoPlayer.classList.remove("jumping");
          showToast("Seu inicial ajudou você a voltar para a trilha.");
        }""",
    "registrar e restaurar a última posição segura",
)

replace_exact(
    """        echoPlayerX = entrySide === "right" ? echoWorldWidth - 125 : 125;
        echoPlayerY = area.platforms[0][2] * echoWorldHeight;
        echoPlayer.classList.toggle("facing-right", entrySide !== "right");""",
    """        echoPlayerX = entrySide === "right" ? echoWorldWidth - 125 : 125;
        echoPlayerY = area.platforms[0][2] * echoWorldHeight;
        echoLastSafeX = echoPlayerX;
        echoLastSafeY = echoPlayerY;
        echoPlayer.classList.toggle("facing-right", entrySide !== "right");""",
    "inicializar posição segura ao entrar na área",
)

checks = {
    "cinco pisos contínuos": sum(text.count(item) for item in (
        "[0, 1, .844]", "[0, 1, .846]", "[0, 1, .842]", "[0, 1, .84]"
    )) >= 5,
    "segmentos artificiais removidos": "[.22, .42, .844]" not in text and "[.22, .42, .846]" not in text,
    "última posição segura": "echoLastSafeX" in text and "echoBottomSafetyLine" in text,
    "colisão mínima preservada": "platform.from - 2" in text and "platform.to + 2" in text,
}
failed = [name for name, passed in checks.items() if not passed]
if failed:
    raise SystemExit("Validação falhou: " + ", ".join(failed))

path.write_text(text, encoding="utf-8")
