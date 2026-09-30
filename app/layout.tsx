import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaSetup from '@/components/PwaSetup';

export const metadata: Metadata = {
  title: 'LabBridge — Interactive Virtual Science Laboratory',
  description: 'A 3D virtual science laboratory simulator featuring interactive compound microscopy, chemistry titration, DC circuits, and analytical apparatus.',
  applicationName: 'LabBridge',
  appleWebApp: { capable: true, title: 'LabBridge', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'LabBridge — Interactive Virtual Science Laboratory',
    description: 'Experience practical science anywhere with interactive 3D lab simulations.',
    type: 'website',
  },
};

// Game-style viewport on phones: edge to edge, no accidental pinch-zoom while using the controls
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f766e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased overflow-x-hidden" suppressHydrationWarning>
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
