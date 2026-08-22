"use client";

import facets from "@/data/dictionary-facets.json";

const LETTERS = Object.keys(facets.letras);
const CATEGORIES = Object.keys(facets.categorias);
const ORIGINS = Object.keys(facets.origenes);

export type FilterState = {
  letras: string[];
  categorias: string[];
  origenes: string[];
  sinCategoria: boolean;
};

type DictionaryFiltersProps = {
  state: FilterState;
  onChange: (next: FilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
  activeCount: number;
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function DictionaryFilters({ state, onChange, isOpen, onToggle, activeCount }: DictionaryFiltersProps) {
  return (
    <div className="dict-filters">
      <button type="button" className="filters-toggle" onClick={onToggle} aria-expanded={isOpen} aria-controls="dict-filters-panel">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        filtros
        {activeCount > 0 && <span className="filters-toggle-badge">{activeCount}</span>}
      </button>

      {isOpen && (
        <div className="filters-panel" id="dict-filters-panel">
          <div className="filters-group">
            <span className="filters-group-label">letra</span>
            <div className="filters">
              <button type="button" className={`filter-chip${state.letras.length === 0 ? " active" : ""}`} onClick={() => onChange({ ...state, letras: [] })}>
                todas
              </button>
              {LETTERS.map((letter) => (
                <button key={letter} type="button" className={`filter-chip${state.letras.includes(letter) ? " active" : ""}`} onClick={() => onChange({ ...state, letras: toggleValue(state.letras, letter) })}>
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="filters-group">
            <span className="filters-group-label">categoría</span>
            <div className="filters">
              <button
                type="button"
                className={`filter-chip${state.sinCategoria ? " active" : ""}`}
                onClick={() => onChange({ ...state, sinCategoria: !state.sinCategoria, categorias: [], origenes: [] })}
              >
                sin categoría
              </button>
              {CATEGORIES.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  className={`filter-chip${state.categorias.includes(categoria) ? " active" : ""}`}
                  onClick={() => onChange({ ...state, sinCategoria: false, categorias: toggleValue(state.categorias, categoria) })}
                >
                  {categoria.toLocaleLowerCase("es")}
                </button>
              ))}
            </div>
          </div>

          <div className="filters-group">
            <span className="filters-group-label">origen</span>
            <div className="filters">
              {ORIGINS.map((origen) => (
                <button
                  key={origen}
                  type="button"
                  className={`filter-chip${state.origenes.includes(origen) ? " active" : ""}`}
                  onClick={() => onChange({ ...state, sinCategoria: false, origenes: toggleValue(state.origenes, origen) })}
                >
                  {origen.replace("Voz de origen ", "").toLocaleLowerCase("es")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
