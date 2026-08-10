import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const tutorial = await readFile(new URL("../src/overworld/main.js", import.meta.url), "utf8");
const engine = await readFile(new URL("../src/overworld/engine.js", import.meta.url), "utf8");
const clareiraTreadmill = await readFile(new URL("../src/overworld/idle/treadmill.js", import.meta.url), "utf8");
const player = await readFile(new URL("../src/overworld/player.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles/overworld.css", import.meta.url), "utf8");

assert.match(
  index,
  /O Relógio Cristalíneo detectou um Plumirel agitado adiante\. Vamos seguir pela trilha; mantenha seu Naturion por perto e prepare-se para o seu primeiro encontro\./,
  "a Dra. Íris precisa introduzir a aproximação de Plumirel"
);
assert.match(
  index,
  /Antes de investigarmos a instabilidade, mantenha \$\{starter\.name\} por perto/,
  "a fala anterior não pode continuar ensinando controles removidos desta sequência"
);

assert.match(tutorial, /texture\.wrapS = THREE\.MirroredRepeatWrapping/, "o bosque precisa repetir em esteira");
assert.match(tutorial, /materials\?\.textures\?\.ground/, "a esteira precisa mover a arte de chão existente");
assert.match(tutorial, /materials\?\.textures\?\.foreground/, "a esteira precisa mover a frente existente");
assert.match(
  tutorial,
  /import \{ getTreadmillImageUrl \} from "\.\/idle\/treadmill-image\.js\?v=3";[\s\S]*?tutorial-clareira-treadmill-strip/,
  "o tutorial precisa compartilhar a mesma imagem horizontal usada pela esteira da Clareira"
);
assert.match(clareiraTreadmill, /import\("\.\/treadmill-image\.js\?v=3"\)/, "a Clareira e o tutorial precisam apontar para a mesma fonte de imagem");
assert.match(
  tutorial,
  /TUTORIAL_TREADMILL_FALLBACK = "assets\/overworld\/clareira-dos-ecos\/ground-v2\.webp/,
  "o fundo de segurança também precisa vir da Clareira dos Ecos"
);
assert.match(tutorial, /mapBuild\?\.root\) mapBuild\.root\.visible = false/, "o cenário antigo não pode aparecer atrás da esteira compartilhada");
assert.match(tutorial, /engine\.scene\.background = null/, "o canvas precisa revelar o mesmo fundo da Clareira");
assert.match(engine, /alpha:\s*true/, "o canvas do tutorial precisa aceitar o fundo compartilhado sem uma cor opaca");
assert.match(tutorial, /TutorialTreadmillCompanion/, "o Naturion companheiro precisa aparecer na caminhada");
assert.match(
  tutorial,
  /player\.rig\.update\(\{[\s\S]*?state: "walking"[\s\S]*?TUTORIAL_WALK_VELOCITY/,
  "o protagonista precisa caminhar no lugar"
);
assert.match(
  tutorial,
  /plumirel\.root\.position\.x = THREE\.MathUtils\.lerp\([\s\S]*?plumirelStartX[\s\S]*?plumirelContactX/,
  "Plumirel precisa se aproximar pela direita"
);
assert.match(
  tutorial,
  /entities\.startEncounter\(plumirel\)/,
  "o fim da aproximação precisa usar o encontro já existente"
);
assert.match(
  tutorial,
  /const runEncounter = async \(entity\) => \{[\s\S]*?bridge\(\)\?\.startTutorialBattle/,
  "a esteira precisa continuar conduzindo à batalha tutorial existente"
);
assert.match(
  tutorial,
  /requestAnimationFrame\(startTutorialTreadmill\)/,
  "a esteira precisa começar somente após o diálogo inicial"
);

assert.match(player, /this\.walkSpeed = 5\.15;/, "a velocidade de caminhada não pode mudar");
assert.match(player, /this\.runSpeed = 7\.25;/, "a velocidade de corrida não pode mudar");
assert.match(player, /this\.acceleration = 13;/, "a aceleração não pode mudar");
assert.match(tutorial, /id: "plumirel-tutorial"[\s\S]*?level: 3/, "o nível de Plumirel precisa permanecer igual");

assert.match(
  styles,
  /\.overworld-screen\.tutorial-treadmill \.overworld-mobile-controls/,
  "controles que não se aplicam à sequência automática precisam ficar ocultos"
);
assert.match(styles, /@keyframes tutorialClareiraTreadmill[\s\S]*?translate3d\(-50%, 0, 0\)/, "o fundo compartilhado precisa manter a repetição em esteira");
assert.match(styles, /\.tutorial-clareira-treadmill-strip > span:nth-child\(even\)[\s\S]*?scaleX\(-1\)/, "a repetição precisa ser espelhada como na Clareira");
assert.match(index, /<strong>Bosque Luminal<\/strong>/, "a tela compartilhada precisa exibir o nome do mapa do tutorial");
assert.match(index, /styles\/overworld\.css\?v=2/, "o novo estilo precisa invalidar o cache");
assert.match(index, /src\/overworld\/main\.js\?v=2/, "o novo tutorial precisa invalidar o cache");

console.log("Esteira Three.js do tutorial e encontro original de Plumirel validados.");
