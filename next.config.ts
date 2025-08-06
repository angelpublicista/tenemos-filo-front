import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  // Configuración para evitar prerenderización estática
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  // Deshabilitar la generación estática para todas las páginas
  output: 'standalone',
  trailingSlash: false,
};

export default withFlowbiteReact(nextConfig);