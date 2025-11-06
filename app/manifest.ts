import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WebDrop - Secure P2P File Transfer',
    short_name: 'WebDrop',
    description: 'Fast, secure file sharing through direct peer-to-peer connections. No servers, no limits, just direct transfers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#6366F1',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
