import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryCounts, categoryPath, buildHubMetadata, formatCount } from "@/lib/dictionary-seo";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = buildHubMetadata({
  title: "Categorías del habla argentina | Berretín",
  description: "Explorá el diccionario por categoría: lunfardo, uso popular, fútbol, turf, jerga delictiva y más, con la cantidad real de entradas de cada una.",
  path: "/categorias",
});

export default function CategoriasPage() {
  const categories = getCategoryCounts();

  return (
    <>
      <div className="wrap dictionary-wrap seo-hub-wrap">
        <nav className="word-nav">
          <Link href="/" className="back-btn">
            ← volver al diccionario
          </Link>
          <AuxNav />
        </nav>

        <header className="seo-hub-header">
          <p className="consult-eyebrow">Berretín · índice</p>
          <h1 className="seo-hub-title">Categorías del habla argentina</h1>
          <p className="seo-hub-intro">Las palabras y expresiones del diccionario, agrupadas por categoría de uso.</p>
        </header>

        <ul className="seo-index-list">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={categoryPath(c.slug)} className="seo-index-row">
                <span className="seo-index-name">{c.name}</span>
                <span className="seo-index-count">
                  {formatCount(c.count)} {c.count === 1 ? "entrada" : "entradas"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </>
  );
}
