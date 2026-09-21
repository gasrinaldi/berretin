import type { Metadata } from "next";
import { getRoundTerms } from "./round-actions";
import { DesafioGame } from "@/components/desafio/DesafioGame";
import { AuxNav } from "@/components/AuxNav";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Desafío — Berretín",
  description: "¿Todavía se usa? Votá sobre la vigencia de palabras y expresiones reales del lunfardo porteño y comparalo con la comunidad.",
};

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
