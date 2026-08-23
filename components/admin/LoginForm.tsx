"use client";

import { useActionState, useEffect } from "react";
import { adminSignIn } from "@/app/admin/login/actions";
import { initialAdminSignInState } from "@/lib/admin-login-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(adminSignIn, initialAdminSignInState);

  useEffect(() => {
    if (state.status === "success") {
      // Reload completo: la sesión recién se guardó en cookies vía la
      // server action, y /admin/aportes la lee en un Server Component.
      window.location.replace("/admin/aportes");
    }
  }, [state.status]);

  return (
    <form className="admin-login-form" action={formAction}>
      <div className="contribute-field">
        <label htmlFor="admin-password">Contraseña</label>
        <input id="admin-password" name="password" type="password" required autoFocus autoComplete="current-password" />
      </div>
      {state.status === "error" && state.error && <p className="contribute-error">{state.error}</p>}
      <button type="submit" className="share-btn" disabled={pending}>
        {pending ? "ingresando..." : "ingresar"}
      </button>
    </form>
  );
}
