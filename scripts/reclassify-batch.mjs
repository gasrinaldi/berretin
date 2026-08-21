import fs from "node:fs";

const wordsPath = "data/words.ts";
const statePath = "scripts/.reclassify-state.json";
const target = process.argv[2] ?? "bajofondo";
const batchSize = Number(process.argv[3] ?? 100);
const source = fs.readFileSync(wordsPath, "utf8");
const lines = source.split("\n");
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};
const reviewedLines = new Set(state[target] ?? []);
const targets = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line, index }) => line.includes(`category: "${target}"`) && !reviewedLines.has(index));
const batch = targets.slice(0, batchSize);

const vesreWords = new Set([
  "gotán", "feca", "jermu", "colo", "mionca", "rioba", "tovaja", "zapán", "jotraba", "lorca", "sacri", "oletih", "yorugua", "telo", "nami", "ñoba", "sope", "ortiba", "troesma", "feca", "jermu", "lorsa", "dorima", "choma", "sopre", "grone", "mionca", "cobani", "bolonqui"
]);
const tumberoWords = /afano|afanar|afana|cana|cárcel|carcel|encanar|encanado|gayola|engayol|escruche|choreo|choro|chorro|punga|rati|yuta|botón|buchón|ortiba|cafúa|taquería|ratonera|fichar|ficha|tumber|tumba|preso|delito|delinc|robar|robo|ladrón|pibe chorro|berretín/i;
const tangoWords = /tango|tangu|milonga|gotán|percanta|mina|grela|bulín|feca|garufa|malevo|compadrito|prostíbulo|arrabal|cafetín|farra|chamuy|laburo|bacán/i;
const indigenaWords = /quechua|guaraní|guarani|indígena|indigena|pampa|choclo|mate|pucho|poroto|guacho|gurí|guri|changa|chacra|malón|malon|ñato|yapa/i;
const inmigracionWords = /italian|genov|dialect|inmigr|lunfardo de conventillo|italiano/i;

function getField(line, field) {
  return line.match(new RegExp(`${field}: "([^"]*)"`))?.[1] ?? "";
}

function classify(word, line) {
  const normalized = word.trim().toLocaleLowerCase("es");
  const context = line.toLocaleLowerCase("es");
  if (vesreWords.has(normalized) || /vesre|inversión silábica|invertid/.test(context)) return "vesre";
  if (tumberoWords.test(`${normalized} ${context}`)) return "tumbero";
  if (tangoWords.test(`${normalized} ${context}`)) return "tango";
  if (indigenaWords.test(context)) return "indigena";
  if (inmigracionWords.test(context)) return "inmigracion";
  return target;
}

const moved = {};
for (const { line, index } of batch) {
  const word = getField(line, "word");
  const next = classify(word, line);
  if (next !== target) {
    lines[index] = line.replace(`category: "${target}"`, `category: "${next}"`);
    moved[next] = (moved[next] ?? 0) + 1;
  }
  reviewedLines.add(index);
}
fs.writeFileSync(wordsPath, lines.join("\n"));
state[target] = [...reviewedLines].sort((a, b) => a - b);
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
console.log(JSON.stringify({ target, reviewed: batch.length, remaining: targets.length - batch.length, moved }, null, 2));
