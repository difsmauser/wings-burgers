import type { Metadata, Viewport } from 'next';
import { PWAProvider } from '@/shared/components/PWAProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wings & Burgers',
  description: 'Sistema de gesti\u00f3n para Wings & Burgers',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'W&B',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#EA580C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
