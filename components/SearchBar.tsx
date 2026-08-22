"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  id?: string;
  className?: string;
};

export function SearchBar({ value, onChange, onSubmit, id = "search", className }: SearchBarProps) {
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
      <input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="buscar una palabra o expresión..." aria-label="Buscar una palabra o expresión" />
    </form>
  );
}
