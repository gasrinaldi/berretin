import Link from "next/link";
import type { ReactNode } from "react";
import type { Paginated } from "@/lib/dictionary-seo";
import { hubPagePath, formatCount } from "@/lib/dictionary-seo";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";
import { SeoWordCard } from "@/components/SeoWordCard";

type SeoHubPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  // Ruta base del hub (sin /pagina/N), p.ej. "/letra/a".
  basePath: string;
  paged: Paginated;
  // Tira de navegación entre hermanos (otras letras / otras categorías).
  siblings?: ReactNode;
};

// Layout compartido de /letra/[letra] y /categoria/[slug] (y sus páginas
// paginadas). Todo Server Component: sin fetch cliente, sin JS necesario
// para ver las fichas ni para paginar.
export function SeoHubPage({ eyebrow, title, intro, basePath, paged, siblings }: SeoHubPageProps) {
  const { page, pageCount } = paged;
  const prev = page > 1 ? hubPagePath(basePath, page - 1) : null;
  const next = page < pageCount ? hubPagePath(basePath, page + 1) : null;

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
          <p className="consult-eyebrow">{eyebrow}</p>
          <h1 className="seo-hub-title">{title}</h1>
          <p className="seo-hub-intro">{intro}</p>
          {pageCount > 1 && (
            <p className="seo-hub-pageinfo">
              Página {page} de {pageCount} · {formatCount(paged.first)}–{formatCount(paged.last)} de {formatCount(paged.total)}
            </p>
          )}
        </header>

        {siblings}

        <div className="dict-col-header" aria-hidden="true">
          <span>Palabra / expresión</span>
          <span>Significado</span>
        </div>
        <div className="fichas">
          {paged.items.map((entry) => (
            <SeoWordCard key={entry.id} entry={entry} />
          ))}
        </div>

        {pageCount > 1 && (
          <nav className="seo-pagination" aria-label="Paginación">
            <div className="seo-pagination-steps">
              {prev ? (
                <Link href={prev} rel="prev">
                  ← anterior
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="seo-pagination-current">
                {page} / {pageCount}
              </span>
              {next ? (
                <Link href={next} rel="next">
                  siguiente →
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
            {/* Todas las páginas numeradas: evita que las últimas queden a
                decenas de saltos de "siguiente" en las listas largas. */}
            <ol className="seo-pagination-pages">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  {n === page ? (
                    <span aria-current="page">{n}</span>
                  ) : (
                    <Link href={hubPagePath(basePath, n)}>{n}</Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      <Footer />
    </>
  );
}
