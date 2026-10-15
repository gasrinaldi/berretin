import type { Metadata } from "next";
import Link from "next/link";
import { getLetterCounts, letterPath, buildHubMetadata, formatCount } from "@/lib/dictionary-seo";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = buildHubMetadata({
  title: "Palabras por letra | Berretín",
  description: "Recorré el diccionario de lunfardo y habla argentina letra por letra: de la A a la Z, con la cantidad real de palabras y expresiones de cada una.",
  path: "/letras",
});

export default function LetrasPage() {
  const letters = getLetterCounts();
  const total = letters.reduce((sum, l) => sum + l.count, 0);

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
          <h1 className="seo-hub-title">Palabras por letra</h1>
          <p className="seo-hub-intro">
            {formatCount(total)} palabras y expresiones del habla argentina, agrupadas por la letra con la que empiezan.
          </p>
        </header>

        <ul className="seo-index-grid">
          {letters.map((l) => (
            <li key={l.slug}>
              <Link href={letterPath(l.slug)} className="seo-index-card">
                <span className="seo-index-letter">{l.letter}</span>
                <span className="seo-index-count">
                  {formatCount(l.count)} {l.count === 1 ? "entrada" : "entradas"}
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
