import type { MetadataRoute } from 'next';

/** Installable app (PWA): opens fullscreen in landscape, like a mobile game. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LabBridge — Virtual Science Lab',
    short_name: 'LabBridge',
    description: 'Do real science practicals in a 3D lab with Dr. Curie, your lab manager.',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'landscape',
    background_color: '#020617',
    theme_color: '#0f766e',
    categories: ['education', 'science'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
