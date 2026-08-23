"use client";

import { useState } from "react";
import facets from "@/data/dictionary-facets.json";

const LETTERS = Object.keys(facets.letras);
const CATEGORIES = Object.keys(facets.categorias);
const ORIGINS = Object.keys(facets.origenes);
const TIPOS = [
  { value: "todas", label: "todas" },
  { value: "palabras", label: "palabras" },
  { value: "expresiones", label: "expresiones" },
] as const;

export type TipoFilter = (typeof TIPOS)[number]["value"];

export type FilterState = {
  letras: string[];
  categorias: string[];
  origenes: string[];
  sinCategoria: boolean;
  tipo: TipoFilter;
};

export const EMPTY_FILTERS: FilterState = { letras: [], categorias: [], origenes: [], sinCategoria: false, tipo: "todas" };

type DictionaryFiltersProps = {
  state: FilterState;
  onChange: (next: FilterState) => void;
  query: string;
  onQueryChange: (value: string) => void;
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Filtros siempre visibles (sin toggle, sin panel, sin píldoras) salvo
// categoría/origen, que en mobile quedan detrás de un botón "Filtros"
// (el buscador y el índice alfabético no se ocultan nunca). La lógica de
// filtrado es la misma de siempre — solo cambia la presentación.
export function DictionaryFilters({ state, onChange, query, onQueryChange }: DictionaryFiltersProps) {
  const [facetsOpen, setFacetsOpen] = useState(false);

  const facetCount = state.categorias.length + state.origenes.length + (state.sinCategoria ? 1 : 0);
  const activeFilterCount = state.letras.length + facetCount + (state.tipo !== "todas" ? 1 : 0);
  const hasActiveState = Boolean(query.trim()) || activeFilterCount > 0;

  const handleClearAll = () => {
    onQueryChange("");
    onChange(EMPTY_FILTERS);
  };

  const statusText = hasActiveState
    ? [query.trim() && `“${query.trim()}”`, activeFilterCount > 0 && `${activeFilterCount} ${activeFilterCount === 1 ? "filtro activo" : "filtros activos"}`].filter(Boolean).join(" · ")
    : "mostrando todo el archivo";

  return (
    <div className="consult-filters">
      <section className="consult-index" aria-label="Índice alfabético">
        <h2 className="consult-section-title">Índice alfabético</h2>
        {/* Selección exclusiva: cada palabra empieza con una sola letra, así
            que "todas" y las letras se comportan como un radiogroup — nunca
            puede haber más de una activa a la vez. */}
        <div className="consult-letters" role="radiogroup" aria-label="Filtrar por letra inicial">
          <button
            type="button"
            role="radio"
            aria-checked={state.letras.length === 0}
            className={`consult-letter${state.letras.length === 0 ? " active" : ""}`}
            onClick={() => onChange({ ...state, letras: [] })}
          >
            todas
          </button>
          {LETTERS.map((letter) => {
            const isActive = state.letras.includes(letter);
            return (
              <button
                key={letter}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`consult-letter${isActive ? " active" : ""}`}
                onClick={() => onChange({ ...state, letras: isActive ? [] : [letter] })}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </section>

      <section className="consult-tipo" aria-label="Tipo de entrada">
        <h2 className="consult-section-title">Tipo</h2>
        {/* También exclusiva: una entrada es palabra o expresión, nunca las dos. */}
        <div className="consult-letters" role="radiogroup" aria-label="Filtrar por tipo">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.value}
              type="button"
              role="radio"
              aria-checked={state.tipo === tipo.value}
              className={`consult-letter${state.tipo === tipo.value ? " active" : ""}`}
              onClick={() => onChange({ ...state, tipo: tipo.value })}
            >
              {tipo.label}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="consult-facets-toggle"
        aria-expanded={facetsOpen}
        onClick={() => setFacetsOpen((open) => !open)}
      >
        Filtros{facetCount > 0 ? ` (${facetCount})` : ""}
        <span aria-hidden="true" className={`consult-facets-toggle-caret${facetsOpen ? " open" : ""}`}>
          ↓
        </span>
      </button>

      <section className="consult-facets" aria-label="Categorías y orígenes" data-open={facetsOpen}>
        <div className="consult-facet-group">
          <h2 className="consult-section-title">Categoría</h2>
          <div className="consult-facet-list">
            <button
              type="button"
              className={`consult-facet-item${state.sinCategoria ? " active" : ""}`}
              onClick={() => onChange({ ...state, sinCategoria: !state.sinCategoria, categorias: [], origenes: [] })}
            >
              <span className="consult-facet-index">01</span>
              <span className="consult-facet-name">sin categoría</span>
            </button>
            {CATEGORIES.map((categoria, i) => (
              <button
                key={categoria}
                type="button"
                className={`consult-facet-item${state.categorias.includes(categoria) ? " active" : ""}`}
                onClick={() => onChange({ ...state, sinCategoria: false, categorias: toggleValue(state.categorias, categoria) })}
              >
                <span className="consult-facet-index">{String(i + 2).padStart(2, "0")}</span>
                <span className="consult-facet-name">{categoria.toLocaleLowerCase("es")}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="consult-facet-group">
          <h2 className="consult-section-title">Origen</h2>
          <div className="consult-facet-list">
            {ORIGINS.map((origen, i) => (
              <button
                key={origen}
                type="button"
                className={`consult-facet-item${state.origenes.includes(origen) ? " active" : ""}`}
                onClick={() => onChange({ ...state, sinCategoria: false, origenes: toggleValue(state.origenes, origen) })}
              >
                <span className="consult-facet-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="consult-facet-name">{origen.replace("Voz de origen ", "").toLocaleLowerCase("es")}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="consult-status-row">
        {hasActiveState && (
          <>
            <button type="button" className="consult-clear-btn" onClick={handleClearAll}>
              limpiar filtros
            </button>
            <span className="consult-status-sep" aria-hidden="true" />
          </>
        )}
        <span className="consult-status-text">{statusText}</span>
      </div>
    </div>
  );
}
