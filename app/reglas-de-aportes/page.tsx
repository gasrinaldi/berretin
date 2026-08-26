import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";
import { LEGAL_VERSION } from "@/lib/contributions";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Reglas de aportes | ${SITE_NAME}`,
  description: `Qué contenido se puede aportar a ${SITE_NAME} y qué no: autoría, derechos sobre imágenes y audios, y protección de menores.`,
  alternates: { canonical: "/reglas-de-aportes" },
};

export default function ReglasDeAportesPage() {
  return (
    <>
      <div className="wrap word-wrap">
        <nav className="word-nav">
          <BackButton />
          <AuxNav />
        </nav>

        <article className="word-article">
          <span className="word-letter">Berretín · legal</span>
          <h1 className="word-title">Reglas de aportes</h1>

          <div className="legal-content">
            <p className="legal-updated">Última actualización: {LEGAL_VERSION}</p>
            <p>
              Estas reglas definen qué podés enviar a Berretín (ejemplos, correcciones, significados alternativos, imágenes o ilustraciones, pronunciaciones en audio) y qué no. Todo aporte
              pasa por moderación antes de publicarse.
            </p>

            <section>
              <h2>Solo contenido propio o autorizado</h2>
              <p>
                Aceptamos únicamente aportes que sean de tu autoría o para los que tengas autorización explícita de compartir. No aceptamos contenido copiado de
                otro sitio, libro, red social o autor sin permiso.
              </p>
            </section>

            <section>
              <h2>Qué no aceptamos</h2>
              <ul>
                <li>Material copiado o plagiado de otra fuente sin autorización.</li>
                <li>Datos personales de terceros (teléfonos, direcciones, documentos, datos de contacto de otras personas).</li>
                <li>Spam, publicidad o contenido sin relación con el habla popular.</li>
                <li>Contenido ofensivo, discriminatorio, difamatorio o ilegal.</li>
              </ul>
            </section>

            <section>
              <h2>Imágenes y audios</h2>
              <p>
                Para subir una imagen, una ilustración o un audio necesitás tener los derechos sobre esa obra. Si en la imagen o el audio aparece una persona
                identificable (rostro o voz reconocible), necesitás además su permiso para compartirlo en Berretín.
              </p>
            </section>

            <section>
              <h2>Menores de edad</h2>
              <p>No aceptamos imágenes de menores de edad salvo que cuenten con autorización expresa de su madre, padre o tutor responsable.</p>
            </section>

            <section>
              <h2>Qué pasa si un aporte no cumple</h2>
              <p>
                Los aportes que no cumplan estas reglas se rechazan en moderación y no se publican. Los casos reiterados pueden derivar en la suspensión de la
                cuenta, según los <Link href="/terminos">Términos de uso</Link>.
              </p>
            </section>
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
