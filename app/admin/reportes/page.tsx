import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ReportsList } from "@/components/admin/ReportsList";
import { listReports } from "@/app/admin/reportes/actions";

export const metadata: Metadata = { title: "Reportes — Berretín", robots: { index: false, follow: false } };
// Depende de la sesión en cada visita, igual que el resto de /admin.
export const dynamic = "force-dynamic";

export default async function AdminReportesPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const result = await listReports();

  return (
    <div className="wrap admin-wrap">
      <header className="admin-header">
        <div>
          <p className="word-letter">Berretín</p>
          <h1 className="admin-title">Reportes</h1>
        </div>
        <p className="admin-session">{admin.email}</p>
      </header>
      <AdminNav />
      <ReportsList initialRows={result.ok ? result.rows : []} initialError={result.ok ? null : result.error} />
    </div>
  );
}
