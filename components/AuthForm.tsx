"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (signInError) {
      setStatus("error");
      setError("No pudimos enviar el enlace. Verificá el email e intentá de nuevo.");
      return;
    }

    setStatus("sent");
  };

  if (status === "sent") {
    return <p className="admin-login-note">Te enviamos un enlace de ingreso a {email}. Revisá tu bandeja de entrada para continuar.</p>;
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <div className="contribute-field">
        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vos@ejemplo.com" />
      </div>
      {error && <p className="contribute-error">{error}</p>}
      <button type="submit" className="share-btn" disabled={status === "sending"}>
        {status === "sending" ? "enviando..." : "enviar enlace de ingreso"}
      </button>
    </form>
  );
}
