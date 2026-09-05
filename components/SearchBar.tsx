"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  id?: string;
  className?: string;
  // Solo la variante cinematográfica del hero pide el bloque con flecha a
  // la derecha (referencia visual del sello papel) — el buscador del
  // diccionario (consult-search) sigue exactamente como estaba.
  showSubmit?: boolean;
  // Opcional: cuando se pasa Y hay texto escrito, reemplaza la lupa por un
  // botón de limpiar. Sin este prop el comportamiento es exactamente el de
  // antes (solo la lupa), así que no afecta a ningún caller existente.
  onClear?: () => void;
};

export function SearchBar({ value, onChange, onSubmit, id = "search", className, showSubmit = false, onClear }: SearchBarProps) {
  return (
    <form
      className={`search-row${className ? ` ${className}` : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar una palabra o expresión…" aria-label="Buscar una palabra o expresión" />
      {onClear && value && (
        <button type="button" className="search-clear-btn" onClick={onClear} aria-label="Limpiar búsqueda">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      )}
      {showSubmit && (
        <button type="submit" className="search-submit-btn" aria-label="Buscar">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </form>
  );
}
