import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'EnergyCompass — Slimme energiekeuzes',
  description: 'Profielgestuurde energie-advies app voor Nederlandse huishoudens',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
