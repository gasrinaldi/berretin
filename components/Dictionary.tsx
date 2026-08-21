"use client";

import { useMemo, useState } from "react";
import { Filters } from "@/components/Filters";
import { LetterBlock } from "@/components/LetterBlock";
import { SearchBar } from "@/components/SearchBar";
import { words, type Category } from "@/data/words";

export function Dictionary() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Category | "todas">("todas");
  const groups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const filtered = words.filter((word) => {
      const matchesFilter = activeFilter === "todas" || word.category === activeFilter;
      const matchesQuery = !normalizedQuery || [word.word, word.meaning].some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
    const grouped = filtered.sort((a, b) => a.word.localeCompare(b.word, "es")).reduce<Record<string, typeof words>>((result, word) => {
      const letter = word.word[0].toLocaleUpperCase("es");
      (result[letter] ??= []).push(word);
      return result;
    }, {});
    return grouped;
  }, [activeFilter, query]);

  const letters = Object.keys(groups).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <>
      <div className="controls">
        <SearchBar value={query} onChange={setQuery} />
        <Filters activeFilter={activeFilter} onSelect={setActiveFilter} />
      </div>
      <main id="content">
        {letters.length > 0 ? letters.map((letter) => <LetterBlock key={letter} letter={letter} words={groups[letter]} />) : <p className="no-results">no encontramos nada con eso — probá con otra palabra</p>}
      </main>
    </>
  );
}
