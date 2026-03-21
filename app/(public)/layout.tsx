import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal de Empleo · KultuRH',
  description: 'Descubre las mejores oportunidades laborales publicadas por empresas en KultuRH.',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
