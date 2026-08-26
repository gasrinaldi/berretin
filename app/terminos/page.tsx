import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";
import { LEGAL_VERSION } from "@/lib/contributions";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Términos de uso | ${SITE_NAME}`,
  description: `Condiciones de uso de ${SITE_NAME}: qué podés esperar del sitio, cómo moderamos los aportes y qué reglas rigen tu cuenta.`,
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <>
      <div className="wrap word-wrap">
        <nav className="word-nav">
          <BackButton />
          <AuxNav />
        </nav>

        <article className="word-article">
          <span className="word-letter">Berretín · legal</span>
          <h1 className="word-title">Términos de uso</h1>

          <div className="legal-content">
            <p className="legal-updated">Última actualización: {LEGAL_VERSION}</p>
            <p>
              Berretín es un archivo cultural y colaborativo del lunfardo y el habla popular argentina, sin fines de lucro. Al usar el sitio o enviar un aporte,
              aceptás estos términos.
            </p>

            <section>
              <h2>Qué es Berretín</h2>
              <p>
                Un diccionario navegable con fines culturales, educativos y de preservación del habla popular. El contenido editorial (definiciones originales) y
                los aportes de la comunidad se muestran de buena fe, tal como fueron recibidos o adaptados por moderación — no reemplazan una fuente académica o
                profesional.
              </p>
            </section>

            <section>
              <h2>Cuentas</h2>
              <p>
                Podés navegar y consultar el diccionario sin registrarte. Crear una cuenta es opcional y sirve para votar, aportar con tu alias y llevar un
                historial. Sos responsable de la actividad que ocurra con tu cuenta.
              </p>
            </section>

            <section>
              <h2>Moderación de aportes</h2>
              <p>
                Todo aporte (ejemplo, corrección, significado alternativo, foto, dibujo, audio, información regional o generacional) queda pendiente de revisión
                antes de publicarse. Berretín puede <strong>editar, rechazar o eliminar</strong> cualquier aporte, en cualquier momento y sin necesidad de dar aviso
                previo, si no cumple estos Términos o las{" "}
                <Link href="/reglas-de-aportes">Reglas de aportes</Link>. También podemos <strong>suspender o bloquear</strong> a un usuario que envíe contenido
                prohibido, abuse del formulario o incumpla reiteradamente estas condiciones.
              </p>
            </section>

            <section>
              <h2>Contenido prohibido</h2>
              <p>
                No está permitido enviar contenido copiado sin autorización, datos personales de terceros, spam, ni material ofensivo, discriminatorio o ilegal. El
                detalle completo está en las <Link href="/reglas-de-aportes">Reglas de aportes</Link>.
              </p>
            </section>

            <section>
              <h2>Propiedad del contenido</h2>
              <p>
                Cada autor conserva la propiedad de lo que aporta. Al enviarlo, otorgás a Berretín una licencia gratuita, no exclusiva y limitada al funcionamiento
                y difusión del proyecto para almacenarlo, adaptarlo técnicamente y publicarlo dentro del sitio y sus canales oficiales — nunca para venderlo a
                terceros.
              </p>
            </section>

            <section>
              <h2>Cambios</h2>
              <p>
                Podemos actualizar estos Términos para reflejar cambios en el sitio. La fecha de &ldquo;última actualización&rdquo; arriba indica la versión
                vigente; los aportes ya enviados quedan registrados con la versión que aceptaste en su momento.
              </p>
            </section>

            <section>
              <h2>Contacto</h2>
              <p>
                Consultas sobre estos Términos: <strong><a href="mailto:berretininfo@proton.me">berretininfo@proton.me</a></strong>.
              </p>
            </section>
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
