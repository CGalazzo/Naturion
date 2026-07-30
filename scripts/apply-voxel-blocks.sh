#!/usr/bin/env bash
set -euo pipefail

BASE_MERGE="8a3b5fe65fe555a8cec13d1d29906fc8910bde69"
mkdir -p /tmp/naturion-voxel

# Preserva melhorias técnicas atuais que não mudam a jogabilidade.
cp src/diorama/engine.js /tmp/naturion-voxel/engine.js
cp src/diorama/art/art-direction.js /tmp/naturion-voxel/art-direction.js
cp src/diorama/art/pixel-renderer.js /tmp/naturion-voxel/pixel-renderer.js
cp src/diorama/entity-system.js /tmp/naturion-voxel/entity-system.js
cp styles/diorama.css /tmp/naturion-voxel/diorama.css

# Reverte somente a reformulação orgânica anterior, recuperando a base voxel já testada.
git revert -m 1 --no-commit "$BASE_MERGE"

cp /tmp/naturion-voxel/engine.js src/diorama/engine.js
mkdir -p src/diorama/art
cp /tmp/naturion-voxel/art-direction.js src/diorama/art/art-direction.js
cp /tmp/naturion-voxel/pixel-renderer.js src/diorama/art/pixel-renderer.js
cp /tmp/naturion-voxel/entity-system.js src/diorama/entity-system.js
cp /tmp/naturion-voxel/diorama.css styles/diorama.css

# Aplica fábricas feitas especificamente para o novo mundo em blocos.
cp scripts/voxel-environment.template.js src/diorama/art/environment-factory.js
cp scripts/voxel-vegetation.template.js src/diorama/art/vegetation-factory.js
cp scripts/voxel-props.template.js src/diorama/art/prop-factory.js

python3 - <<'PY'
from pathlib import Path

art_path = Path('src/diorama/art/art-direction.js')
art = art_path.read_text()
old = '''  principles: Object.freeze([
    "silhuetas orgânicas e arredondadas",
    "luz principal quente e sombras verde-azuladas",
    "paletas pequenas por material",
    "detalhes agrupados em clusters legíveis",
    "profundidade em primeiro plano, área jogável, segundo plano e atmosfera",
    "pixelização estável sem filtros de suavização"
  ])'''
new = '''  principles: Object.freeze([
    "mundo construído em blocos cúbicos visíveis",
    "camadas voxel de grama, terra e pedra",
    "luz principal quente e sombras verde-azuladas",
    "texturas próprias do Naturion em 16x16 ou 32x32",
    "pixels consistentes em terreno, estruturas e personagens",
    "pixelização estável sem filtros de suavização"
  ])'''
if old not in art:
    raise SystemExit('Bloco VISUAL_BIBLE esperado não encontrado.')
art_path.write_text(art.replace(old, new))

# Confirma que o controlador voltou a usar exclusivamente o rig visual voxel.
player_path = Path('src/diorama/player-controller.js')
player = player_path.read_text()
if 'VoxelCharacterRig' not in player:
    player = player.replace('StorybookCharacterRig', 'VoxelCharacterRig')
player_path.write_text(player)

# Identidade de nomes da cena, sem tocar em dados funcionais.
stage_path = Path('src/diorama/stages/bosque-clareira.js')
stage = stage_path.read_text().replace('BosqueClareiraPixelDiorama', 'BosqueClareiraVoxelBlockWorld')
stage_path.write_text(stage)
PY

# Validação sintática e de imports locais.
find src/diorama -name '*.js' -print0 | xargs -0 -n1 node --check
python3 - <<'PY'
from pathlib import Path
import re
import subprocess

root = Path('.')
for path in root.glob('src/diorama/**/*.js'):
    text = path.read_text()
    for spec in re.findall(r'from\s+["\'](\.[^"\']+)["\']', text):
        target = (path.parent / spec).resolve()
        if not target.exists():
            raise SystemExit(f'Import local ausente: {path} -> {spec}')

def from_main(path):
    return subprocess.check_output(['git', 'show', f'origin/main:{path}'], text=True)

def between(text, start, end):
    a = text.index(start)
    b = text.index(end, a)
    return re.sub(r'\s+', '', text[a:b])

player_now = Path('src/diorama/player-controller.js').read_text()
player_main = from_main('src/diorama/player-controller.js')
for name in ('radius', 'walkSpeed', 'runSpeed', 'acceleration'):
    pattern = rf'this\.{name}\s*=\s*([^;]+);'
    now = re.search(pattern, player_now).group(1)
    main = re.search(pattern, player_main).group(1)
    if now != main:
        raise SystemExit(f'Valor mecânico alterado: {name}: {main} -> {now}')

