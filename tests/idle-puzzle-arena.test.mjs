import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const phaseSource = await readFile(new URL("../src/overworld/idle/phase1.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/overworld/idle/phase1.css", import.meta.url), "utf8");
const treadmillStyles = await readFile(new URL("../src/overworld/idle/treadmill.css", import.meta.url), "utf8");
const backgroundFix = await readFile(new URL("../src/overworld/idle/background-fix.js", import.meta.url), "utf8");
const arenaUrl = new URL("../assets/puzzle/circle-of-echoes-arena.webp", import.meta.url);
const sanctuaryUrl = new URL("../assets/puzzle/echoes-sanctuary-unlocked.webp", import.meta.url);
const arena = await readFile(arenaUrl);
const sanctuary = await readFile(sanctuaryUrl);
const arenaInfo = await stat(arenaUrl);
const sanctuaryInfo = await stat(sanctuaryUrl);

assert.equal(arena.subarray(0, 4).toString("ascii"), "RIFF", "a arena deve ser um WebP válido");
assert.equal(arena.subarray(8, 12).toString("ascii"), "WEBP", "a arena deve preservar o contêiner WebP");
assert.ok(arenaInfo.size > 100_000, "a arte da arena não pode ser substituída por um placeholder");
assert.equal(sanctuary.subarray(0, 4).toString("ascii"), "RIFF", "a tela do santuário deve usar um WebP válido");
assert.equal(sanctuary.subarray(8, 12).toString("ascii"), "WEBP", "a tela do santuário deve preservar o contêiner WebP");
assert.ok(sanctuaryInfo.size > 100_000, "a tela do santuário não pode ser trocada por um placeholder borrado");

assert.match(phaseSource, /circle-of-echoes-arena\.webp/, "o puzzle precisa carregar a arena aprovada");
assert.match(phaseSource, /echoes-sanctuary-unlocked\.webp/, "o santuário deve carregar a composição aprovada");
assert.match(phaseSource, /class="idle-sanctuary-party"/, "jogador e Naturion precisam ocupar o espaço entre totem e painel");
assert.match(phaseSource, /class="idle-sanctuary-action"[\s\S]*data-action="puzzle"/, "o botão desenhado deve continuar funcional");
assert.ok(
  phaseSource.indexOf('<div class="idle-totem"') > phaseSource.indexOf("</main>"),
  "o santuário precisa ficar fora da esteira para cobrir todo o HUD"
);
assert.match(phaseSource, /ui\.root\.inert = state\.puzzleUnlocked/, "a barra e os controles não podem continuar acessíveis atrás do santuário");
assert.equal((phaseSource.match(/class="idle-rune"/g) || []).length, 3, "o puzzle precisa manter três runas");
assert.equal((phaseSource.match(/class="idle-energy-path"/g) || []).length, 3, "cada pedestal precisa de um canal de energia");
assert.match(phaseSource, /shuffle\(\)[\s\S]*\[0, 1, 2\]/, "a sequência original de três runas precisa permanecer ativa");
assert.match(phaseSource, /saveEchoMapState[\s\S]*echoesSolved: true/, "a conclusão do puzzle precisa continuar salva");
assert.match(phaseSource, /PUZZLE_REPLAY_TEST_MODE = true/, "a repetição temporária precisa ficar explicitamente isolada");
assert.match(phaseSource, /if \(firstCompletion\)[\s\S]*saveEchoMapState/, "somente a primeira conclusão pode salvar a progressão");
assert.match(phaseSource, /Math\.hypot\(deltaX, deltaY\)/, "cada linha precisa usar a distância real entre runa e cristal");
assert.match(phaseSource, /Math\.atan2\(deltaY, deltaX\)/, "cada linha precisa apontar exatamente para o cristal");

assert.match(styles, /aspect-ratio:1672\/941/, "a arena não pode ser esticada");
assert.match(styles, /image-rendering:pixelated/, "a arte precisa preservar a nitidez pixel art");
assert.match(styles, /#echoOverworldScreen\.idle-host\{[^}]*width:100vw;height:100svh[^}]*contain:none/, "o santuário não pode ser recortado pelo contêiner antigo do mapa");
assert.match(styles, /data-rune="0"\]\{top:15\.2%;left:50%\}/, "a runa superior precisa ficar centralizada no pedestal");
assert.match(styles, /data-rune="1"\]\{top:63\.7%;left:73\.5%\}/, "a runa direita precisa ficar centralizada no pedestal");
assert.match(styles, /data-rune="2"\]\{top:63\.7%;left:26\.3%\}/, "a runa esquerda precisa ficar centralizada no pedestal");
assert.doesNotMatch(styles, /idle-energy-path\[data-path=/, "as linhas não podem voltar a usar ângulos fixos aproximados");
assert.match(styles, /\.idle-rune span\{[^}]*border:0;background:transparent;box-shadow:none/, "o símbolo precisa ficar diretamente na rocha, sem círculo");
assert.match(styles, /\.idle-rune\.active:before\{opacity:1/, "somente a tampa de pedra precisa ganhar brilho quando ativa");
assert.match(styles, /\.idle-rune:before\{[^}]*clip-path:polygon/, "o brilho precisa acompanhar a forma superior da rocha");
assert.match(styles, /\.idle-energy-path\{[^}]*background:linear-gradient/, "o canal precisa usar um fluxo contínuo de energia");
assert.doesNotMatch(styles, /\.idle-energy-path\{[^}]*repeating-linear-gradient/, "o canal não pode voltar ao tracejado neon");
assert.match(styles, /@keyframes echoEnergyFlow/, "o fluxo de energia precisa percorrer suavemente o canal");
assert.doesNotMatch(treadmillStyles, /\.idle-scene[^\n]*\.idle-totem/, "a esteira não pode mais limitar a tela do santuário");
assert.match(backgroundFix, /circle-of-echoes-arena\.webp/, "a tela do puzzle precisa usar a mesma arena como fundo");

console.log("Santuário e Círculo dos Ecos validados sem HUD, discos ou canais tracejados.");
