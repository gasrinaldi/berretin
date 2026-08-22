import fs from "node:fs";

const path = "data/words.ts";
const batchSize = 100;
const prefixes = [
  /^En el habla lunfarda, refiere a /i,
  /^En el habla lunfarda, significa /i,
  /^En lunfardo, refiere a /i,
  /^En lunfardo, significa /i,
  /^Voz lunfarda: /i,
  /^Voz lunfarda, /i,
  /^Voz lunfarda /i,
];
const fieldPattern = /meaning: "((?:\\.|[^"\\])*)"/;
const source = fs.readFileSync(path, "utf8");
const lines = source.split("\n");
const candidates = lines.map((line, index) => ({ line, index })).filter(({ line }) => {
  const meaning = line.match(fieldPattern)?.[1] ?? "";
  return prefixes.some((prefix) => prefix.test(meaning));
});
const batch = candidates.slice(0, batchSize);

function directMeaning(meaning) {
  let result = meaning;
  for (const prefix of prefixes) result = result.replace(prefix, "");
  result = result.replace(/^a /i, "").trim();
  return result ? result[0].toLocaleUpperCase("es") + result.slice(1) : result;
}

for (const { line, index } of batch) {
  const match = line.match(fieldPattern);
  if (!match) continue;
  const meaning = directMeaning(JSON.parse(`"${match[1]}"`));
  lines[index] = line.replace(fieldPattern, `meaning: ${JSON.stringify(meaning)}`);
}

fs.writeFileSync(path, lines.join("\n"));
console.log(JSON.stringify({ processed: batch.length, remaining: candidates.length - batch.length }, null, 2));
