"use client";

import { useState } from "react";
import { createSupabaseBrowserClient, createSupabaseOtpClient } from "@/lib/supabase/browser";
import { establishSession } from "@/app/auth/callback/actions";

type Mode = "login" | "signup" | "reset";
type Status = "idle" | "pending" | "error" | "signup-sent" | "reset-sent";

export function AuthForm({ redirectTo }: { redirectTo: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const switchMode = (next: Mode) => {
    setMode(next);
    setStatus("idle");
    setError("");
    setPassword("");
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("pending");
    setError("");

    // Login directo (sin link por mail): no depende de PKCE, así que el
    // cliente con cookies alcanza y deja la sesión lista de una.
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      setError("El inicio de sesión no está disponible en este momento.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setStatus("error");
      setError("Email o contraseña incorrectos.");
      return;
    }

    window.location.replace(redirectTo);
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("pending");
    setError("");

    if (password.length < 6) {
      setStatus("error");
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }

    const supabase = createSupabaseOtpClient();
    if (!supabase) {
      setStatus("error");
      setError("La creación de cuentas no está disponible en este momento.");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    });

    if (signUpError) {
      setStatus("error");
      setError(signUpError.message.toLowerCase().includes("registered") ? "Ese email ya tiene una cuenta." : "No pudimos crear la cuenta. Intentá de nuevo.");
      return;
    }

    if (data.session) {
      const result = await establishSession(data.session.access_token, data.session.refresh_token);
      if (result.ok) {
        window.location.replace(redirectTo);
        return;
      }
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("signup-sent");
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("pending");
    setError("");

    const supabase = createSupabaseOtpClient();
    if (!supabase) {
      setStatus("error");
      setError("La recuperación no está disponible en este momento.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    });

    if (resetError) {
      setStatus("error");
      setError("No pudimos enviar el enlace. Verificá el email.");
      return;
    }

    setStatus("reset-sent");
  };

  if (status === "signup-sent") {
    return <p className="admin-login-note">Te enviamos un enlace de confirmación a {email}. Revisá tu bandeja de entrada para activar tu cuenta.</p>;
  }

  if (status === "reset-sent") {
    return <p className="admin-login-note">Te enviamos un enlace para elegir una nueva contraseña a {email}. Revisá tu bandeja de entrada.</p>;
  }

  if (mode === "reset") {
    return (
      <form className="admin-login-form" onSubmit={handleReset}>
        <div className="contribute-field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vos@ejemplo.com" />
        </div>
        {status === "error" && error && <p className="contribute-error">{error}</p>}
        <button type="submit" className="share-btn" disabled={status === "pending"}>
          {status === "pending" ? "enviando..." : "enviar enlace de recuperación"}
        </button>
        <div className="auth-form-links">
          <button type="button" className="clear-filters-btn" onClick={() => switchMode("login")}>
            volver a iniciar sesión
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="admin-login-form" onSubmit={mode === "signup" ? handleSignup : handleLogin}>
      <div className="contribute-field">
        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vos@ejemplo.com" />
      </div>
      <div className="contribute-field">
        <label htmlFor="auth-password">Contraseña</label>
        <input
          id="auth-password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {status === "error" && error && <p className="contribute-error">{error}</p>}
      <button type="submit" className="share-btn" disabled={status === "pending"}>
        {status === "pending" ? (mode === "signup" ? "creando..." : "ingresando...") : mode === "signup" ? "crear cuenta" : "ingresar"}
      </button>
      <div className="auth-form-links">
        {mode === "login" ? (
          <>
            <button type="button" className="clear-filters-btn" onClick={() => switchMode("reset")}>
              olvidé mi contraseña
            </button>
            <button type="button" className="clear-filters-btn" onClick={() => switchMode("signup")}>
              crear una cuenta
            </button>
          </>
        ) : (
          <button type="button" className="clear-filters-btn" onClick={() => switchMode("login")}>
            ya tengo cuenta
          </button>
        )}
      </div>
    </form>
  );
}
