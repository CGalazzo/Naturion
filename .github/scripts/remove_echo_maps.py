from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")
original = text

# Mantém o destino visível no mapa-múndi, mas totalmente inativo enquanto a nova área não existe.
destination_pattern = re.compile(
    r'''        <button\n          class="world-destination world-first-destination unlocked"\n          id="worldFirstDestination"\n          type="button"\n          data-world-destination="clareira-dos-ecos"\n          aria-label="Viajar para a Clareira dos Ecos"\n        >'''
)
destination_replacement = '''        <button
          class="world-destination world-first-destination locked"
          id="worldFirstDestination"
          type="button"
          aria-label="Clareira dos Ecos — conteúdo ainda não disponível"
          disabled
        >'''
text, destination_count = destination_pattern.subn(destination_replacement, text)
assert destination_count == 1, f"Destino da Clareira encontrado {destination_count} vezes"

# Apaga as cinco definições antigas de mapas, plataformas, NPCs, puzzles e passagens.
areas_pattern = re.compile(
    r'''      const ECHO_AREAS = \[\n.*?\n      \];\n\n      /\*\n       \* Toda absorção''',
    re.DOTALL,
)
areas_replacement = '''      // Clareira dos Ecos removida para reconstrução completa a partir do zero.
      const ECHO_AREAS = [];

      /*
       * Toda absorção'''
text, areas_count = areas_pattern.subn(areas_replacement, text)
assert areas_count == 1, f"Bloco ECHO_AREAS encontrado {areas_count} vezes"

# Remove o único acesso ativo que abria a região antiga a partir do mapa-múndi.
listener_pattern = re.compile(
    r'''\n      worldFirstDestination\.addEventListener\("click", \(\) => \{\n        playClick\(523\);\n        if \(firstWorldDestinationReached\) \{\n          openEchoEntryConfirmation\(\);\n        \} else \{\n          void travelToFirstWorldDestination\(\);\n        \}\n      \}\);\n'''
)
text, listener_count = listener_pattern.subn(
    '\n      // Clareira dos Ecos sem conteúdo: o destino permanece visível, bloqueado e sem ação.\n',
    text,
)
assert listener_count == 1, f"Acesso ativo da Clareira encontrado {listener_count} vezes"

assert text != original, "Nenhuma alteração foi aplicada"
assert 'const ECHO_AREAS = [];' in text
assert 'data-world-destination="clareira-dos-ecos"' not in text
assert 'worldFirstDestination.addEventListener("click"' not in text
assert 'assets/echo-scenes/clareira-1.webp' not in text[text.index('const ECHO_AREAS = []'):text.index('const ESSENCE_STYLES')]
assert 'class="world-destination world-first-destination locked"' in text
assert 'id="worldFirstDestination"' in text
assert 'disabled\n        >' in text

path.write_text(text, encoding="utf-8")

# Os arquivos abaixo existem apenas para aplicar e validar este patch.
Path(".github/scripts/remove_echo_maps.py").unlink(missing_ok=True)
Path(".github/workflows/remove-echo-maps.yml").unlink(missing_ok=True)
