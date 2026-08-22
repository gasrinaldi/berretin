import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap not-found-wrap">
      <p className="not-found-eyebrow">Berretín</p>
      <h1 className="not-found-title">No encontramos esa palabra</h1>
      <p className="not-found-text">La página o la expresión que buscás no está en el diccionario.</p>
      <Link href="/" className="back-btn">
        ← volver al diccionario
      </Link>
    </div>
  );
}
