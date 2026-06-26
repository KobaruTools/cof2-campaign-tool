import type { MetadataRoute } from 'next';

// App privée (table de jeu) : accessible publiquement mais jamais indexée.
// On interdit tout crawl à l'ensemble des robots.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
