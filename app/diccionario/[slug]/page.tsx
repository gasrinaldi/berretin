import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntryBySlug, getEntryPosition, isExpression } from "@/lib/dictionary";
import { getLetterHubPath, getCategoryHubPath, getAdjacentEntries, getExploreEntries } from "@/lib/dictionary-seo";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL, OG_URL, SITE_NAME, INDEXING_ALLOWED, cleanExcerpt, buildEntryTitle, buildEntryDescription } from "@/lib/site";
import { BackButton } from "@/components/BackButton";
import { BerretinInitial } from "@/components/BerretinInitial";
import { ShareButton } from "@/components/ShareButton";
import { ContributeButton } from "@/components/ContributeButton";
import { WordVote } from "@/components/WordVote";
import { ReportButton } from "@/components/ReportButton";
import { WordTabs } from "@/components/gallery/WordTabs";
import { Footer } from "@/components/Footer";

// Nada se prerenderiza en el build: cada palabra se genera la primera vez
// que alguien la visita (ISR "on demand") y queda cacheada como estática,
// evitando compilar ~15.000 páginas en cada deploy.
export function generateStaticParams() {
  return [];
}
export const revalidate = 86400;

function tipoLabel(palabra: string) {
  return isExpression(palabra) ? "Expresión" : "Palabra";
}

// Región asignada a mano desde /admin/regiones, si existe (Etapa 6). Nunca
// se infiere: si Supabase no está disponible o la palabra no tiene región
// cargada, se omite en silencio — la ficha sigue funcionando igual.
async function getWordRegion(wordSlug: string): Promise<string | null> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }
  const { data } = await supabase.from("word_regions").select("region").eq("word_slug", wordSlug).maybeSingle();
  return data?.region ?? null;
}

