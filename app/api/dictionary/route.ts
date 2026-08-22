import { NextRequest, NextResponse } from "next/server";
import { searchEntries } from "@/lib/dictionary";

export type { DictionaryEntry } from "@/lib/dictionary";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchEntries({
    q: searchParams.get("q") ?? "",
    letras: searchParams.getAll("letra"),
    categorias: searchParams.getAll("categoria"),
    origenes: searchParams.getAll("origen"),
    sinCategoria: searchParams.get("sinCategoria") === "1",
    page: Number(searchParams.get("page") ?? "0"),
    limit: Number(searchParams.get("limit") ?? "50"),
  });

  return NextResponse.json(data);
}
