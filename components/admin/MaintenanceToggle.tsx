"use client";

import { useState } from "react";
import { setMaintenanceMode } from "@/app/admin/sitio/actions";

const ACTIVATE_WARNING = "El sitio dejará de estar disponible para visitantes. El panel de administración seguirá funcionando.";

type MaintenanceToggleProps = {
  initialMaintenanceMode: boolean;
  initialError: string | null;
};

// El estado mostrado solo cambia cuando el server action efectivamente
// confirma el nuevo valor — nunca se pisa de forma optimista. Así, si
// falla, el switch se queda exactamente donde estaba antes del click (el
// estado real en Supabase) en vez de mostrar algo que no es cierto.
export function MaintenanceToggle({ initialMaintenanceMode, initialError }: MaintenanceToggleProps) {
  const [maintenanceMode, setMaintenanceModeState] = useState(initialMaintenanceMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const handleToggle = async () => {
    const next = !maintenanceMode;

    if (next) {
      const confirmed = window.confirm(ACTIVATE_WARNING);
      if (!confirmed) return;
    }

    setPending(true);
    setError(null);
    const result = await setMaintenanceMode(next);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMaintenanceModeState(result.maintenanceMode);
  };

  return (
    <div className="admin-card admin-maintenance-card">
      <div className="admin-card-heading">
        <span className={`admin-status ${maintenanceMode ? "admin-status-rejected" : "admin-status-approved"}`}>
          {maintenanceMode ? "mantenimiento activo" : "online"}
        </span>
      </div>

      <p className="admin-maintenance-headline">{maintenanceMode ? "Modo mantenimiento activo" : "Sitio online"}</p>
      <p className="contribute-hint">
        {maintenanceMode
          ? "Los visitantes ven la pantalla de mantenimiento en todo el sitio. El panel de administración sigue funcionando normalmente."
          : "El sitio está disponible normalmente para todos los visitantes."}
      </p>

      <div className="admin-maintenance-switch-row">
        <button
          type="button"
          role="switch"
          aria-checked={maintenanceMode}
          className={`admin-switch${maintenanceMode ? " admin-switch-on" : ""}`}
          disabled={pending}
          onClick={handleToggle}
        >
          <span className="admin-switch-knob" />
        </button>
        <span className="admin-maintenance-switch-label">{pending ? "actualizando..." : maintenanceMode ? "Activado" : "Desactivado"}</span>
      </div>

      {error && <p className="contribute-error">{error}</p>}
    </div>
  );
}