export async function generateMetadata({ params }: PageProps<"/diccionario/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);

  if (!entry) {
    return { title: `Palabra no encontrada | ${SITE_NAME}`, robots: { index: false, follow: true } };
  }

  const title = buildEntryTitle(entry.palabra);
  const description = buildEntryDescription(entry.palabra, entry.definicion);
  const url = `${SITE_URL}/diccionario/${entry.slug}`;
  // Temporal mientras berretin.com.ar no esté conectado (ver lib/site.ts):
  // openGraph.url/images van contra OG_URL, no contra el canonical de arriba.
  const ogUrl = `${OG_URL}/diccionario/${entry.slug}`;
  const ogImage = `${OG_URL}/brand/berretin-og.png`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: INDEXING_ALLOWED ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: ogUrl,
      siteName: SITE_NAME,
      locale: "es_AR",
      type: "article",
      // openGraph/twitter no heredan de layout.tsx cuando la página define
      // los suyos propios, así que la imagen hay que repetirla acá.
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function DiccionarioEntryPage({ params }: PageProps<"/diccionario/[slug]">) {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);

  if (!entry) notFound();

  const region = await getWordRegion(entry.slug);
  const position = getEntryPosition(entry.slug);
  const registro = position ? String(position).padStart(5, "0") : null;
  const tipo = tipoLabel(entry.palabra);
  // Solo las categorías con hub SEO real son links (/categoria/[slug]);
  // tipo, origen y región siguen siendo texto plano.
  const metaParts: { key: string; node: React.ReactNode }[] = [
    { key: "tipo", node: tipo },
    ...entry.categorias.map((cat) => {
      const href = getCategoryHubPath(cat);
      return { key: `cat-${cat}`, node: href ? <Link href={href}>{cat}</Link> : cat };
    }),
    ...entry.origenes.map((o) => ({ key: `ori-${o}`, node: o })),
    ...(region ? [{ key: "region", node: region }] : []),
  ];

  const letterHref = getLetterHubPath(entry.letra);
  const { prev, next } = getAdjacentEntries(entry.slug);
  const explore = getExploreEntries(entry, 6);
  const entryUrl = `${SITE_URL}/diccionario/${entry.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.palabra,
    description: entry.definicion,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${SITE_NAME} — Archivo del habla`,
      url: SITE_URL,
    },
    url: `${SITE_URL}/diccionario/${entry.slug}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diccionario", item: SITE_URL },
      ...(letterHref ? [{ "@type": "ListItem", position: 2, name: entry.letra, item: `${SITE_URL}${letterHref}` }] : []),
      { "@type": "ListItem", position: letterHref ? 3 : 2, name: entry.palabra, item: entryUrl },
    ],
  };

  return (
    <>
      {/* JSON.stringify no escapa "<": si algún día un campo trajera
          literalmente "</script>", cortaría el tag antes de tiempo. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />
      <div className="ficha-back-row ficha-back-row-split">
        <BackButton />
        <nav className="ficha-breadcrumb" aria-label="Ruta">
          <ol>
            <li>
              <Link href="/">Diccionario</Link>
            </li>
            {letterHref && (
              <li>
                <Link href={letterHref}>{entry.letra}</Link>
              </li>
            )}
            <li>
              <span aria-current="page">{entry.palabra}</span>
            </li>
          </ol>
        </nav>
      </div>
      <div className="ficha-detail">
        <div className="ficha-detail-grid">
          <aside className="ficha-detail-sidebar">
            {letterHref ? (
              <Link href={letterHref} className="ficha-detail-sidebar-letter-frame" aria-label={`Ver todas las palabras con ${entry.letra}`}>
                <BerretinInitial letter={entry.letra} className="ficha-detail-sidebar-letter" />
              </Link>
            ) : (
              <span className="ficha-detail-sidebar-letter-frame">
                <BerretinInitial letter={entry.letra} className="ficha-detail-sidebar-letter" />
              </span>
            )}
            {registro && <p className="ficha-detail-registro">N.º {registro}</p>}
          </aside>

          <article className="ficha-detail-main">
            <header className="ficha-detail-header">
              <h1 className="ficha-detail-title">{entry.palabra}</h1>
              {metaParts.length > 0 && (
                <p className="ficha-detail-meta">
                  {metaParts.map((part, i) => (
                    <span key={part.key}>
                      {i > 0 && " · "}
                      {part.node}
                    </span>
                  ))}
                </p>
              )}
            </header>

            <WordTabs wordSlug={entry.slug} definicion={entry.definicion} />

            <div className="ficha-detail-bottom">
              <WordVote wordSlug={entry.slug} />
              <div className="ficha-actions">
                <div className="ficha-actions-list">
                  <ShareButton word={entry.palabra} path={`/diccionario/${entry.slug}`} />
                  <ContributeButton wordSlug={entry.slug} wordPalabra={entry.palabra} />
                </div>
                <ReportButton wordSlug={entry.slug} />
              </div>
            </div>
          </article>
        </div>

        {(prev || next) && (
          <nav className="ficha-pager" aria-label="Palabras vecinas">
            {prev ? (
              <Link href={`/diccionario/${prev.slug}`} rel="prev" className="ficha-pager-link ficha-pager-prev">
                <span className="ficha-pager-dir">← anterior</span>
                <span className="ficha-pager-word">{prev.palabra}</span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
            {next ? (
              <Link href={`/diccionario/${next.slug}`} rel="next" className="ficha-pager-link ficha-pager-next">
                <span className="ficha-pager-dir">siguiente →</span>
                <span className="ficha-pager-word">{next.palabra}</span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        )}

        {explore.length > 0 && (
          <section className="ficha-explore" aria-labelledby="ficha-explore-title">
            <h2 className="ficha-explore-title" id="ficha-explore-title">
              Seguí explorando
            </h2>
            <ul className="ficha-explore-list">
              {explore.map((item) => (
                <li key={item.slug}>
                  <Link href={`/diccionario/${item.slug}`} className="ficha-explore-item">
                    <span className="ficha-explore-word">{item.palabra}</span>
                    <span className="ficha-explore-def">{cleanExcerpt(item.definicion, 96)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
