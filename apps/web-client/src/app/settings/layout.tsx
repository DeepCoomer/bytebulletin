import type { Metadata } from 'next';

// Unlisted owner page — keep it out of search indexes.
export const metadata: Metadata = {
  title: 'Settings — ByteBulletin',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
