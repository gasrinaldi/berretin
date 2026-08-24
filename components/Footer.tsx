import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>© 2026 Berretín. Diseño, software y contenido editorial original. Las voces y expresiones del habla popular forman parte del patrimonio lingüístico común.</p>
        <nav className="site-footer-legal" aria-label="Legal">
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/reglas-de-aportes">Reglas de aportes</Link>
        </nav>
      </div>
    </footer>
  );
}
