import type { Metadata } from "next";
import Link from "next/link";
import facets from "@/data/dictionary-facets.json";
import { getAllEntries } from "@/lib/dictionary";
import { pickWordOfTheDay, pickRandomEntry, buildQuiz, buildThematicCollections } from "@/lib/discover";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";
import { RandomWordCard } from "@/components/discover/RandomWordCard";
import { QuizWidget } from "@/components/discover/QuizWidget";

const CATEGORIES = Object.keys(facets.categorias);

export const metadata: Metadata = {
  title: "Descubrir — Berretín",
  description: "Palabra del día, expresiones al azar, un quiz breve y colecciones temáticas del diccionario de lunfardo Berretín.",
};
// Palabra del día es determinística por fecha, pero la expresión aleatoria
// y el quiz se recalculan en cada visita — la página entera queda dynamic.
export const dynamic = "force-dynamic";

export default function DescubrirPage() {
  const entries = getAllEntries();
  const wordOfTheDay = pickWordOfTheDay(entries);
  const initialRandom = pickRandomEntry(entries);
  const quiz = buildQuiz(entries, 5);
  const collections = buildThematicCollections(entries, CATEGORIES);
  const wordOfTheDayBadges = [...wordOfTheDay.categorias, ...wordOfTheDay.origenes];

  return (
    <>
      <div className="wrap discover-wrap">
        <nav className="word-nav">
          <Link href="/" className="back-btn">
            ← volver al diccionario
          </Link>
          <AuxNav />
        </nav>

        <header>
          <p className="word-letter">Berretín</p>
          <h1 className="admin-title">Descubrir</h1>
          <p className="tagline discover-tagline">palabra del día, expresiones al azar, un quiz breve y colecciones por tema — todo salido del mismo diccionario.</p>
        </header>

        <section className="discover-section">
          <h2 className="discover-section-title">Palabra del día</h2>
          <div className="discover-card">
            <p className="ficha-word">{wordOfTheDay.palabra}</p>
            <p className="ficha-meaning">{wordOfTheDay.definicion}</p>
            {wordOfTheDayBadges.length > 0 && (
              <span className="ficha-badges">
                {wordOfTheDayBadges.map((badge) => (
                  <span key={badge} className="ficha-badge">
                    {badge}
                  </span>
                ))}
              </span>
            )}
            <div className="discover-card-actions">
              <Link href={`/palabra/${wordOfTheDay.slug}`} className="back-btn">
                ver ficha completa
              </Link>
            </div>
          </div>
        </section>

        <section className="discover-section">
          <h2 className="discover-section-title">Expresión aleatoria</h2>
          <RandomWordCard initial={initialRandom} />
        </section>

        <section className="discover-section">
          <h2 className="discover-section-title">Quiz de lunfardo</h2>
          <QuizWidget questions={quiz} />
        </section>

        <section className="discover-section">
          <h2 className="discover-section-title">Colecciones temáticas</h2>
          <div className="discover-collections">
            {collections.map((collection) => (
              <Link key={collection.categoria} href={`/?categoria=${encodeURIComponent(collection.categoria)}`} className="discover-collection-card">
                <span className="discover-collection-name">{collection.categoria.toLocaleLowerCase("es")}</span>
                <span className="discover-collection-count">
                  {collection.total} {collection.total === 1 ? "palabra" : "palabras"}
                </span>
                {collection.sample.length > 0 && <span className="discover-collection-sample">{collection.sample.map((e) => e.palabra).join(" · ")}</span>}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
