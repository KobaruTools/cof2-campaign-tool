import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App privée (table de jeu) : publique mais non référencée. En-tête le plus
  // robuste (couvre toutes les réponses, pas seulement le HTML).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
