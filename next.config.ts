import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  // Salida autocontenida: el build produce un servidor con solo las
  // dependencias que de verdad usa, en vez de necesitar los ~500 MB de
  // node_modules en la maquina destino. La instancia de produccion tiene
  // menos de 1 GB de RAM y 6 GB de disco: se compila en CI y alli solo
  // aterriza este paquete.
  output: 'standalone',

  turbopack: {
    root: __dirname,
  },
  trailingSlash: false,
  // Configuración de imágenes externas
  images: {
    remotePatterns: [
      // S3 (cualquier bucket de cualquier region) y CloudFront
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
};

export default withFlowbiteReact(nextConfig);