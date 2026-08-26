import type { Metadata } from "next";
import { BackButton } from "@/components/BackButton";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";
import { LEGAL_VERSION } from "@/lib/contributions";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Política de privacidad | ${SITE_NAME}`,
  description: `Qué datos guarda ${SITE_NAME}, para qué los usa y cómo ejercer tus derechos de acceso, corrección y eliminación.`,
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <>
      <div className="wrap word-wrap">
        <nav className="word-nav">
          <BackButton />
          <AuxNav />
        </nav>

        <article className="word-article">
          <span className="word-letter">Berretín · legal</span>
          <h1 className="word-title">Política de privacidad</h1>

          <div className="legal-content">
            <p className="legal-updated">Última actualización: {LEGAL_VERSION}</p>
            <p>
              Berretín es un diccionario colaborativo de lunfardo y habla popular argentina. Esta política explica qué información guardamos cuando usás el sitio o
              hacés un aporte, para qué la usamos y qué derechos tenés sobre ella.
            </p>

            <section>
              <h2>Qué datos guardamos</h2>
              <ul>
                <li>
                  <strong>Cuenta:</strong> si te registrás, guardamos tu email (para iniciar sesión) y el alias público que elegís para tu perfil.
                </li>
                <li>
                  <strong>Aportes:</strong> el texto que enviás (ejemplo, corrección, significado alternativo, uso regional o generacional), el alias y el email que
                  indiques en el formulario (ambos opcionales) y, si corresponde, la imagen o el audio que subís.
                </li>
                <li>
                  <strong>Votos y reportes:</strong> tu voto sobre si una palabra &ldquo;todavía se usa&rdquo;, tu voto de utilidad a un aporte aprobado, y los
                  reportes que envíes (motivo y comentario).
                </li>
                <li>
                  <strong>Seguridad:</strong> guardamos un hash de tu dirección IP (no la IP completa) junto con cada aporte, voto o reporte, para poner límites de
                  envío, prevenir spam y bloquear abusos — nunca para identificarte individualmente.
                </li>
                <li>
                  <strong>Consentimientos:</strong> cada aporte queda con la fecha en que aceptaste los Términos de uso, la Política de privacidad y las Reglas de
                  aportes, y con la versión de esos textos vigente en ese momento.
                </li>
              </ul>
            </section>

            <section>
              <h2>Para qué los usamos</h2>
              <p>
                Solo para hacer funcionar el diccionario: mostrar y moderar aportes, mantener tu sesión iniciada, calcular estadísticas agregadas (por ejemplo,
                cuántas veces se votó una palabra) y, si dejaste tu email, contactarte por algo puntual relacionado con lo que enviaste. No vendemos ni compartimos
                tus datos con terceros con fines comerciales.
              </p>
            </section>

            <section>
              <h2>Dónde vive esta información</h2>
              <p>
                El sitio corre sobre <strong>Vercel</strong> (hosting y métricas de uso agregadas, vía Vercel Analytics y Speed Insights — sin cookies de rastreo ni
                identificadores personales) y guarda datos y archivos en <strong>Supabase</strong> (base de datos y almacenamiento de imágenes/audio). El inicio de
                sesión usa una cookie técnica necesaria para mantener tu sesión, no cookies de publicidad ni de seguimiento.
              </p>
            </section>

            <section>
              <h2>Cuánto tiempo los conservamos</h2>
              <p>
                Mientras tu cuenta o tus aportes sigan activos en el sitio. Los aportes rechazados en la moderación y los archivos que quedaron sin publicar se
                eliminan periódicamente. Podés pedir el borrado de tus datos en cualquier momento (ver más abajo).
              </p>
            </section>

            <section>
              <h2>Tus derechos</h2>
              <p>
                Podés pedirnos <strong>acceder</strong> a los datos que tenemos sobre vos, <strong>corregirlos</strong> si están mal, o <strong>eliminarlos</strong>{" "}
                (tu cuenta, tus aportes o ambos). Escribinos a <strong><a href="mailto:berretininfo@proton.me">berretininfo@proton.me</a></strong> indicando qué necesitás — vamos a responder por ese mismo medio.
              </p>
            </section>
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
