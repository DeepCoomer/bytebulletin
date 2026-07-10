import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ByteBulletin',
  description: 'Personalized high-signal engineering news, distilled daily.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'ByteBulletin',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0c0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
