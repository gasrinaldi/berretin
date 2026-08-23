"use server";

import { getAllEntries, type DictionaryEntry } from "@/lib/dictionary";
import { pickRandomEntry } from "@/lib/discover";

export async function getAnotherRandomWord(): Promise<DictionaryEntry> {
  return pickRandomEntry(getAllEntries());
}
