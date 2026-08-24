
import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  typescript: {
    // `npx tsc --noEmit` da 0 errores (verificado 2026-08-17) — este flag no
    // estaba tapando nada hoy, solo garantizaba que el próximo error de tipos
    // llegara a producción sin avisar. Ver docs/2026-08-17_16_plan-de-ejecucion.md F2.7.
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint recién se instaló (no estaba ni en devDependencies). Se deja en
    // true una corrida más hasta limpiar el primer barrido de hallazgos —
    // pasar a false en cuanto ese barrido esté limpio.
    ignoreDuringBuilds: true,
  },
  images: {
    // Necesario para hosting compartido donde el procesamiento de imágenes de Next.js puede fallar
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'joyeriabd.a380.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
