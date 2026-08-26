import type { Metadata } from "next";

// Nunca indexable, sea cual sea SITE_INDEXING_ENABLED: es una pantalla
// temporal, no contenido del diccionario. proxy.ts reescribe acá (con
// 503 + Retry-After) todo el sitio público mientras maintenance_mode
// está activo; visitarla directamente también funciona (200 normal).
export const metadata: Metadata = {
  title: "Berretín — en mantenimiento",
  description: "Berretín está en mantenimiento. Volvemos en un rato.",
  robots: { index: false, follow: false },
};

export default function MantenimientoPage() {
  return (
    <div className="wrap maintenance-wrap">
      <p className="maintenance-eyebrow">Berretín</p>
      <h1 className="maintenance-title">Estamos acomodando algunas cosas.</h1>
      <p className="maintenance-text">El archivo del habla porteña va a volver en un rato.</p>
    </div>
  );
}
