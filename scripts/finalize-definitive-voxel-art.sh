#!/usr/bin/env bash
set -euo pipefail

BRANCH="change/definitive-voxel-art-pass"
BASE_REF="origin/main"
BEFORE_DIR="/tmp/naturion-clareira-before"
SCREEN_DIR="docs/visual-tests"

mkdir -p "$SCREEN_DIR"
git fetch origin main --quiet
rm -rf "$BEFORE_DIR"
git worktree add --detach "$BEFORE_DIR" "$BASE_REF" >/dev/null

python3 <<'PY'
from pathlib import Path
path = Path("src/diorama/stages/bosque-clareira.js")
text = path.read_text(encoding="utf-8")
mechanics = text.index("const rect =")
visual = text.index("const addRampSteps =", mechanics)
entities = text.index("export const bosqueEntities =", visual)
new_text = (
    'import { THREE } from "../engine.js";\n'
    'import { buildDefinitiveVoxelClareira } from "../art/voxel-clareira-composition.js";\n\n'
    + text[mechanics:visual]
    + 'export const buildBosqueClareira = ({ scene, engine }) => buildDefinitiveVoxelClareira({\n'
      '  scene,\n'
      '  engine,\n'
      '  stage: bosqueClareiraStage\n'
      '});\n\n'
    + text[entities:]
)
path.write_text(new_text, encoding="utf-8")
PY

python3 <<'PY'
import subprocess
from pathlib import Path

def git_show(path):
    return subprocess.check_output(["git", "show", f"origin/main:{path}"], text=True)

def stage_block(text):
    start = text.index("export const bosqueClareiraStage =")
    candidates = [marker for marker in ("const addRampSteps =", "export const buildBosqueClareira") if marker in text[start:]]
    end = min(text.index(marker, start) for marker in candidates)
    return text[start:end].strip()

def entity_block(text):
    return text[text.index("export const bosqueEntities ="):].strip()

path = "src/diorama/stages/bosque-clareira.js"
base = git_show(path)
current = Path(path).read_text(encoding="utf-8")
assert stage_block(base) == stage_block(current), "A definição funcional da fase foi alterada."
assert entity_block(base) == entity_block(current), "Os Naturions da fase foram alterados."

protected = [
    "src/diorama/player-controller.js",
    "src/diorama/input-controller.js",
    "src/diorama/battle-bridge.js",
    "src/diorama/main.js"
]
for protected_path in protected:
    base_text = git_show(protected_path)
    current_text = Path(protected_path).read_text(encoding="utf-8")
    assert base_text == current_text, f"Arquivo mecânico alterado: {protected_path}"
PY

if grep -RniE 'placeholder|TODO|molde temporário|teste visual' \
  src/diorama/art/voxel-art-direction.js \
  src/diorama/art/voxel-texture-atlas.js \
  src/diorama/art/voxel-material-library.js \
  src/diorama/art/voxel-world-kit.js \
  src/diorama/art/voxel-nature-kit.js \
  src/diorama/art/voxel-prop-kit.js \
  src/diorama/art/voxel-structure-kit.js \
  src/diorama/art/voxel-scene-effects.js \
  src/diorama/art/voxel-clareira-composition.js; then
  echo "Foram encontrados marcadores de conteúdo temporário." >&2
  exit 1
fi

find src/diorama -name '*.js' -print0 | xargs -0 -n1 node --check

node <<'NODE'
const fs = require('fs');
const path = require('path');
const files = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (target.endsWith('.js')) files.push(target);
  }
};
walk('src/diorama');
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const target = path.resolve(path.dirname(file), match[1]);
    if (!fs.existsSync(target)) throw new Error(`Import local ausente: ${file} -> ${match[1]}`);
  }
}
NODE

git diff --check

create_forms_module() {
  local root="$1"
  ROOT="$root" node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.env.ROOT;
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = ['escaruli', 'zumbel', 'failino'];
const forms = {};
for (const id of ids) {
  let cursor = 0;
  let found = null;
  while ((cursor = source.indexOf(id, cursor)) !== -1) {
    const snippet = source.slice(Math.max(0, cursor - 450), cursor + 1300);
    const image = snippet.match(/image\s*:\s*["']([^"']+)["']/);
    if (image) {
      const name = snippet.match(/name\s*:\s*["']([^"']+)["']/);
      found = { id, name: name?.[1] || id, image: image[1], stage: 1 };
      break;
    }
    cursor += id.length;
  }
  if (!found) throw new Error(`Não foi possível localizar a arte de ${id}.`);
  forms[id] = found;
}
fs.writeFileSync(path.join(root, 'visual-forms.js'), `export const forms = ${JSON.stringify(forms, null, 2)};\n`);
NODE
}

