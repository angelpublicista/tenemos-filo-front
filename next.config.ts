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
      // Legacy: assets que aun viven en Sanity
      { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/**' },
      // S3 (cualquier bucket de cualquier region) y CloudFront
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
};

export default withFlowbiteReact(nextConfig);