stage_now = Path('src/diorama/stages/bosque-clareira.js').read_text()
stage_main = from_main('src/diorama/stages/bosque-clareira.js')
checks = [
    ('startPosition:', 'cameraBounds:'),
    ('cameraBounds:', 'focusPoints:'),
    ('focusPoints:', 'walkableZones:'),
    ('walkableZones:', 'obstacles:'),
    ('export const bosqueEntities = [', '];')
]
for start, end in checks:
    if between(stage_now, start, end) != between(stage_main, start, end):
        raise SystemExit(f'Estrutura funcional alterada entre {start} e {end}')

required_obstacles = [
    'radius: trunkRadius * 1.28',
    'radius: 0.72 * scale',
    'minX: x - 3.15',
    'minX: x - 0.8',
    'radius: 0.95',
    'minX: x - 2.8'
]
combined = Path('src/diorama/art/vegetation-factory.js').read_text() + Path('src/diorama/art/prop-factory.js').read_text()
for token in required_obstacles:
    if token not in combined:
        raise SystemExit(f'Obstáculo funcional não preservado: {token}')

for forbidden in ('SphereGeometry', 'CapsuleGeometry', 'TubeGeometry', 'DodecahedronGeometry'):
    visual = ''.join(Path(path).read_text() for path in [
        'src/diorama/art/character-factory.js',
        'src/diorama/art/environment-factory.js',
        'src/diorama/art/vegetation-factory.js',
        'src/diorama/art/prop-factory.js'
    ])
    if forbidden in visual:
        raise SystemExit(f'Geometria arredondada restante: {forbidden}')

print('Validação mecânica e visual concluída.')
PY

git diff --check

# Teste de construção e renderização real da cena.
cat > voxel-smoke.html <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><style>html,body,#viewport{width:960px;height:540px;margin:0;overflow:hidden}</style></head>
<body><div id="viewport"></div><pre id="result">AGUARDANDO</pre>
<script type="module">
try {
  const { DioramaEngine } = await import('./src/diorama/engine.js');
  const { bosqueClareiraStage, buildBosqueClareira, bosqueEntities } = await import('./src/diorama/stages/bosque-clareira.js');
  const { PlayerController } = await import('./src/diorama/player-controller.js');
  const engine = new DioramaEngine({ container: document.querySelector('#viewport'), stage: bosqueClareiraStage });
  const build = buildBosqueClareira({ scene: engine.scene, engine });
  const input = { getMovement: () => ({ x: 1, z: 1, running: true }) };
  const player = new PlayerController({ scene: engine.scene, stage: bosqueClareiraStage, input, characterImage: 'assets/selection/hero-male.webp', startPosition: bosqueClareiraStage.startPosition });
  engine.setPlayerObject(player.group);
  player.update(0.016, 1);
  engine.updateCamera(0.016, player.velocity);
  engine.renderer.render(engine.scene, engine.camera);
  const canvas = engine.renderer.domElement;
  if (!canvas.width || !canvas.height || !build.root || bosqueEntities.length !== 3) throw new Error('Cena incompleta');
  document.querySelector('#result').textContent = `PASS:${canvas.width}x${canvas.height}:objects=${engine.scene.children.length}`;
} catch (error) {
  document.querySelector('#result').textContent = `FAIL:${error.stack || error.message}`;
}
</script></body></html>
HTML
python3 -m http.server 4173 >/tmp/naturion-http.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 2
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME" ]]; then
  echo 'Chrome/Chromium não encontrado no runner.' >&2
  exit 1
fi
"$CHROME" --headless --no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist --run-all-compositor-stages-before-draw --virtual-time-budget=12000 --dump-dom http://127.0.0.1:4173/voxel-smoke.html >/tmp/naturion-voxel-dom.txt 2>/tmp/naturion-chrome.log
kill $SERVER_PID 2>/dev/null || true
trap - EXIT
grep -q 'PASS:' /tmp/naturion-voxel-dom.txt || { cat /tmp/naturion-voxel-dom.txt; cat /tmp/naturion-chrome.log; exit 1; }

echo 'Smoke test WebGL concluído.'

rm -f voxel-smoke.html
rm -f scripts/voxel-environment.template.js scripts/voxel-vegetation.template.js scripts/voxel-props.template.js scripts/apply-voxel-blocks.sh
rm -f .github/workflows/apply-voxel-blocks.yml

git add -A
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git commit -m "feat: converter Clareira dos Ecos para voxel em blocos [voxel-applied]"
git push origin HEAD
