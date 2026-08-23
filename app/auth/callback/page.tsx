"use client";

import { useEffect, useState } from "react";
import { establishSession } from "@/app/auth/callback/actions";

// Destino del magic link de /cuenta (flujo implícito): el token viaja en
// el hash de la URL (#access_token=...), que ningún servidor puede leer
// — por eso esta página es cliente y no un route handler. Lee el hash,
// crea la sesión server-side vía establishSession() y hace un reload
// completo a "next" para que esa página ya vea las cookies recién puestas.
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = () => {
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/cuenta";

      const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(rawHash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description");

      if (hashError) {
        setError("El enlace no es válido o ya expiró. Pedí uno nuevo.");
        return;
      }

      if (!accessToken || !refreshToken) {
        window.location.replace(safeNext);
        return;
      }

      establishSession(accessToken, refreshToken).then((result) => {
        if (result.ok) {
          window.location.replace(safeNext);
        } else {
          setError(result.error);
        }
      });
    };
    run();
  }, []);

  return (
    <div className="wrap admin-login-wrap">
      <p className="word-letter">Berretín</p>
      <h1 className="admin-login-title">Ingresando...</h1>
      {error ? <p className="contribute-error">{error}</p> : <p className="admin-login-note">Confirmando tu sesión, un momento.</p>}
    </div>
  );
}
