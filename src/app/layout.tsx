import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Vardhman KBC | Mahaveer Dham Dewas Real-Time Quiz Championship',
  description: 'Vardhman KBC - Production-quality real-time quiz championship with millisecond-precision buzzer tracking, fastest finger first option locking, dynamic rounds, and live leaderboards.',
  keywords: ['Vardhman KBC', 'Mahaveer Dham Dewas', 'KBC Quiz', 'Real-time Buzzer', 'Fastest Finger', 'Host Dashboard', 'Next.js', 'WebSocket'],
  icons: {
    icon: '/logo.png',
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon-120x120.png', sizes: '120x120' },
      { url: '/apple-touch-icon-180x180.png', sizes: '180x180' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} dark h-full`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#07090e] text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
