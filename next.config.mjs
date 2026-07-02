/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Fotos del catálogo servidas desde Supabase Storage. Al pasar por
    // next/image, Vercel las redimensiona (WebP ~100 KB en vez de 2-8 MB),
    // las cachea en su CDN y el consumo de descarga de Supabase se desploma.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
