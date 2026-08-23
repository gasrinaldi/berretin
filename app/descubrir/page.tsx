import type { Metadata } from "next";
import Link from "next/link";
import facets from "@/data/dictionary-facets.json";
import { getAllEntries } from "@/lib/dictionary";
import { pickWordOfTheDay, pickRandomEntry, buildQuiz, buildThematicCollections } from "@/lib/discover";
import { getRegionGroups, getDecadeGroups, getTrendingWords, getWeeklyIllustration } from "@/lib/discover-community";
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
// Las secciones que leen Supabase (mapa, décadas, tendencias, ilustración)
// están cacheadas aparte con unstable_cache, así que no pegan una consulta
// nueva en cada visita pese a que la página sea dynamic.
export const dynamic = "force-dynamic";

export default async function DescubrirPage() {
  const entries = getAllEntries();
  const wordOfTheDay = pickWordOfTheDay(entries);
  const initialRandom = pickRandomEntry(entries);
  const quiz = buildQuiz(entries, 5);
  const collections = buildThematicCollections(entries, CATEGORIES);
  const wordOfTheDayBadges = [...wordOfTheDay.categorias, ...wordOfTheDay.origenes];

  const [regionGroups, decadeGroups, trending, weeklyIllustration] = await Promise.all([getRegionGroups(), getDecadeGroups(), getTrendingWords(), getWeeklyIllustration()]);

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
              <Link href={`/diccionario/${wordOfTheDay.slug}`} className="back-btn">
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
          <h2 className="discover-section-title">Ilustración de la semana</h2>
          {weeklyIllustration ? (
            <div className="discover-illustration">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={weeklyIllustration.thumbnailSignedUrl} alt="" className="discover-illustration-img" />
              <div className="discover-illustration-caption">
                <span className="ficha-word">{weeklyIllustration.word}</span>
                <Link href={`/diccionario/${weeklyIllustration.wordSlug}`} className="back-btn">
                  ver ficha completa
                </Link>
              </div>
            </div>
          ) : (
            <p className="no-results">todavía no hay ilustraciones aprobadas para mostrar acá</p>
          )}
        </section>

        <section className="discover-section">
          <h2 className="discover-section-title">Tendencias</h2>
          {trending.length === 0 ? (
            <p className="no-results">todavía no hay suficiente actividad (votos o aportes) para armar un ranking</p>
          ) : (
            <ol className="discover-trends">
              {trending.map((item) => (
                <li key={item.wordSlug} className="discover-trend-item">
                  <Link href={`/diccionario/${item.wordSlug}`} className="discover-trend-word">
                    {item.word}
                  </Link>
                  <span className="discover-trend-meta">
                    {item.voteCount} {item.voteCount === 1 ? "voto" : "votos"} · {item.contributionCount} {item.contributionCount === 1 ? "aporte" : "aportes"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="discover-section">
          <h2 className="discover-section-title">Palabras por década</h2>
          {decadeGroups.length === 0 ? (
            <p className="no-results">todavía no hay aportes generacionales aprobados para agrupar</p>
          ) : (
            <div className="discover-groups">
              {decadeGroups.map((group) => (
                <div key={group.decade} className="discover-group">
                  <h3 className="discover-group-title">{group.decade}</h3>
                  <p className="discover-group-words">
                    {group.words.map((w, i) => (
                      <span key={w.wordSlug}>
                        {i > 0 && " · "}
                        <Link href={`/diccionario/${w.wordSlug}`}>{w.word}</Link>
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="discover-section">
          <h2 className="discover-section-title">Mapa por región</h2>
          {regionGroups.length === 0 ? (
            <p className="no-results">todavía no hay palabras con región asignada</p>
          ) : (
            <div className="discover-groups">
              {regionGroups.map((group) => (
                <div key={group.region} className="discover-group">
                  <h3 className="discover-group-title">{group.region}</h3>
                  <p className="discover-group-words">
                    {group.words.map((w, i) => (
                      <span key={w.wordSlug}>
                        {i > 0 && " · "}
                        <Link href={`/diccionario/${w.wordSlug}`}>{w.word}</Link>
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          )}
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
