"use client";

import { useState } from "react";
import { CinematicHero } from "@/components/CinematicHero";

export function HomeClient() {
  const [query, setQuery] = useState("");

  return <CinematicHero query={query} onQueryChange={setQuery} />;
}
