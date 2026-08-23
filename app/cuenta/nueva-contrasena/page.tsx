import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-user";
import { NewPasswordForm } from "@/components/NewPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña — Berretín", robots: { index: false, follow: false } };
// Depende de la cookie de sesión temporal que deja /auth/callback.
export const dynamic = "force-dynamic";

export default async function NuevaContrasenaPage() {
  const user = await getCurrentUser();

  return (
    <div className="wrap admin-login-wrap">
      <p className="word-letter">Berretín</p>
      <h1 className="admin-login-title">Nueva contraseña</h1>
      {user ? <NewPasswordForm /> : <p className="admin-login-note">El enlace no es válido o ya expiró. Pedí uno nuevo desde /cuenta.</p>}
    </div>
  );
}
