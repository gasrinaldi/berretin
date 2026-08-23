import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { DEFAULT_FILTERS } from "@/lib/admin-contributions";
import { listContributions } from "@/app/admin/aportes/actions";
import { ModerationDashboard } from "@/components/admin/ModerationDashboard";

export const metadata: Metadata = { title: "Aportes — Berretín", robots: { index: false, follow: false } };
// Depende de la cookie de sesión en cada visita — nunca debe quedar
// prerenderizada como estática (si lo hiciera, la redirección evaluada sin
// sesión durante el build quedaría fija para todas las visitas futuras).
export const dynamic = "force-dynamic";

export default async function AdminContributionsPage() {
  // Segunda verificación server-side (proxy.ts ya filtra, pero cada
  // página y cada acción vuelve a chequear por su cuenta).
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const initial = await listContributions(DEFAULT_FILTERS);

  return (
    <div className="wrap admin-wrap">
      <header className="admin-header">
        <div>
          <p className="word-letter">Berretín</p>
          <h1 className="admin-title">Aportes pendientes de revisión</h1>
        </div>
        <p className="admin-session">{admin.email}</p>
      </header>
      <ModerationDashboard initial={initial.ok ? initial.data : null} initialError={initial.ok ? null : initial.error} />
    </div>
  );
}
