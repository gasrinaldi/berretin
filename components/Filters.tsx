import { categories, type Category } from "@/data/words";

type FiltersProps = {
  activeFilter: Category | "todas";
  onSelect: (category: Category | "todas") => void;
};

export function Filters({ activeFilter, onSelect }: FiltersProps) {
  return (
    <div className="filters" aria-label="Filtrar por categoría">
      <button className={`filter-chip ${activeFilter === "todas" ? "active" : ""}`} onClick={() => onSelect("todas")} type="button">todas</button>
      {Object.entries(categories).map(([category, details]) => (
        <button key={category} className={`filter-chip ${activeFilter === category ? "active" : ""}`} onClick={() => onSelect(category as Category)} type="button">
          {details.name}
        </button>
      ))}
    </div>
  );
}
