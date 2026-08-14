import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LabBridge — Interactive Virtual Science Laboratory',
  description: 'A 3D virtual science laboratory simulator featuring interactive compound microscopy, chemistry titration, DC circuits, and analytical apparatus.',
  openGraph: {
    title: 'LabBridge — Interactive Virtual Science Laboratory',
    description: 'Experience practical science anywhere with interactive 3D lab simulations.',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased overflow-x-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
