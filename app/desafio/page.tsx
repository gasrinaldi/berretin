import type { Metadata } from "next";
import { getRoundTerms } from "./round-actions";
import { buildHubMetadata } from "@/lib/dictionary-seo";
import { DesafioGame } from "@/components/desafio/DesafioGame";
import { AuxNav } from "@/components/AuxNav";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";

// canonical, og:url, imágenes y robots propios (mismo armado que los hubs SEO).
export const metadata: Metadata = buildHubMetadata({
  title: "Desafío — Berretín",
  description: "¿Todavía se usa? Votá sobre la vigencia de palabras y expresiones del habla argentina y comparalo con la comunidad.",
  path: "/desafio",
});

// Cada visita arma una ronda con una selección al azar del dataset local
// (ver round-actions.ts, sin Supabase) — la página tiene que quedar
// dynamic para que ese shuffle se recalcule en cada visita en vez de
// congelarse en el primer build/revalidate.
export const dynamic = "force-dynamic";

export default async function DesafioPage() {
  const initialTerms = await getRoundTerms();

  return (
    <>
      <div className="wrap word-wrap desafio-wrap">
        <nav className="word-nav">
          <BackButton />
          <AuxNav />
        </nav>

        <header className="desafio-intro">
          <p className="word-letter">Desafío</p>
          <h2 className="desafio-intro-title">¿Todavía se usa?</h2>
          <p className="desafio-intro-text">El idioma está vivo. Decinos cómo escuchás estas palabras hoy.</p>
        </header>

        <DesafioGame initialTerms={initialTerms} />
      </div>
      <Footer />
    </>
  );
}
