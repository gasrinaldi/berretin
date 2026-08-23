"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listContributions, signOutAdmin } from "@/app/admin/aportes/actions";
import { CONTRIBUTION_TYPES } from "@/lib/contributions";
import { DEFAULT_FILTERS, type ContributionRow, type ListFilters, type ListResult } from "@/lib/admin-contributions";
import { ContributionCard } from "@/components/admin/ContributionCard";

const STATUS_TABS: { value: ListFilters["status"]; label: string }[] = [
  { value: "pending", label: "pendientes" },
  { value: "approved", label: "aprobados" },
  { value: "rejected", label: "rechazados" },
  { value: "all", label: "todos" },
];

function filterSignature(f: ListFilters) {
  return `${f.status}|${f.type}|${f.word}|${f.dateFrom}|${f.dateTo}`;
}

type ModerationDashboardProps = {
  initial: ListResult | null;
  initialError: string | null;
};

export function ModerationDashboard({ initial, initialError }: ModerationDashboardProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [wordInput, setWordInput] = useState("");
  const [rows, setRows] = useState<ContributionRow[]>(initial?.rows ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [hasMore, setHasMore] = useState(initial?.hasMore ?? false);
  const [counts, setCounts] = useState(initial?.counts ?? { pending: 0, approved: 0, rejected: 0 });
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const lastSignature = useRef(filterSignature(DEFAULT_FILTERS));
  const skipNextFetch = useRef(Boolean(initial) || Boolean(initialError));

  const fetchPage = async (nextFilters: ListFilters, append: boolean) => {
    setLoading(true);
    const result = await listContributions(nextFilters);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows));
    setTotal(result.data.total);
    setHasMore(result.data.hasMore);
    setCounts(result.data.counts);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => (prev.word === wordInput.trim() ? prev : { ...prev, word: wordInput.trim(), page: 0 }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [wordInput]);

  useEffect(() => {
    if (skipNextFetch.current) {
      // Ya tenemos los datos iniciales del server component: no repetir el pedido.
      skipNextFetch.current = false;
      return;
    }
    const signature = filterSignature(filters);
    const append = signature === lastSignature.current && filters.page > 0;
    lastSignature.current = signature;
    fetchPage(filters, append);
  }, [filters]);

  const updateRow = (id: string, patch: Partial<ContributionRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRowIfFiltered = (id: string, newStatus: ContributionRow["status"]) => {
    if (filters.status !== "all" && filters.status !== newStatus) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      updateRow(id, { status: newStatus });
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-counters">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`filter-chip${filters.status === tab.value ? " active" : ""}`}
            onClick={() => setFilters((prev) => ({ ...prev, status: tab.value, page: 0 }))}
          >
            {tab.label} {tab.value !== "all" ? `(${counts[tab.value as "pending" | "approved" | "rejected"]})` : ""}
          </button>
        ))}
        <button
          type="button"
          className="back-btn admin-signout"
          onClick={() => {
            signOutAdmin().then(() => router.push("/admin/login"));
          }}
        >
          cerrar sesión
        </button>
      </div>

      <div className="admin-filters">
        <div className="contribute-field">
          <label htmlFor="admin-filter-word">Palabra</label>
          <input id="admin-filter-word" type="text" value={wordInput} onChange={(event) => setWordInput(event.target.value)} placeholder="buscar por palabra..." />
        </div>
        <div className="contribute-field">
          <label htmlFor="admin-filter-type">Tipo</label>
          <select id="admin-filter-type" value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value as ListFilters["type"], page: 0 }))}>
            <option value="all">todos</option>
            {CONTRIBUTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="contribute-field">
          <label htmlFor="admin-filter-from">Desde</label>
          <input id="admin-filter-from" type="date" value={filters.dateFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value, page: 0 }))} />
        </div>
        <div className="contribute-field">
          <label htmlFor="admin-filter-to">Hasta</label>
          <input id="admin-filter-to" type="date" value={filters.dateTo} onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value, page: 0 }))} />
        </div>
      </div>

      <p className="results-counter">
        {total} {total === 1 ? "aporte" : "aportes"}
      </p>

      {error && <p className="contribute-error contribute-error-general">{error}</p>}

      <div className="admin-list">
        {rows.map((row) => (
          <ContributionCard key={row.id} row={row} onChanged={removeRowIfFiltered} onUpdated={updateRow} />
        ))}
        {!loading && rows.length === 0 && !error && <p className="no-results">no hay aportes que coincidan con estos filtros</p>}
      </div>

      {hasMore && (
        <button type="button" className="load-more-btn" disabled={loading} onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}>
          {loading ? "cargando..." : "cargar más"}
        </button>
      )}
    </div>
  );
}
