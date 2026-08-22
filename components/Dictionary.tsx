"use client";

import { useMemo } from "react";
import { LetterBlock } from "@/components/LetterBlock";
import { SearchBar } from "@/components/SearchBar";
import { words } from "@/data/words";

// Para ordenar/agrupar: ignora signos iniciales (¡, ¿, comillas, etc.) sin
// tocar la palabra visible, que siempre se muestra tal cual viene del TXT.
function sortKey(word: string) {
  return word.replace(/^[^\p{L}]+/u, "") || word;
}

// Pliega solo las vocales acentuadas para el encabezado de sección: "área"
// va bajo "A", igual que en cualquier diccionario en español. La "ñ" no se
// pliega: es una letra propia, no una variante acentuada de "n".
const VOWEL_ACCENTS: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };

function groupLetter(word: string) {
  const first = sortKey(word)[0]?.toLocaleLowerCase("es") ?? "";
  return (VOWEL_ACCENTS[first] ?? first).toLocaleUpperCase("es");
}

// Para buscar: ignora mayúsculas y acentos, sin alterar lo que se muestra.
function searchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es");
}

type DictionaryProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function Dictionary({ query, onQueryChange }: DictionaryProps) {
  const groups = useMemo(() => {
    const normalizedQuery = searchKey(query.trim());
    const filtered = words.filter((word) => {
      if (!normalizedQuery) return true;
      return [word.word, word.meaning].some((value) => searchKey(value).includes(normalizedQuery));
    });
    const grouped = filtered.sort((a, b) => sortKey(a.word).localeCompare(sortKey(b.word), "es")).reduce<Record<string, typeof words>>((result, word) => {
      const letter = groupLetter(word.word);
      (result[letter] ??= []).push(word);
      return result;
    }, {});
    return grouped;
  }, [query]);

  const letters = Object.keys(groups).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <>
      <div className="controls">
        <SearchBar value={query} onChange={onQueryChange} />
      </div>
      <main id="content">
        {letters.length > 0 ? letters.map((letter) => <LetterBlock key={letter} letter={letter} words={groups[letter]} />) : <p className="no-results">no encontramos nada con eso — probá con otra palabra</p>}
      </main>
    </>
  );
}
