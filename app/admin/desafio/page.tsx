import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { listChallenges } from "@/app/admin/desafio/actions";
import { ChallengeForm } from "@/components/admin/ChallengeForm";

export const metadata: Metadata = { title: "Desafío mensual — Berretín", robots: { index: false, follow: false } };
// Depende de la sesión en cada visita, igual que /admin/aportes.
export const dynamic = "force-dynamic";

export default async function AdminChallengePage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const result = await listChallenges();

  return (
    <div className="wrap admin-wrap">
      <header className="admin-header">
        <div>
          <p className="word-letter">Berretín</p>
          <h1 className="admin-title">Desafío mensual</h1>
        </div>
        <p className="admin-session">{admin.email}</p>
      </header>
      {result.ok ? <ChallengeForm initialChallenges={result.rows} /> : <p className="contribute-error contribute-error-general">{result.error}</p>}
    </div>
  );
}
