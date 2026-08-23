// Sello circular puramente decorativo ("archivo del habla"), construido en
// SVG real (nada de imagen raster). Siempre aria-hidden: no aporta
// información que no esté ya en el texto de la página.
export function BerretinSeal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" aria-hidden="true" focusable="false">
      <defs>
        <path id="berretin-seal-arc-top" d="M 18,74 A 52,52 0 0 1 122,74" fill="none" />
        <path id="berretin-seal-arc-bottom" d="M 122,72 A 52,52 0 0 1 18,72" fill="none" />
      </defs>
      <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="70" cy="70" r="50" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <text fontSize="9" letterSpacing="2.5" fill="currentColor">
        <textPath href="#berretin-seal-arc-top" startOffset="50%" textAnchor="middle">
          BERRETÍN
        </textPath>
      </text>
      <text fontSize="8" letterSpacing="2.5" fill="currentColor">
        <textPath href="#berretin-seal-arc-bottom" startOffset="50%" textAnchor="middle">
          ARCHIVO DEL HABLA
        </textPath>
      </text>
      <text x="70" y="82" textAnchor="middle" fontSize="36" fontFamily="var(--font-fraunces), serif" fontWeight="600" fontStyle="italic" fill="currentColor">
        B
      </text>
      <circle cx="70" cy="70" r="1.5" fill="currentColor" />
    </svg>
  );
}
