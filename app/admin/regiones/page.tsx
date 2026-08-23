import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { RegionAssignForm } from "@/components/admin/RegionAssignForm";
import { listWordRegions } from "@/app/admin/regiones/actions";

export const metadata: Metadata = { title: "Regiones — Berretín", robots: { index: false, follow: false } };
// Depende de la sesión en cada visita, igual que /admin/aportes y /admin/desafio.
export const dynamic = "force-dynamic";

export default async function AdminRegionesPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const result = await listWordRegions();

  return (
    <div className="wrap admin-wrap">
      <header className="admin-header">
        <div>
          <p className="word-letter">Berretín</p>
          <h1 className="admin-title">Regiones por palabra</h1>
        </div>
        <p className="admin-session">{admin.email}</p>
      </header>
      <AdminNav />
      <RegionAssignForm initial={result.ok ? result.rows : []} initialError={result.ok ? null : result.error} />
    </div>
  );
}
