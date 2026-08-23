import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No hay razón para anunciar el framework en cada response de cara al
  // lanzamiento público.
  poweredByHeader: false,
};

export default nextConfig;
