import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Ingreso — Berretín", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.ADMIN_EMAIL);

  return (
    <div className="wrap admin-login-wrap">
      <p className="word-letter">Berretín</p>
      <h1 className="admin-login-title">Panel de moderación</h1>
      {configured ? <LoginForm /> : <p className="contribute-error contribute-error-general">El panel de moderación no está configurado todavía.</p>}
    </div>
  );
}
