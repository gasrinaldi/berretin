import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-user";
import { getMyProfile, getMyContributions } from "@/app/cuenta/actions";
import { AuthForm } from "@/components/AuthForm";
import { AccountDashboard } from "@/components/AccountDashboard";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Mi cuenta — Berretín", robots: { index: false, follow: false } };
// Depende de la cookie de sesión en cada visita — igual que /admin/aportes,
// nunca puede quedar prerenderizada como estática.
export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="wrap admin-login-wrap">
        <nav className="word-nav">
          <Link href="/" className="back-btn">
            ← volver al diccionario
          </Link>
        </nav>
        <p className="word-letter">Berretín</p>
        <h1 className="admin-login-title">Mi cuenta</h1>
        <AuthForm redirectTo="/cuenta" />
      </div>
    );
  }

  const [profileResult, contributionsResult] = await Promise.all([getMyProfile(), getMyContributions()]);

  return (
    <>
      <div className="wrap admin-wrap">
        <nav className="word-nav">
          <Link href="/" className="back-btn">
            ← volver al diccionario
          </Link>
        </nav>
        <header className="admin-header">
          <div>
            <p className="word-letter">Berretín</p>
            <h1 className="admin-title">Mi cuenta</h1>
          </div>
        </header>
        {!profileResult.ok || !contributionsResult.ok ? (
          <p className="contribute-error contribute-error-general">{!profileResult.ok ? profileResult.error : !contributionsResult.ok ? contributionsResult.error : ""}</p>
        ) : (
          <AccountDashboard email={user.email} profile={profileResult.profile} contributions={contributionsResult.rows} />
        )}
      </div>
      <Footer />
    </>
  );
}
