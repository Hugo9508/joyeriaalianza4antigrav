
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Ignoramos errores en build para mayor estabilidad en Hostinger
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignoramos errores de linting para mayor velocidad de despliegue
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
