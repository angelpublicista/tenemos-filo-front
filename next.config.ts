import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  // Deshabilitar la generación estática para todas las páginas
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  trailingSlash: false,
  // Configuración de imágenes externas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
};

export default withFlowbiteReact(nextConfig);