create_visual_harness() {
  local root="$1"
  create_forms_module "$root"
  cat > "$root/visual-harness.html" <<'HTML'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#102f2a}#view{width:1280px;height:720px}.diorama-canvas{width:100%;height:100%;display:block;image-rendering:pixelated}
</style>
</head>
<body>
<div id="view"></div><pre id="obstacles" hidden></pre>
<script type="module">
import { DioramaEngine } from './src/diorama/engine.js';
import { PlayerController } from './src/diorama/player-controller.js';
import { EntitySystem } from './src/diorama/entity-system.js';
import { bosqueClareiraStage, buildBosqueClareira, bosqueEntities } from './src/diorama/stages/bosque-clareira.js';
import { forms } from './visual-forms.js';

const fail = (error) => {
  document.documentElement.dataset.error = String(error?.stack || error);
  document.body.textContent = String(error?.stack || error);
};
window.addEventListener('error', (event) => fail(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => fail(event.reason));
try {
  const engine = new DioramaEngine({ container: document.getElementById('view'), stage: bosqueClareiraStage });
  buildBosqueClareira({ scene: engine.scene, engine });
  const input = { getMovement: () => ({ x: 0, z: 0, running: false }) };
  const player = new PlayerController({
    scene: engine.scene,
    stage: bosqueClareiraStage,
    input,
    characterImage: 'assets/selection/hero-male.webp',
    startPosition: { x: -7, z: 1 }
  });
  player.teleport({ x: -7, z: 1 });
  engine.setPlayerObject(player.group);
  engine.cameraTarget.copy(player.group.position);
  const entities = new EntitySystem({ scene: engine.scene, stage: bosqueClareiraStage, forms, onEncounter: async () => ({ outcome: 'fled' }) });
  entities.spawn(bosqueEntities);
  engine.addUpdater((delta, elapsed) => {
    const movement = player.update(delta, elapsed);
    entities.update(delta, elapsed, player.group.position);
    engine.updateCamera(delta, movement.velocity);
  });
  engine.start();
  document.getElementById('obstacles').textContent = JSON.stringify(bosqueClareiraStage.obstacles);
  window.setTimeout(() => {
    document.documentElement.dataset.ready = 'true';
    document.documentElement.dataset.entities = String(entities.entities.length);
  }, 2600);
} catch (error) { fail(error); }
</script>
</body>
</html>
HTML
}

create_integration_harness() {
  local root="$1"
  create_forms_module "$root"
  cat > "$root/integration-harness.html" <<'HTML'
<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><style>
html,body{width:100%;height:100%;margin:0}#dioramaViewport{width:960px;height:540px}.diorama-canvas{width:100%;height:100%;image-rendering:pixelated}[hidden]{display:none!important}
</style></head>
<body>
<div id="openForestMap"></div><button id="worldFirstDestination"></button>
<section id="dioramaScreen" hidden><div id="dioramaViewport" tabindex="0"></div><span id="dioramaObjective"></span><span id="dioramaInteraction" hidden></span><span id="dioramaMovementState"></span><button id="dioramaBackMap"></button><button id="dioramaTeamButton"></button></section>
<div id="dioramaTeamPanel" hidden><div id="dioramaTeamGrid"></div><button id="dioramaTeamClose"></button></div><div id="toast"></div>
<pre id="result"></pre>
<script type="module">
import { forms } from './visual-forms.js';
import { BattleBridge } from './src/diorama/battle-bridge.js';
window.__naturionEcho = { forms };
window.__savedState = null;
window.__returnedToMap = false;
window.NaturionDioramaBridge = {
  getPlayer: () => ({ character: 'male', starter: null, team: [], dioramaProgress: null }),
  requestStageEntry: async () => true,
  prepareStageEntry: () => true,
  saveState: (state) => { window.__savedState = state; },
  returnToWorldMap: () => { window.__returnedToMap = true; },
  startBattle: async () => ({ outcome: 'fled' })
};
const fail = (error) => { document.documentElement.dataset.error = String(error?.stack || error); document.getElementById('result').textContent = String(error?.stack || error); };
window.addEventListener('error', (event) => fail(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => fail(event.reason));
try {
  await import('./src/diorama/main.js');
  window.dispatchEvent(new CustomEvent('naturion:open-diorama'));
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const screen = document.getElementById('dioramaScreen');
  if (screen.hidden || !document.querySelector('.diorama-canvas')) throw new Error('A entrada na Clareira não criou a cena.');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 700));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
  const bridge = new BattleBridge({ stageId: 'bosque-clareira-diorama', sceneImage: 'assets/map/bosque-luminal.webp' });
  const battle = await bridge.start({ id: 'teste', form: forms.escaruli, level: 4 });
  if (battle.outcome !== 'fled') throw new Error('A ponte de batalha não retornou corretamente.');
  document.getElementById('dioramaBackMap').click();
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (!window.__savedState || !window.__returnedToMap) throw new Error('Save ou retorno ao mapa-múndi não foi chamado.');
  if (document.getElementById('openForestMap').hidden) throw new Error('O mapa-múndi não foi restaurado.');
  const result = { entered: true, canvas: true, battle: battle.outcome, saved: window.__savedState, returned: window.__returnedToMap };
  document.getElementById('result').textContent = JSON.stringify(result);
  document.documentElement.dataset.ready = 'true';
} catch (error) { fail(error); }
</script>
</body>
</html>
HTML
}

CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME" ]]; then
  echo "Chrome/Chromium não encontrado no runner." >&2
  exit 1
fi

capture_root() {
  local root="$1"
  local port="$2"
  local output="$3"
  local dom="$4"
  create_visual_harness "$root"
  python3 -m http.server "$port" --directory "$root" >/tmp/naturion-http-$port.log 2>&1 &
  local server_pid=$!
  trap 'kill $server_pid 2>/dev/null || true' RETURN
  sleep 1
  "$CHROME" --headless=new --no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --ignore-certificate-errors --window-size=1280,720 --virtual-time-budget=6500 --dump-dom "http://127.0.0.1:$port/visual-harness.html" > "$dom" 2>"/tmp/chrome-$port.log"
  grep -q 'data-ready="true"' "$dom"
  ! grep -q 'data-error=' "$dom"
  grep -q 'data-entities="3"' "$dom"
  "$CHROME" --headless=new --no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --ignore-certificate-errors --window-size=1280,720 --virtual-time-budget=6500 --screenshot="$output" "http://127.0.0.1:$port/visual-harness.html" >/tmp/chrome-shot-$port.log 2>&1
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  trap - RETURN
}

capture_root "$BEFORE_DIR" 4173 "$PWD/$SCREEN_DIR/clareira-before.png" "/tmp/clareira-before-dom.html"
capture_root "$PWD" 4174 "$PWD/$SCREEN_DIR/clareira-after.png" "/tmp/clareira-after-dom.html"

python3 <<'PY'
import html, json, re
from pathlib import Path

def obstacles(path):
    source = Path(path).read_text(encoding='utf-8')
    match = re.search(r'<pre id="obstacles" hidden="">(.*?)</pre>', source, re.S)
    if not match:
        match = re.search(r'<pre id="obstacles" hidden>(.*?)</pre>', source, re.S)
    if not match:
        raise RuntimeError(f'Obstáculos não encontrados em {path}')
    return json.loads(html.unescape(match.group(1)))

before = obstacles('/tmp/clareira-before-dom.html')
after = obstacles('/tmp/clareira-after-dom.html')
if before != after:
    raise RuntimeError('As colisões geradas pela composição visual foram alteradas.')
PY

create_integration_harness "$PWD"
python3 -m http.server 4175 --directory "$PWD" >/tmp/naturion-integration-http.log 2>&1 &
INTEGRATION_PID=$!
sleep 1
"$CHROME" --headless=new --no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --ignore-certificate-errors --window-size=1100,700 --virtual-time-budget=9000 --dump-dom "http://127.0.0.1:4175/integration-harness.html" > /tmp/integration-dom.html 2>/tmp/integration-chrome.log
kill "$INTEGRATION_PID" 2>/dev/null || true
wait "$INTEGRATION_PID" 2>/dev/null || true
grep -q 'data-ready="true"' /tmp/integration-dom.html
! grep -q 'data-error=' /tmp/integration-dom.html
grep -q '"battle":"fled"' /tmp/integration-dom.html
grep -q '"returned":true' /tmp/integration-dom.html

python3 -m pip install --quiet pillow
python3 <<'PY'
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
before = Image.open('docs/visual-tests/clareira-before.png').convert('RGB')
after = Image.open('docs/visual-tests/clareira-after.png').convert('RGB')
canvas = Image.new('RGB', (before.width + after.width, before.height + 46), (12, 31, 27))
canvas.paste(before, (0, 46))
canvas.paste(after, (before.width, 46))
draw = ImageDraw.Draw(canvas)
draw.text((20, 14), 'ANTES — moldes voxel temporários', fill=(238, 241, 213))
draw.text((before.width + 20, 14), 'DEPOIS — kit voxel definitivo Naturion', fill=(238, 241, 213))
canvas.save('docs/visual-tests/clareira-comparison.png', optimize=True)
PY

rm -f visual-harness.html visual-forms.js integration-harness.html
rm -f "$BEFORE_DIR/visual-harness.html" "$BEFORE_DIR/visual-forms.js"
git worktree remove "$BEFORE_DIR" --force >/dev/null

rm -f scripts/finalize-definitive-voxel-art.sh .github/workflows/finalize-definitive-voxel-art.yml

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
git commit -m "art: finalizar Clareira voxel com kit autoral [art-pass-complete]"
git push origin "$BRANCH"
