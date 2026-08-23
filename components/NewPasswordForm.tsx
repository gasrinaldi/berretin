"use client";

import { useState } from "react";
import { updatePassword } from "@/app/cuenta/nueva-contrasena/actions";

export function NewPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    const result = await updatePassword(password);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.location.replace("/cuenta");
  };

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <div className="contribute-field">
        <label htmlFor="new-password">Nueva contraseña</label>
        <input id="new-password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <div className="contribute-field">
        <label htmlFor="confirm-password">Repetí la contraseña</label>
        <input id="confirm-password" type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      </div>
      {error && <p className="contribute-error">{error}</p>}
      <button type="submit" className="share-btn" disabled={pending}>
        {pending ? "guardando..." : "guardar nueva contraseña"}
      </button>
    </form>
  );
}
