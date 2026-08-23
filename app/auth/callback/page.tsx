"use client";

import { useEffect, useState } from "react";
import { establishSession } from "@/app/auth/callback/actions";

// Destino de los links por mail de /cuenta (confirmación de cuenta nueva y
// recuperación de contraseña), ambos con flujo implícito: el token viaja
// en el hash de la URL (#access_token=...), que ningún servidor puede leer
// — por eso esta página es cliente y no un route handler. Lee el hash,
// crea la sesión server-side vía establishSession() y hace un reload
// completo. Un link de recuperación (type=recovery) va siempre a
// /cuenta/nueva-contrasena; cualquier otro caso (confirmación de cuenta) va
// a "next".
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
      const isRecovery = hashParams.get("type") === "recovery";

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
          window.location.replace(isRecovery ? "/cuenta/nueva-contrasena" : safeNext);
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
