import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { MaintenanceToggle } from "@/components/admin/MaintenanceToggle";
import { getMaintenanceMode } from "@/app/admin/sitio/actions";

export const metadata: Metadata = { title: "Sitio — Berretín", robots: { index: false, follow: false } };
// Depende de la sesión en cada visita, igual que /admin/aportes y /admin/desafio.
export const dynamic = "force-dynamic";

export default async function AdminSitioPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const result = await getMaintenanceMode();

  return (
    <div className="wrap admin-wrap">
      <header className="admin-header">
        <div>
          <p className="word-letter">Berretín</p>
          <h1 className="admin-title">Sitio</h1>
        </div>
        <p className="admin-session">{admin.email}</p>
      </header>
      <AdminNav />
      <MaintenanceToggle initialMaintenanceMode={result.ok ? result.maintenanceMode : false} initialError={result.ok ? null : result.error} />
    </div>
  );
}
